<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\Post;
use App\Models\PostView;
use Illuminate\Http\Request;

class WriterStatisticsController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $posts = $user->posts();
        $postIds = (clone $posts)->select('id');

        return response()->json([
            'articles' => (clone $posts)->count(),
            'published' => (clone $posts)->where('status', 'published')->where('review_status', 'approved')->count(),
            'pending' => (clone $posts)->where('review_status', 'pending')->count(),
            'views' => PostView::whereIn('post_id', $postIds)->count(),
            'comments' => Comment::whereIn('post_id', $postIds)->where('status', 'approved')->count(),
            'favorites' => Post::where('user_id', $user->id)->withCount('favorites')->get()->sum('favorites_count'),
        ]);
    }
}
