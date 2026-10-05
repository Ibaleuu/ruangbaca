<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\ArchiveController;
use App\Http\Controllers\Api\AuthorController;
use App\Http\Controllers\Api\AuthorProfileController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\ContentReportController;
use App\Http\Controllers\Api\ModerationController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\ReadingHistoryController;
use App\Http\Controllers\Api\TagController;
use App\Http\Controllers\Api\WriterStatisticsController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:3,1');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');
Route::get('/seo/posts/{slug}', [PostController::class, 'publicMetadata']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/account/password', [AccountController::class, 'updatePassword']);
    Route::post('/account/logout-all', [AccountController::class, 'logoutAll']);
    Route::delete('/account', [AccountController::class, 'destroy']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/read-all', [NotificationController::class, 'readAll']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'read']);
    Route::get('/archives', [ArchiveController::class, 'index']);
    Route::get('/archives/{year}/{month}', [ArchiveController::class, 'show']);
    Route::get('/tags', [TagController::class, 'index']);
    Route::get('/my/reading-history', [ReadingHistoryController::class, 'index']);
    Route::delete('/my/reading-history', [ReadingHistoryController::class, 'clear']);

    Route::get('/author-profile', [AuthorProfileController::class, 'show']);
    Route::post('/author-profile', [AuthorProfileController::class, 'store']);

    // Pembaca yang sudah login dan penulis bisa membaca artikel terbit.
    Route::get('/posts', [PostController::class, 'index']);
    Route::get('/posts/{slug}', [PostController::class, 'show']);
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{slug}', [CategoryController::class, 'show']);
    Route::get('/authors/{author}', [AuthorController::class, 'show']);
    Route::get('/posts/{slug}/comments', [CommentController::class, 'index']);
    Route::post('/posts/{slug}/comments', [CommentController::class, 'store'])->middleware('throttle:10,1');
    Route::post('/posts/{slug}/favorite', [PostController::class, 'favorite']);
    Route::delete('/posts/{slug}/favorite', [PostController::class, 'unfavorite']);
    Route::get('/my/favorites', [PostController::class, 'myFavorites']);
    Route::delete('/comments/{comment}', [CommentController::class, 'destroy']);
    Route::post('/posts/{slug}/reports', [ContentReportController::class, 'post'])->middleware('throttle:5,1');
    Route::post('/comments/{comment}/reports', [ContentReportController::class, 'comment'])->middleware('throttle:5,1');

    Route::middleware('role:writer')->group(function () {
        Route::get('/my/posts', [PostController::class, 'myPosts']);
        Route::get('/my/posts/{slug}', [PostController::class, 'myPost']);
        Route::get('/my/statistics', [WriterStatisticsController::class, 'index']);

        Route::post('/posts', [PostController::class, 'store'])->middleware('throttle:10,1');
        Route::post('/media/article-image', [MediaController::class, 'uploadArticleImage'])->middleware('throttle:10,1');
        Route::put('/posts/{slug}', [PostController::class, 'update']);
        Route::delete('/posts/{slug}', [PostController::class, 'destroy']);

        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{slug}', [CategoryController::class, 'update']);
        Route::delete('/categories/{slug}', [CategoryController::class, 'destroy']);
    });

    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/moderation', [ModerationController::class, 'index']);
        Route::get('/moderation/history', [ModerationController::class, 'history']);
        Route::post('/author-applications/{profile}/approve', [ModerationController::class, 'approveAuthor']);
        Route::post('/author-applications/{profile}/reject', [ModerationController::class, 'rejectAuthor']);
        Route::post('/posts/{post}/review', [ModerationController::class, 'reviewPost']);
        Route::post('/comments/{comment}/review', [ModerationController::class, 'reviewComment']);
        Route::post('/reports/{report}/resolve', [ModerationController::class, 'resolveReport']);
        Route::delete('/comments/{comment}', [ModerationController::class, 'removeComment']);
    });
});
