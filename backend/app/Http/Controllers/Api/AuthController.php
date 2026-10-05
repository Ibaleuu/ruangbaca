<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Turnstile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request, Turnstile $turnstile)
    {
        $turnstile->verify($request);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'role' => 'reader',
        ]);
        $user->markEmailAsVerified();
        $token = $user->createToken('blogger-app')->plainTextToken;
        $user->makeVisible('email');

        return response()->json([
            'message' => 'Akun berhasil dibuat. Selamat datang di RuangBaca.',
            'user' => $user,
            'token' => $token,
            'email_verified' => true,
        ], 201);
    }

    public function login(Request $request, Turnstile $turnstile)
    {
        $turnstile->verify($request);
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau password salah.'],
            ]);
        }

        $token = $user->createToken('blogger-app')->plainTextToken;
        $user->makeVisible('email');

        return response()->json([
            'message' => 'Login berhasil.',
            'user' => $user,
            'token' => $token,
            'email_verified' => $user->hasVerifiedEmail(),
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => ['required', 'email']]);
        Password::sendResetLink($request->only('email'));

        return response()->json([
            'message' => 'Jika email terdaftar, tautan untuk mengatur ulang password akan dikirim.',
        ]);
    }

    public function resetPassword(Request $request)
    {
        $credentials = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::reset($credentials, function (User $user, string $password) {
            $user->forceFill([
                'password' => $password,
                'remember_token' => Str::random(60),
            ])->save();
            $user->tokens()->delete();
        });

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json(['message' => __($status)], 422);
        }

        return response()->json(['message' => 'Password berhasil diubah. Silakan masuk kembali.']);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout berhasil.',
        ]);
    }

    public function me(Request $request)
    {
        $request->user()->makeVisible('email');

        return response()->json([
            'user' => $request->user(),
        ]);
    }
}
