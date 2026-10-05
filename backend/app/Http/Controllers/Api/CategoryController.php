<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => Category::orderBy('name')->get(),
        ]);
    }

    public function show(string $slug)
    {
        $category = Category::where('slug', $slug)->firstOrFail();

        return response()->json([
            'data' => $category,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:categories,name'],
            'description' => ['nullable', 'string'],
        ]);

        $baseSlug = Str::slug($validated['name']);
        $slug = $baseSlug;
        $counter = 1;

        while (Category::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        $category = Category::create([
            ...$validated,
            'slug' => $slug,
        ]);

        return response()->json([
            'message' => 'Kategori berhasil dibuat.',
            'data' => $category,
        ], 201);
    }

    public function update(Request $request, string $slug)
    {
        $category = Category::where('slug', $slug)->firstOrFail();

        $validated = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                'unique:categories,name,' . $category->id,
            ],
            'description' => ['sometimes', 'nullable', 'string'],
        ]);

        if (isset($validated['name']) && $validated['name'] !== $category->name) {
            $baseSlug = Str::slug($validated['name']);
            $newSlug = $baseSlug;
            $counter = 1;

            while (
                Category::where('slug', $newSlug)
                ->where('id', '!=', $category->id)
                ->exists()
            ) {
                $newSlug = $baseSlug . '-' . $counter;
                $counter++;
            }

            $category->slug = $newSlug;
        }

        $category->fill($validated);
        $category->save();

        return response()->json([
            'message' => 'Kategori berhasil diperbarui.',
            'data' => $category,
        ]);
    }

    public function destroy(string $slug)
    {
        $category = Category::where('slug', $slug)->firstOrFail();
        $category->delete();

        return response()->json([
            'message' => 'Kategori berhasil dihapus.',
        ]);
    }
}
