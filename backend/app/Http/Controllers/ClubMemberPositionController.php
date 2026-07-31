<?php

namespace App\Http\Controllers;

use App\Models\ClubMember;
use App\Models\ClubMemberPosition;
use App\Models\ClubPosition;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClubMemberPositionController extends Controller
{
    public function store(Request $request, ClubMember $member): JsonResponse
    {
        $user = $request->user();
        if (!$user->is_admin && !$user->hasClubPermission($member->club_id, 'can_manage_members')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $request->validate([
            'position_id' => 'required|exists:club_positions,id',
        ]);

        $positionId = $request->input('position_id');
        $position = ClubPosition::findOrFail($positionId);

        if ($position->club_id !== $member->club_id) {
            return response()->json(['message' => 'Position does not belong to this club.'], 422);
        }

        $memberPosition = ClubMemberPosition::create([
            'club_member_id'   => $member->id,
            'club_position_id' => $positionId,
            'assigned_at'      => now(),
        ]);

        return response()->json($memberPosition->load('position'), 201);
    }

    public function destroy(Request $request, ClubMember $member, int $position): JsonResponse
    {
        $user = $request->user();
        if (!$user->is_admin && !$user->hasClubPermission($member->club_id, 'can_manage_members')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $memberPosition = ClubMemberPosition::where('club_member_id', $member->id)
            ->where('club_position_id', $position)
            ->where(function ($q) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>', now());
            })
            ->first();

        if (!$memberPosition) {
            return response()->json(['message' => 'Active position assignment not found.'], 404);
        }

        $memberPosition->update(['ends_at' => now()]);

        return response()->json(['message' => 'Position revoked successfully.']);
    }
}
