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
        $users = User::with(['clubMemberships.club:id,name', 'clubMemberships.positions.position:id,title,is_executive'])
            ->latest()
            ->get();

        return response()->json($users);
    }

    public function show(User $user): JsonResponse
    {
        $user->load(['clubMemberships.club:id,name', 'clubMemberships.positions.position:id,title,is_executive']);
        return response()->json($user);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name'       => ['sometimes', 'string', 'max:255'],
            'department' => ['sometimes', 'string', 'max:255'],
            'session'    => ['sometimes', 'nullable', 'integer', 'min:0', 'max:99'],
            'phone'      => ['sometimes', 'nullable', 'string', 'max:20'],
            'is_admin'   => ['sometimes', 'boolean'],
        ]);

        $oldIsAdmin = $user->is_admin;

        $user->update($validated);

        if (array_key_exists('is_admin', $validated) && $validated['is_admin'] !== $oldIsAdmin) {
            $action = $user->is_admin ? 'admin.role_promoted' : 'admin.role_demoted';
            AuditService::log($action, $user, [
                'target_user_id' => $user->id,
                'target_user'    => $user->name,
                'is_admin'       => $user->is_admin,
            ]);
        } else {
            AuditService::log('admin.user_updated', $user, [
                'target_user_id' => $user->id,
                'target_user'    => $user->name,
                'updated_fields' => array_keys($validated),
            ]);
        }

        $user->load(['clubMemberships.club:id,name', 'clubMemberships.positions.position:id,title,is_executive']);

        return response()->json($user);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $user->tokens()->delete();

        AuditService::log('admin.user_deactivated', $user, [
            'deactivated_by' => $request->user()->id,
            'user_name'      => $user->name,
            'user_email'     => $user->email,
        ]);

        $user->delete();

        return response()->json(['message' => 'User deactivated successfully.']);
    }
}