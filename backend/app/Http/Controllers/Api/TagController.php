<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tag;

class TagController extends Controller
{
    public function index()
    {
        return response()->json(['data' => Tag::whereHas('posts', fn ($query) => $query->where('status', 'published')->where('review_status', 'approved'))
            ->withCount(['posts as articles_count' => fn ($query) => $query->where('status', 'published')->where('review_status', 'approved')])
            ->orderBy('name')->get()]);
    }
}
