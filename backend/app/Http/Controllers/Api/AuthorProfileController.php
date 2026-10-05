<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\Request;

class AuthorProfileController extends Controller
{
    public function show(Request $request)
    {
        $profile = $request->user()->authorProfile;
        $profile?->makeVisible('phone');
        $profile?->makeVisible(['review_note', 'reviewed_by', 'reviewed_at']);

        return response()->json([
            'data' => $profile,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'pen_name' => ['required', 'string', 'max:100'],
            'phone' => ['required', 'string', 'max:30'],
            'bio' => ['required', 'string', 'min:20', 'max:2000'],
            'avatar' => ['sometimes', 'nullable', 'image', 'max:2048'],
            'remove_avatar' => ['sometimes', 'boolean'],
        ]);

        $user = $request->user();
        $existing = $user->authorProfile;
        $alreadyApproved = $user->role === 'writer' && $existing?->status === 'approved';
        $profile = $existing ?? $user->authorProfile()->make();
        if ($request->hasFile('avatar')) {
            if ($profile->avatar) {
                Storage::disk(config('filesystems.media', 'public'))->delete($profile->avatar);
            }
            $validated['avatar'] = $request->file('avatar')->storePublicly('authors', config('filesystems.media', 'public'));
        } elseif (! empty($validated['remove_avatar']) && $profile->avatar) {
            Storage::disk(config('filesystems.media', 'public'))->delete($profile->avatar);
            $validated['avatar'] = null;
        }
        unset($validated['remove_avatar']);

        $profile->fill([
            ...$validated,
            'user_id' => $user->id,
            'status' => $alreadyApproved ? 'approved' : 'pending',
            'review_note' => null,
            'reviewed_by' => $alreadyApproved ? $existing->reviewed_by : null,
            'reviewed_at' => $alreadyApproved ? $existing->reviewed_at : null,
        ])->save();

        return response()->json([
            'message' => $alreadyApproved
                ? 'Biodata penulis berhasil diperbarui.'
                : 'Pengajuan penulis terkirim. Tunggu persetujuan admin sebelum mulai menerbitkan artikel.',
            'data' => $profile,
            'user' => $user->fresh(),
        ]);
    }
}
