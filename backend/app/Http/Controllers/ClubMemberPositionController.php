<?php

namespace App\Http\Controllers;

use App\Models\Club;
use App\Models\ClubMember;
use App\Models\ClubMemberPosition;
use App\Models\ClubPosition;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClubMemberPositionController extends Controller
{
    private function getRoleRank(?string $role): int
    {
        return match (strtolower($role ?? 'member')) {
            'president'      => 10,
            'vice_president',
            'vice president',
            'vp'             => 9,
            'secretary',
            'treasurer'      => 8,
            'executive'      => 7,
            default          => 1,
        };
    }

    private function calculatePositionRank(?ClubPosition $pos): int
    {
        if (!$pos) return 1;
        $title = strtolower($pos->title);
        if (str_contains($title, 'president') && !str_contains($title, 'vice')) {
            return 10;
        }
        if (str_contains($title, 'vice') || str_contains($title, 'vp')) {
            return 9;
        }
        if (str_contains($title, 'secretary') || str_contains($title, 'treasurer')) {
            return 8;
        }
        if ($pos->is_executive || $pos->can_manage_members) {
            return 7;
        }
        return 1;
    }

    private function getMemberHighestRank(ClubMember $member): int
    {
        $maxRank = $this->getRoleRank($member->role);

        $positions = $member->positions()
            ->where(function ($q) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>', now());
            })
            ->with('position')
            ->get();

        foreach ($positions as $p) {
            if ($p->position) {
                $rank = $this->calculatePositionRank($p->position);
                if ($rank > $maxRank) {
                    $maxRank = $rank;
                }
            }
        }

        return $maxRank;
    }

    private function syncMemberPrimaryRole(ClubMember $member): void
    {
        $highestRank = $member->getHighestRank();
        
        $role = match (true) {
            $highestRank >= 10 => 'president',
            $highestRank >= 9  => 'vice_president',
            $highestRank >= 8  => 'secretary',
            $highestRank >= 7  => 'executive',
            default            => 'member',
        };

        if ($member->role !== $role) {
            $member->update(['role' => $role]);
        }
    }

    public function store(Request $request, ClubMember $member): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasClubPermission($member->club_id, 'can_manage_members')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if ($member->user_id === $user->id && !$user->is_admin) {
            return response()->json(['message' => 'You cannot change your own position or role within your club.'], 403);
        }

        $callerRank = $user->getClubRank($member->club_id);
        $targetCurrentRank = $member->getHighestRank();

        if ($targetCurrentRank >= $callerRank && !$user->is_admin) {
            return response()->json([
                'message' => 'Only higher ranks can control ranks of lower ranks. You cannot modify the position of a member with an equal or higher rank.'
            ], 403);
        }

        $request->validate([
            'position_id' => 'required|exists:club_positions,id',
        ]);

        $positionId = $request->input('position_id');
        $position = ClubPosition::findOrFail($positionId);

        if ($position->club_id !== $member->club_id) {
            return response()->json(['message' => 'Position does not belong to this club.'], 422);
        }

        // Single occupant position validation
        $singleOccupantTitles = ['chief advisor', 'president', 'vice president', 'general secretary', 'treasurer'];
        $cleanTitle = strtolower(trim($position->title));
        if (in_array($cleanTitle, $singleOccupantTitles)) {
            $existingCount = ClubMemberPosition::where('club_position_id', $position->id)
                ->where(function ($q) {
                    $q->whereNull('ends_at')->orWhere('ends_at', '>', now());
                })
                ->where('club_member_id', '!=', $member->id)
                ->count();
            if ($existingCount > 0) {
                return response()->json([
                    'message' => "The position '{$position->title}' can only be held by 1 person. Please revoke the current holder before assigning."
                ], 422);
            }
        }

        $newPosRank = ClubMember::calculatePositionRank($position);

        if ($newPosRank >= $callerRank && !$user->is_admin) {
            return response()->json([
                'message' => 'You cannot assign or promote a member to a position rank equal to or higher than your own rank.'
            ], 403);
        }

        $memberPosition = ClubMemberPosition::create([
            'club_member_id'   => $member->id,
            'club_position_id' => $positionId,
            'assigned_at'      => now(),
        ]);

        $this->syncMemberPrimaryRole($member);

        $clubName = $member->club ? $member->club->name : 'your club';
        $titleName = $position->title ?? 'Position';

        NotificationService::notifyUser(
            $member->user_id,
            'role_changed',
            'Role Updated',
            "You have been assigned the position of '{$titleName}' in '{$clubName}'.",
            Club::class,
            $member->club_id
        );

        return response()->json($memberPosition->load('position'), 201);
    }

    public function storeByEmail(Request $request, Club $club): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasClubPermission($club->id, 'can_manage_members')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $request->validate([
            'email' => 'required|email|exists:users,email',
            'position_id' => 'required|exists:club_positions,id',
        ]);

        $targetUser = \App\Models\User::where('email', $request->email)->firstOrFail();

        $position = ClubPosition::findOrFail($request->position_id);
        if ($position->club_id !== $club->id) {
            return response()->json(['message' => 'Position does not belong to this club.'], 422);
        }

        $member = ClubMember::firstOrCreate(
            ['club_id' => $club->id, 'user_id' => $targetUser->id],
            ['role' => 'member', 'joined_at' => now(), 'status' => 'active']
        );
        if ($member->status !== 'active') {
            $member->update(['status' => 'active']);
        }

        // Single occupant position check
        $singleOccupantTitles = ['chief advisor', 'president', 'vice president', 'general secretary', 'treasurer'];
        $cleanTitle = strtolower(trim($position->title));
        if (in_array($cleanTitle, $singleOccupantTitles)) {
            $existingCount = ClubMemberPosition::where('club_position_id', $position->id)
                ->where(function ($q) {
                    $q->whereNull('ends_at')->orWhere('ends_at', '>', now());
                })
                ->where('club_member_id', '!=', $member->id)
                ->count();
            if ($existingCount > 0) {
                return response()->json([
                    'message' => "The position '{$position->title}' can only be held by 1 person."
                ], 422);
            }
        }

        $memberPosition = ClubMemberPosition::create([
            'club_member_id'   => $member->id,
            'club_position_id' => $position->id,
            'assigned_at'      => now(),
        ]);

        $this->syncMemberPrimaryRole($member);

        NotificationService::notifyUser(
            $member->user_id,
            'role_changed',
            'Role Updated',
            "You have been assigned the position of '{$position->title}' in '{$club->name}'.",
            Club::class,
            $club->id
        );

        return response()->json($memberPosition->load(['position', 'member.user']), 201);
    }

    public function destroy(Request $request, ClubMember $member, int $position): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasClubPermission($member->club_id, 'can_manage_members')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if ($member->user_id === $user->id && !$user->is_admin) {
            return response()->json(['message' => 'You cannot revoke your own position within your club.'], 403);
        }

        $callerRank = $user->getClubRank($member->club_id);
        $targetCurrentRank = $member->getHighestRank();

        if ($targetCurrentRank >= $callerRank && !$user->is_admin) {
            return response()->json([
                'message' => 'Only higher ranks can control ranks of lower ranks. You cannot revoke the position of a member with an equal or higher rank.'
            ], 403);
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

        $this->syncMemberPrimaryRole($member);

        $clubName = $member->club ? $member->club->name : 'your club';
        $posName = $memberPosition->position ? $memberPosition->position->title : 'Position';

        NotificationService::notifyUser(
            $member->user_id,
            'role_changed',
            'Role Updated',
            "Your position of '{$posName}' in '{$clubName}' has been revoked.",
            Club::class,
            $member->club_id
        );

        return response()->json(['message' => 'Position revoked successfully.']);
    }
}
