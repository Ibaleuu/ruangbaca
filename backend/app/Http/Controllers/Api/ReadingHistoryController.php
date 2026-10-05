<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ReadingHistoryController extends Controller
{
    public function index(Request $request)
    {
        return response()->json($request->user()->readingHistories()
            ->with(['post.category', 'post.user.authorProfile', 'post.tags'])
            ->whereHas('post', fn ($query) => $query->where('status', 'published')->where('review_status', 'approved'))
            ->orderByDesc('last_read_at')->paginate(12));
    }

    public function clear(Request $request)
    {
        $request->user()->readingHistories()->delete();
        return response()->json(['message' => 'Riwayat bacaan berhasil dihapus.']);
    }
}
