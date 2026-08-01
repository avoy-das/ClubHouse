<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\User;
use App\Services\AuditService;
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
            $user = $email ? User::where('email', strtolower($email))->first() : null;

            AuditService::log('auth.login.failed', $user, [
                'email'      => $email,
                'ip'         => $request->ip(),
                'user_agent' => $request->userAgent(),
                'status'     => 'failed',
                'reason'     => 'Invalid credentials',
            ], $user?->id);

            return response()->json([
                'message' => 'Invalid credentials.',
            ], 422);
        }

        $user  = Auth::user();
        $token = $user->createToken('auth_token')->plainTextToken;

        AuditService::log('auth.login.success', $user, [
            'email'      => $user->email,
            'ip'         => $request->ip(),
            'user_agent' => $request->userAgent(),
            'status'     => 'success',
        ], $user->id);

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
            'new_password'     => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Current password does not match.',
            ], 422);
        }

        $user->update([
            'password' => \Illuminate\Support\Facades\Hash::make($validated['new_password']),
        ]);

        AuditService::log('auth.password.changed', $user, [], $user->id);

        return response()->json([
            'message' => 'Password updated successfully.',
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