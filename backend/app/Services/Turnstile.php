<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class Turnstile
{
    public function verify(Request $request): void
    {
        $secret = config('services.turnstile.secret');
        if (! $secret) {
            return; // CAPTCHA is optional in local development.
        }

        $token = $request->input('turnstile_token');
        if (! is_string($token) || $token === '') {
            throw ValidationException::withMessages(['turnstile_token' => ['Selesaikan pemeriksaan keamanan terlebih dahulu.']]);
        }

        try {
            $response = Http::asForm()->timeout(5)->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
                'secret' => $secret,
                'response' => $token,
                'remoteip' => $request->ip(),
            ]);
        } catch (\Throwable) {
            throw ValidationException::withMessages(['turnstile_token' => ['Pemeriksaan keamanan gagal dihubungi. Coba lagi.']]);
        }

        if (! $response->successful() || ! $response->json('success')) {
            throw ValidationException::withMessages(['turnstile_token' => ['Pemeriksaan keamanan tidak valid. Coba lagi.']]);
        }
    }
}
