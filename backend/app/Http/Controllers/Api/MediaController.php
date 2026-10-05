<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MediaController extends Controller
{
    public function uploadArticleImage(Request $request)
    {
        $validated = $request->validate(['image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120']]);
        $disk = config('filesystems.media', 'public');
        $path = $validated['image']->storePublicly('articles/'.$request->user()->id, $disk);

        return response()->json([
            'message' => 'Gambar artikel berhasil diunggah.',
            'path' => $path,
            'url' => Storage::disk($disk)->url($path),
        ], 201);
    }
}
