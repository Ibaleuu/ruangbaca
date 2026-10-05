<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailIsVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Verifikasi alamat email sebelum menggunakan fitur ini.',
                'code' => 'email_not_verified',
            ], 403);
        }

        return $next($request);
    }
}
