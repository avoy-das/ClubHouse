<?php

namespace App\Http\Controllers;

use App\Models\Club;
use App\Models\ClubMember;
use App\Models\ClubPosition;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClubMemberController extends Controller
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

    public function index(Request $request, Club $club): JsonResponse
    {
        $user = $request->user();

        $isSystemAdmin = $user && $user->is_admin;
        $isClubExecutive = $user && (
            $user->is_admin ||
            $user->hasClubPermission($club, 'can_manage_members') ||
            ClubMember::where('club_id', $club->id)
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->whereHas('positions.position', fn($q) => $q->where('is_executive', true))
                ->exists()
        );

        $query = ClubMember::where('club_id', $club->id)
            ->where('status', 'active');

        if (!$isSystemAdmin && !$isClubExecutive) {
            $query->where(function ($q) use ($user) {
                $q->whereHas('positions.position', function ($pQuery) {
                    $pQuery->where('is_executive', true)
                           ->orWhere('can_manage_members', true);
                });
                if ($user) {
                    $q->orWhere('user_id', $user->id);
                }
            });
        }

        $members = $query->with(['user', 'positions' => function ($q) {
            $q->where(function ($q2) {
                $q2->whereNull('ends_at')->orWhere('ends_at', '>', now());
            })->with('position');
        }])->get();

        return response()->json($members);
    }

    public function destroy(Request $request, Club $club, ClubMember $member): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasClubPermission($club, 'can_manage_members')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if ($member->club_id !== $club->id) {
            return response()->json(['message' => 'Member does not belong to this club.'], 422);
        }

        if ($member->user_id === $user->id && !$user->is_admin) {
            return response()->json(['message' => 'You cannot remove yourself from the club.'], 403);
        }

        $callerRank = $user->getClubRank($club);
        $targetCurrentRank = $member->getHighestRank();

        if ($targetCurrentRank >= $callerRank && !$user->is_admin) {
            return response()->json(['message' => 'Only higher ranks can control members of lower ranks. You cannot remove a member with an equal or higher position rank.'], 403);
        }

        $member->update(['status' => 'removed']);

        NotificationService::notifyUser(
            $member->user_id,
            'member_removed',
            'Removed from Club',
            "You have been removed from the club '{$club->name}'.",
            Club::class,
            $club->id
        );

        NotificationService::notifyClubExecutives(
            $club->id,
            'member_removed',
            'Member Removed',
            "A member has been removed from '{$club->name}'.",
            Club::class,
            $club->id,
            $user->id
        );

        return response()->json(['message' => 'Member removed successfully.']);
    }
}
