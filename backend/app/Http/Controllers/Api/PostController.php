<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\PostView;
use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PostController extends Controller
{
    public function index(Request $request)
    {
        $query = Post::with(['category', 'user.authorProfile', 'tags'])
            ->withCount(['favorites', 'visibleComments as comments_count'])
            ->where('review_status', 'approved')
            ->where('status', 'published');

        $search = $request->query('search');

        if (is_string($search) && trim($search) !== '') {
            $search = trim($search);

            $query->where(function ($postQuery) use ($search) {
                $postQuery->where('title', 'like', "%{$search}%")
                    ->orWhere('excerpt', 'like', "%{$search}%")
                    ->orWhere('content', 'like', "%{$search}%");
            });
        }

        $categorySlug = $request->query('category');

        if (is_string($categorySlug) && $categorySlug !== '') {
            $query->whereHas('category', function ($categoryQuery) use ($categorySlug) {
                $categoryQuery->where('slug', $categorySlug);
            });
        }

        $author = $request->query('author');
        if (is_string($author) && trim($author) !== '') {
            $author = trim($author);
            $query->whereHas('user', function ($authorQuery) use ($author) {
                $authorQuery->where('name', 'like', "%{$author}%")
                    ->orWhereHas('authorProfile', fn ($profileQuery) => $profileQuery->where('pen_name', 'like', "%{$author}%"));
            });
        }

        $tagSlug = $request->query('tag');
        if (is_string($tagSlug) && $tagSlug !== '') {
            $query->whereHas('tags', fn ($tagQuery) => $tagQuery->where('slug', $tagSlug));
        }

        $perPage = (int) $request->query('per_page', 10);
        $perPage = min(max($perPage, 1), 50);

        if ($request->query('sort') === 'popular') {
            $query->orderByDesc('favorites_count')->orderByDesc('comments_count')->orderByDesc('published_at');
        } else {
            $query->latest('published_at');
        }

        return response()->json($query->paginate($perPage));
    }

    public function myPosts(Request $request)
    {
        $status = $request->query('status');
        $postsQuery = $request->user()
            ->posts()
            ->with(['category', 'tags'])
            ->when($status === 'draft', fn ($query) => $query->where('status', 'draft'))
            ->when($status === 'pending', fn ($query) => $query->where('status', 'published')->where('review_status', 'pending'))
            ->when($status === 'published', fn ($query) => $query->where('status', 'published')->where('review_status', 'approved'))
            ->when($status === 'rejected', fn ($query) => $query->where('review_status', 'rejected'))
            ->latest();
        $posts = $postsQuery->paginate(10);

        $posts->getCollection()->each(fn (Post $post) => $post->makeVisible(['review_note', 'reviewed_by', 'reviewed_at']));

        return response()->json($posts);
    }

    public function myPost(Request $request, string $slug)
    {
        $post = $request->user()
            ->posts()
            ->with(['category', 'tags'])
            ->where('slug', $slug)
            ->firstOrFail();
        $post->makeVisible(['review_note', 'reviewed_by', 'reviewed_at']);

        return response()->json([
            'data' => $post,
        ]);
    }

    public function show(Request $request, string $slug)
    {
        $post = Post::with(['category', 'user.authorProfile', 'tags'])
            ->withCount(['favorites', 'visibleComments as comments_count'])
            ->where('review_status', 'approved')
            ->where('status', 'published')
            ->where('slug', $slug)
            ->firstOrFail();

        if ($request->user()->id !== $post->user_id) {
            PostView::query()->insertOrIgnore([
                'post_id' => $post->id,
                'user_id' => $request->user()->id,
                'created_at' => now(),
            ]);
        }

        $request->user()->readingHistories()->updateOrCreate(
            ['post_id' => $post->id],
            ['last_read_at' => now()],
        );

        $post->setAttribute('is_favorited', $post->favorites()->wherePivot('user_id', $request->user()->id)->exists());
        $authorPosts = $post->user->posts()
            ->where('status', 'published')
            ->where('review_status', 'approved')
            ->where('id', '!=', $post->id)
            ->with(['category', 'tags'])
            ->withCount('favorites')
            ->latest('published_at')
            ->limit(3)
            ->get();

        return response()->json([
            'data' => $post,
            'author_posts' => $authorPosts,
        ]);
    }

    public function publicMetadata(string $slug)
    {
        $post = Post::where('review_status', 'approved')->where('status', 'published')
            ->where('slug', $slug)->firstOrFail();

        return response()->json(['data' => [
            'title' => $post->title,
            'description' => $post->meta_description ?: $post->excerpt ?: Str::limit(strip_tags($post->content), 160),
            'image' => $post->cover_image_url,
            'slug' => $post->slug,
        ]]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'excerpt' => ['nullable', 'string'],
            'meta_description' => ['nullable', 'string', 'max:300'],
            'tags' => ['nullable', 'string', 'max:600'],
            'content' => ['required', 'string'],
            'cover_image' => ['nullable', 'image', 'max:5120'],
            'status' => ['required', 'in:draft,published'],
            'category_id' => ['nullable', 'exists:categories,id'],
        ]);

        $baseSlug = Str::slug($validated['title']);
        $slug = $baseSlug;
        $counter = 1;

        while (Post::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        if ($request->hasFile('cover_image')) {
            $validated['cover_image'] = $request->file('cover_image')->storePublicly('covers', config('filesystems.media', 'public'));
        }

        $tagNames = $validated['tags'] ?? '';
        unset($validated['tags']);
        $post = $request->user()->posts()->create([
            ...$validated,
            'slug' => $slug,
            'published_at' => $validated['status'] === 'published'
                ? now()
                : null,
            'review_status' => $validated['status'] === 'published' ? 'pending' : 'approved',
            'review_note' => null,
            'reviewed_by' => null,
            'reviewed_at' => null,
        ]);
        $this->syncTags($post, $tagNames);

        return response()->json([
            'message' => 'Artikel berhasil dibuat.',
            'data' => $post->load(['category', 'tags']),
        ], 201);
    }

    public function update(Request $request, string $slug)
    {
        $post = Post::where('slug', $slug)->firstOrFail();

        abort_unless($post->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'excerpt' => ['sometimes', 'nullable', 'string'],
            'meta_description' => ['sometimes', 'nullable', 'string', 'max:300'],
            'tags' => ['sometimes', 'nullable', 'string', 'max:600'],
            'content' => ['sometimes', 'required', 'string'],
            'cover_image' => ['sometimes', 'nullable', 'image', 'max:5120'],
            'status' => ['sometimes', 'required', 'in:draft,published'],
            'category_id' => ['sometimes', 'nullable', 'exists:categories,id'],
            'remove_cover_image' => ['sometimes', 'boolean'],
        ]);

        if (isset($validated['title']) && $validated['title'] !== $post->title) {
            $baseSlug = Str::slug($validated['title']);
            $newSlug = $baseSlug;
            $counter = 1;

            while (
                Post::where('slug', $newSlug)
                ->where('id', '!=', $post->id)
                ->exists()
            ) {
                $newSlug = $baseSlug . '-' . $counter;
                $counter++;
            }

            $post->slug = $newSlug;
        }

        if (isset($validated['status'])) {
            if ($validated['status'] === 'published' && $post->published_at === null) {
                $post->published_at = now();
            } elseif ($validated['status'] === 'draft') {
                $post->published_at = null;
            }
        }

        if (($validated['status'] ?? $post->status) === 'published') {
            $post->review_status = 'pending';
            $post->review_note = null;
            $post->reviewed_by = null;
            $post->reviewed_at = null;
        } else {
            $post->review_status = 'approved';
            $post->review_note = null;
            $post->reviewed_by = null;
            $post->reviewed_at = null;
        }

        if ($request->hasFile('cover_image')) {
            $this->deleteStoredCover($post->cover_image);
            $validated['cover_image'] = $request->file('cover_image')->storePublicly('covers', config('filesystems.media', 'public'));
        } elseif (! empty($validated['remove_cover_image'])) {
            $this->deleteStoredCover($post->cover_image);
            $validated['cover_image'] = null;
        }

        unset($validated['remove_cover_image']);
        $tagNames = $validated['tags'] ?? null;
        unset($validated['tags']);
        $post->fill($validated);
        $post->save();
        if ($tagNames !== null) $this->syncTags($post, $tagNames);

        return response()->json([
            'message' => 'Artikel berhasil diperbarui.',
            'data' => $post->load(['category', 'tags']),
        ]);
    }

    public function destroy(Request $request, string $slug)
    {
        $post = Post::where('slug', $slug)->firstOrFail();

        abort_unless($post->user_id === $request->user()->id, 403);

        $this->deleteStoredCover($post->cover_image);
        $post->delete();

        return response()->json([
            'message' => 'Artikel berhasil dihapus.',
        ]);
    }

    public function favorite(Request $request, string $slug)
    {
        $post = Post::where('status', 'published')->where('review_status', 'approved')->where('slug', $slug)->firstOrFail();
        $request->user()->favoritePosts()->syncWithoutDetaching([$post->id]);

        return response()->json([
            'favorited' => true,
            'favorites_count' => $post->favorites()->count(),
        ]);
    }

    public function unfavorite(Request $request, string $slug)
    {
        $post = Post::where('status', 'published')->where('review_status', 'approved')->where('slug', $slug)->firstOrFail();
        $request->user()->favoritePosts()->detach($post->id);

        return response()->json([
            'favorited' => false,
            'favorites_count' => $post->favorites()->count(),
        ]);
    }

    public function myFavorites(Request $request)
    {
        return response()->json(
            $request->user()->favoritePosts()
                ->where('status', 'published')
                ->where('review_status', 'approved')
                ->with(['category', 'user.authorProfile', 'tags'])
                ->withCount(['favorites', 'visibleComments as comments_count'])
                ->latest('post_favorites.created_at')
                ->paginate(10)
        );
    }

    private function syncTags(Post $post, string $tagList): void
    {
        $names = collect(explode(',', $tagList))->map(fn ($name) => trim($name))
            ->filter()->map(fn ($name) => Str::limit($name, 60, ''))->unique(fn ($name) => mb_strtolower($name))->take(10);
        $ids = $names->map(function (string $name) {
            $slug = Str::slug($name);
            if ($slug === '') return null;
            $tag = Tag::firstOrCreate(['slug' => $slug], ['name' => $name]);
            return $tag->id;
        })->filter()->all();
        $post->tags()->sync($ids);
    }

    private function deleteStoredCover(?string $cover): void
    {
        if ($cover && ! str_starts_with($cover, 'http') && ! str_starts_with($cover, '/')) {
            Storage::disk(config('filesystems.media', 'public'))->delete($cover);
        }
    }
}
