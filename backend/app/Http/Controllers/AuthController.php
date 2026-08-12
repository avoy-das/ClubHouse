<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\User;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create($request->validated());

        $token = $user->createToken('auth_token')->plainTextToken;

        AuditService::log('auth.register.success', $user, [
            'name'       => $user->name,
            'email'      => $user->email,
            'student_id' => $user->student_id,
            'department' => $user->department,
            'ip'         => $request->ip(),
            'user_agent' => $request->userAgent(),
            'status'     => 'success',
        ], $user->id);

        return response()->json([
            'user'  => $user,
            'token' => $token,
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->only('email', 'password');
        $email = $credentials['email'] ?? null;

        if (!Auth::attempt($credentials)) {
            return response()->json([
                'message' => 'Invalid credentials.',
            ], 401);
        }

        $user  = Auth::user();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user'  => $user,
            'token' => $token,
        ]);
    }

    public function logout(): JsonResponse
    {
        auth()->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function me(): JsonResponse
    {
        return response()->json(auth()->user());
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = auth()->user();

        $validated = $request->validate([
            'phone'      => ['nullable', 'string', 'max:20'],
            'department' => ['sometimes', 'string', 'max:255'],
            'session'    => ['nullable', 'integer', 'min:0', 'max:99'],
        ]);

        $user->update($validated);

        AuditService::log('auth.profile.updated', $user, [
            'updated_fields' => array_keys($validated),
        ], $user->id);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user'    => $user->fresh(),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $user = auth()->user();

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password'     => ['required', 'string', 'confirmed', \Illuminate\Validation\Rules\Password::min(8)->letters()->numbers()],
        ]);

        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Current password does not match.',
            ], 422);
        }

        $user->update([
            'password' => \Illuminate\Support\Facades\Hash::make($validated['new_password']),
        ]);

        $user->tokens()->delete();
        $newToken = $user->createToken('auth_token')->plainTextToken;

        AuditService::log('auth.password.changed', $user, [], $user->id);

        NotificationService::notifyUser(
            $user->id,
            'security_alert',
            'Password Changed',
            'The password for your account was changed successfully.',
            User::class,
            $user->id
        );

        return response()->json([
            'message' => 'Password updated successfully.',
            'token'   => $newToken,
        ]);
    }

    public function logoutAll(): JsonResponse
    {
        $user = auth()->user();
        $user->tokens()->delete();

        AuditService::log('auth.logout_all', $user, [
            'ip' => request()->ip(),
        ], $user->id);

        return response()->json([
            'message' => 'Logged out of all devices successfully.',
        ]);
    }

    public function myMemberships(): JsonResponse
    {
        $user = auth()->user();

        $memberships = \App\Models\ClubMember::with(['club:id,name,category,department,logo_path,status'])
            ->where('user_id', $user->id)
            ->get();

        return response()->json($memberships);
    }
}