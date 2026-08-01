<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::all();
        return response()->json($users);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json($user);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name'       => ['sometimes', 'string', 'max:255'],
            'department' => ['sometimes', 'string', 'max:255'],
            'phone'      => ['sometimes', 'nullable', 'string', 'max:20'],
            'is_admin'   => ['sometimes', 'boolean'],
        ]);

        $user->update($validated);

        return response()->json($user);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $user->tokens()->delete();

        AuditService::log('admin.user_deactivated', $user, [
            'deactivated_by' => $request->user()->id,
        ]);

        $user->delete();

        return response()->json(['message' => 'User deactivated successfully.']);
    }
}