<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthorProfile;
use App\Models\Comment;
use App\Models\ContentReport;
use App\Models\Post;
use App\Models\ModerationEvent;
use Illuminate\Http\Request;
use App\Notifications\RuangBacaNotification;
use Illuminate\Database\Eloquent\Model;

class ModerationController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $applications = AuthorProfile::where('status', 'pending')
            ->with('user:id,name,email,created_at')
            ->when($search !== '', fn ($query) => $query->where(fn ($inner) => $inner->where('pen_name', 'like', "%{$search}%")
                ->orWhereHas('user', fn ($userQuery) => $userQuery->where('name', 'like', "%{$search}%"))))
            ->oldest()
            ->get();
        $applications->each(function (AuthorProfile $profile) {
            $profile->makeVisible('phone');
            $profile->user?->makeVisible('email');
        });

        return response()->json([
            'applications' => $applications,
            'posts' => Post::where('review_status', 'pending')
                ->with(['category', 'user:id,name,created_at'])
                ->when($search !== '', fn ($query) => $query->where(fn ($inner) => $inner->where('title', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($userQuery) => $userQuery->where('name', 'like', "%{$search}%"))))
                ->latest()
                ->get(),
            'comments' => Comment::where('status', 'pending')
                ->with(['post:id,title,slug', 'user:id,name,created_at'])
                ->when($search !== '', fn ($query) => $query->where(fn ($inner) => $inner->where('body', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($userQuery) => $userQuery->where('name', 'like', "%{$search}%"))))
                ->oldest()
                ->get(),
            'reports' => ContentReport::where('status', 'open')
                ->with(['reporter:id,name', 'reportable'])
                ->when($search !== '', fn ($query) => $query->where(fn ($inner) => $inner->where('reason', 'like', "%{$search}%")
                    ->orWhere('details', 'like', "%{$search}%")))
                ->latest()
                ->get(),
            'counts' => [
                'applications' => AuthorProfile::where('status', 'pending')->count(),
                'posts' => Post::where('review_status', 'pending')->count(),
                'comments' => Comment::where('status', 'pending')->count(),
                'reports' => ContentReport::where('status', 'open')->count(),
            ],
        ]);
    }

    public function history(Request $request)
    {
        $events = ModerationEvent::with('admin:id,name')
            ->when(trim((string) $request->query('search', '')) !== '', function ($query) use ($request) {
                $search = trim((string) $request->query('search'));
                $query->where(function ($inner) use ($search) {
                    $inner->where('subject_label', 'like', "%{$search}%")
                        ->orWhere('action', 'like', "%{$search}%")
                        ->orWhere('note', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->paginate(20);

        return response()->json($events);
    }

    public function approveAuthor(Request $request, AuthorProfile $profile)
    {
        $profile->forceFill([
            'status' => 'approved',
            'review_note' => null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ])->save();
        $profile->user()->update(['role' => 'writer']);
        $profile->user->notify(new RuangBacaNotification('Pengajuan penulis disetujui', 'Kamu sekarang dapat mulai menulis artikel di RuangBaca.', '/admin'));
        $this->record($request, 'author_approved', $profile, $profile->pen_name);

        return response()->json(['message' => 'Penulis disetujui.']);
    }

    public function rejectAuthor(Request $request, AuthorProfile $profile)
    {
        $validated = $request->validate(['reason' => ['required', 'string', 'min:5', 'max:1000']]);
        $profile->forceFill([
            'status' => 'rejected',
            'review_note' => $validated['reason'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ])->save();
        $profile->user()->update(['role' => 'reader']);
        $profile->user->notify(new RuangBacaNotification('Pengajuan penulis perlu diperbaiki', $validated['reason'] ?? 'Silakan periksa dan perbarui biodata pengajuanmu.', '/author/profile'));
        $this->record($request, 'author_rejected', $profile, $profile->pen_name, $validated['reason'] ?? null);

        return response()->json(['message' => 'Pengajuan penulis ditolak.']);
    }

    public function reviewPost(Request $request, Post $post)
    {
        $validated = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'reason' => ['required_if:decision,reject', 'nullable', 'string', 'min:5', 'max:1000'],
        ]);

        $approved = $validated['decision'] === 'approve';
        $post->forceFill([
            'review_status' => $approved ? 'approved' : 'rejected',
            'review_note' => $approved ? null : ($validated['reason'] ?? null),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'status' => $approved ? 'published' : 'draft',
            'published_at' => $approved ? ($post->published_at ?? now()) : null,
        ])->save();
        $post->user->notify(new RuangBacaNotification(
            $approved ? 'Artikel disetujui' : 'Artikel perlu diperbaiki',
            $approved ? 'Artikel “'.$post->title.'” telah diterbitkan.' : ($validated['reason'] ?? 'Artikel dikembalikan ke draft untuk diperbaiki.'),
            $approved ? '/posts/'.$post->slug : '/admin/posts/'.$post->slug.'/edit',
        ));
        $this->record($request, $approved ? 'post_approved' : 'post_rejected', $post, $post->title, $validated['reason'] ?? null);

        return response()->json(['message' => $approved ? 'Artikel disetujui dan diterbitkan.' : 'Artikel dikembalikan ke draft.']);
    }

    public function resolveReport(Request $request, ContentReport $report)
    {
        $validated = $request->validate(['status' => ['required', 'in:resolved,dismissed']]);
        $report->forceFill([
            'status' => $validated['status'],
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ])->save();
        $this->record($request, 'report_'.$validated['status'], $report, 'Laporan #'.$report->id);

        return response()->json(['message' => 'Laporan ditinjau.']);
    }

    public function reviewComment(Request $request, Comment $comment)
    {
        $validated = $request->validate(['decision' => ['required', 'in:approve,reject']]);
        $comment->forceFill(['status' => $validated['decision'] === 'approve' ? 'approved' : 'rejected'])->save();
        $comment->user->notify(new RuangBacaNotification(
            $validated['decision'] === 'approve' ? 'Komentarmu diterbitkan' : 'Komentarmu tidak disetujui',
            'Komentar pada artikel “'.$comment->post->title.'” telah ditinjau moderator.',
            '/posts/'.$comment->post->slug,
        ));
        $this->record($request, 'comment_review_'.$validated['decision'], $comment, 'Komentar pada '.$comment->post->title);
        $comment->reports()->where('status', 'open')->update([
            'status' => 'resolved',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return response()->json(['message' => $validated['decision'] === 'approve' ? 'Komentar disetujui.' : 'Komentar ditolak.']);
    }

    public function removeComment(Request $request, Comment $comment)
    {
        $comment->reports()->where('status', 'open')->update([
            'status' => 'resolved',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);
        $comment->delete();
        $this->record($request, 'comment_removed', $comment, 'Komentar #'.$comment->id);
        return response()->json(['message' => 'Komentar dihapus oleh moderator.']);
    }

    private function record(Request $request, string $action, Model $subject, string $label, ?string $note = null): void
    {
        ModerationEvent::create([
            'admin_id' => $request->user()->id,
            'action' => $action,
            'subject_type' => $subject::class,
            'subject_id' => $subject->getKey(),
            'subject_label' => $label,
            'note' => $note,
        ]);
    }
}
