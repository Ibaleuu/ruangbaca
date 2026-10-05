<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\Post;
use App\Services\Turnstile;
use Illuminate\Http\Request;

class ContentReportController extends Controller
{
    private const REASONS = ['spam', 'harassment', 'misinformation', 'other'];

    public function post(Request $request, string $slug)
    {
        $post = Post::where('status', 'published')->where('review_status', 'approved')->where('slug', $slug)->firstOrFail();
        abort_if($post->user_id === $request->user()->id, 422, 'Kamu tidak dapat melaporkan artikelmu sendiri.');
        return $this->create($request, $post, app(Turnstile::class));
    }

    public function comment(Request $request, Comment $comment)
    {
        abort_unless($comment->post()->where('status', 'published')->where('review_status', 'approved')->exists(), 404);
        abort_unless($comment->status === 'approved', 404);
        abort_if($comment->user_id === $request->user()->id, 422, 'Kamu tidak dapat melaporkan komentarmu sendiri.');
        return $this->create($request, $comment, app(Turnstile::class));
    }

    private function create(Request $request, Post|Comment $reportable, Turnstile $turnstile)
    {
        $turnstile->verify($request);
        $validated = $request->validate([
            'reason' => ['required', 'in:'.implode(',', self::REASONS)],
            'details' => ['nullable', 'string', 'max:2000'],
        ]);

        $reportable->reports()->firstOrCreate(
            ['reporter_id' => $request->user()->id, 'status' => 'open'],
            ['reason' => $validated['reason'], 'details' => $validated['details'] ?? null]
        );

        return response()->json(['message' => 'Laporan terkirim untuk ditinjau moderator.'], 201);
    }
}
