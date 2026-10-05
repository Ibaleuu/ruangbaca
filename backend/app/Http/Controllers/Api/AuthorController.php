<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;

class AuthorController extends Controller
{
    public function show(int $author)
    {
        $user = User::where('role', 'writer')
            ->with('authorProfile')
            ->whereHas('authorProfile')
            ->findOrFail($author);

        $posts = $user->posts()
            ->where('status', 'published')
            ->where('review_status', 'approved')
            ->with('category')
            ->withCount(['favorites', 'visibleComments as comments_count'])
            ->latest('published_at')
            ->paginate(9);

        return response()->json([
            'author' => $user,
            'posts' => $posts,
        ]);
    }
}
