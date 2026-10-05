<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        return response()->json([
            'unread_count' => $request->user()->unreadNotifications()->count(),
            'data' => $request->user()->notifications()->latest()->limit(30)->get(),
        ]);
    }

    public function readAll(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['message' => 'Notifikasi ditandai sudah dibaca.']);
    }

    public function read(Request $request, string $id)
    {
        $notification = $request->user()->notifications()->whereKey($id)->firstOrFail();
        $notification->markAsRead();

        return response()->json(['message' => 'Notifikasi ditandai sudah dibaca.']);
    }
}
