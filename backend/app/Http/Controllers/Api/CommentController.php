<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\Post;
use App\Notifications\RuangBacaNotification;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function index(string $slug)
    {
        $post = Post::where('status', 'published')->where('slug', $slug)->firstOrFail();

        return response()->json(
            $post->visibleComments()->whereNull('parent_id')->with(['user.authorProfile', 'replies.user.authorProfile'])->oldest()->paginate(30)
        );
    }

    public function store(Request $request, string $slug)
    {
        $post = Post::where('status', 'published')->where('slug', $slug)->firstOrFail();
        $validated = $request->validate([
            'body' => ['required', 'string', 'min:2', 'max:3000'],
            'parent_id' => ['nullable', 'integer', 'exists:comments,id'],
        ]);

        if (! empty($validated['parent_id'])) {
            abort_unless(Comment::where('id', $validated['parent_id'])->where('post_id', $post->id)->whereNull('parent_id')->where('status', 'approved')->exists(), 422, 'Balasan harus merujuk komentar yang sudah disetujui pada artikel ini.');
        }

        $comment = $post->comments()->create([
            'user_id' => $request->user()->id,
            'body' => trim($validated['body']),
            'parent_id' => $validated['parent_id'] ?? null,
            'status' => 'pending',
        ]);
        if ($post->user_id !== $request->user()->id) {
            $post->user->notify(new RuangBacaNotification(
                'Komentar baru menunggu pemeriksaan',
                $request->user()->name.' mengomentari artikel “'.$post->title.'”.',
                '/posts/'.$post->slug,
            ));
        }

        return response()->json([
            'message' => 'Komentar dikirim dan akan tampil setelah ditinjau moderator.',
        ], 201);
    }

    public function destroy(Request $request, Comment $comment)
    {
        abort_unless($comment->user_id === $request->user()->id, 403);
        $comment->delete();

        return response()->json(['message' => 'Komentar dihapus.']);
    }
}
