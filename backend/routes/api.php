<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ClubController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\EventController;
use App\Http\Controllers\NotificationController;

// Notifications
Route::get('/notifications', [NotificationController::class, 'index']);
Route::put('/notifications/read-all', [NotificationController::class, 'markAllRead']);
Route::put('/notifications/{id}/read', [NotificationController::class, 'markRead']);

// Public
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

// Authenticated
// Authenticated
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);

    // Clubs — any authenticated user
    Route::get('/clubs',        [ClubController::class, 'index']);
    Route::get('/clubs/{club}', [ClubController::class, 'show']);
    Route::post('/clubs',       [ClubController::class, 'store']);

    // Events — any authenticated user (visibility filtered in controller)
    Route::get('/events',                  [EventController::class, 'index']);
    Route::get('/events/{event}',          [EventController::class, 'show']);
    Route::post('/events',                 [EventController::class, 'store']);
    Route::put('/events/{event}',          [EventController::class, 'update']);
    Route::patch('/events/{event}/status', [EventController::class, 'updateStatus']);
    Route::delete('/events/{event}',       [EventController::class, 'destroy']);

    // Notifications
Route::get('/notifications', [NotificationController::class, 'index']);
Route::put('/notifications/read-all', [NotificationController::class, 'markAllRead']);
Route::put('/notifications/{id}/read', [NotificationController::class, 'markRead']);

    // Admin only
    Route::middleware('is_admin')->group(function () {

        Route::get('/users',        [UserController::class, 'index']);
        Route::get('/users/{user}', [UserController::class, 'show']);
        Route::put('/users/{user}', [UserController::class, 'update']);

        Route::get('/admin/clubs',                 [ClubController::class, 'adminIndex']);
        Route::put('/admin/clubs/{club}',          [ClubController::class, 'update']);
        Route::post('/admin/clubs/{club}/approve', [ClubController::class, 'approve']);
        Route::post('/admin/clubs/{club}/reject',  [ClubController::class, 'reject']);
        Route::post('/admin/clubs/{club}/suspend', [ClubController::class, 'suspend']);

    });
});