<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ClubController;
use Illuminate\Support\Facades\Route;

// Public
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

// Authenticated
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);

    // Clubs — any authenticated user
    Route::get('/clubs',        [ClubController::class, 'index']);
    Route::get('/clubs/{club}', [ClubController::class, 'show']);
    Route::post('/clubs',       [ClubController::class, 'store']);

    // Admin only
    Route::middleware('is_admin')->group(function () {

        // User management
        Route::get('/users',         [UserController::class, 'index']);
        Route::get('/users/{user}',  [UserController::class, 'show']);
        Route::put('/users/{user}',  [UserController::class, 'update']);

        // Club management
        Route::get('/admin/clubs',                    [ClubController::class, 'adminIndex']);
        Route::put('/admin/clubs/{club}',             [ClubController::class, 'update']);
        Route::post('/admin/clubs/{club}/approve',    [ClubController::class, 'approve']);
        Route::post('/admin/clubs/{club}/reject',     [ClubController::class, 'reject']);
        Route::post('/admin/clubs/{club}/suspend',    [ClubController::class, 'suspend']);
    });
});