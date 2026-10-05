<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use Illuminate\Support\Facades\DB;

class ArchiveController extends Controller
{
    public function index()
    {
        $driver = DB::connection()->getDriverName();
        [$year, $month] = match ($driver) {
            'sqlite' => ["CAST(strftime('%Y', published_at) AS INTEGER)", "CAST(strftime('%m', published_at) AS INTEGER)"],
            'pgsql' => ['EXTRACT(YEAR FROM published_at)', 'EXTRACT(MONTH FROM published_at)'],
            default => ['YEAR(published_at)', 'MONTH(published_at)'],
        };

        $periods = Post::query()->where('status', 'published')->where('review_status', 'approved')
            ->selectRaw("$year as year, $month as month, COUNT(*) as count")
            ->groupByRaw("$year, $month")->orderByDesc('year')->orderByDesc('month')->get();

        return response()->json(['data' => $periods]);
    }

    public function show(int $year, int $month)
    {
        abort_if($year < 2000 || $year > now()->year + 1 || $month < 1 || $month > 12, 404);
        $posts = Post::with(['category', 'user.authorProfile', 'tags'])
            ->withCount(['favorites', 'visibleComments as comments_count'])
            ->where('status', 'published')->where('review_status', 'approved')
            ->whereYear('published_at', $year)->whereMonth('published_at', $month)
            ->latest('published_at')->paginate(12);

        return response()->json($posts);
    }
}
