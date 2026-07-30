<?php

namespace App\Http\Controllers;

use App\Models\Club;
use App\Models\ClubMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClubMemberController extends Controller
{
    public function index(Club $club): JsonResponse
    {
        $members = ClubMember::where('club_id', $club->id)
            ->where('status', 'active')
            ->with(['user', 'positions' => function ($q) {
                $q->where(function ($q2) {
                    $q2->whereNull('ends_at')->orWhere('ends_at', '>', now());
                })->with('position');
            }])
            ->get();

        return response()->json($members);
    }

    public function destroy(Request $request, Club $club, ClubMember $member): JsonResponse
    {
        $user = $request->user();
        if (!$user->is_admin && !$user->hasClubPermission($club, 'can_manage_members')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if ($member->club_id !== $club->id) {
            return response()->json(['message' => 'Member does not belong to this club.'], 404);
        }

        $member->update(['status' => 'removed']);

        return response()->json(['message' => 'Member removed successfully.']);
    }
}
