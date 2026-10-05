<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AccountController extends Controller
{
    public function updatePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed', 'different:current_password'],
        ]);

        if (! Hash::check($validated['current_password'], $request->user()->password)) {
            throw ValidationException::withMessages(['current_password' => ['Password saat ini tidak cocok.']]);
        }

        $request->user()->forceFill(['password' => $validated['password']])->save();
        $currentToken = $request->user()->currentAccessToken();
        if ($currentToken instanceof \Laravel\Sanctum\PersonalAccessToken) {
            $request->user()->tokens()->where('id', '!=', $currentToken->getKey())->delete();
        }

        return response()->json(['message' => 'Password berhasil diubah. Sesi di perangkat lain sudah dikeluarkan.']);
    }

    public function logoutAll(Request $request)
    {
        $request->user()->tokens()->delete();

        return response()->json(['message' => 'Semua perangkat berhasil dikeluarkan.']);
    }

    public function destroy(Request $request)
    {
        $user = $request->user();
        if ($user->role === 'admin' && User::where('role', 'admin')->count() <= 1) {
            return response()->json(['message' => 'Akun admin terakhir tidak dapat dihapus. Tetapkan admin lain terlebih dahulu.'], 422);
        }

        if ($user->authorProfile?->avatar) {
            Storage::disk(config('filesystems.media', 'public'))->delete($user->authorProfile->avatar);
        }
        $disk = Storage::disk(config('filesystems.media', 'public'));
        $disk->deleteDirectory('articles/'.$user->id);
        foreach ($user->posts()->whereNotNull('cover_image')->pluck('cover_image') as $cover) {
            if (! str_starts_with($cover, 'http') && ! str_starts_with($cover, '/')) $disk->delete($cover);
        }
        $user->notifications()->delete();
        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Akun berhasil dihapus.']);
    }
}
