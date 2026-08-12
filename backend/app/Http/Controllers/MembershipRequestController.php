<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMembershipRequestRequest;
use App\Models\Club;
use App\Models\MembershipRequest;
use App\Models\Notification;
use App\Services\AuditService;
use App\Services\ClubMembershipService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MembershipRequestController extends Controller
{
    public function store(StoreMembershipRequestRequest $request, Club $club): JsonResponse
    {
        $user = $request->user();

        if ($user->isMemberOf($club)) {
            return response()->json(['message' => 'You are already an active member of this club.'], 422);
        }

        $existingPending = MembershipRequest::where('club_id', $club->id)
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->exists();

        if ($existingPending) {
            return response()->json(['message' => 'You already have a pending membership request for this club.'], 422);
        }

        $membershipRequest = MembershipRequest::create([
            'club_id' => $club->id,
            'user_id' => $user->id,
            'status'  => 'pending',
            'message' => $request->validated()['message'] ?? null,
        ]);

        NotificationService::notifyClubExecutives(
            $club->id,
            'membership_request_submitted',
            'New Membership Request',
            "{$user->name} requested to join '{$club->name}'.",
            Club::class,
            $club->id,
            $user->id
        );

        AuditService::log('membership.request_submitted', $membershipRequest, [
            'applicant_name' => $user->name,
            'club_name'      => $club->name,
        ], $user->id, $club->id);

        return response()->json($membershipRequest, 201);
    }

    public function index(Request $request, Club $club): JsonResponse
    {
        $user = $request->user();
        if (!$user->is_admin && !$user->hasClubPermission($club, 'can_manage_members')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $requests = MembershipRequest::where('club_id', $club->id)
            ->with('user')
            ->latest()
            ->get();

        return response()->json($requests);
    }

    public function review(Request $request, MembershipRequest $membershipRequest, ClubMembershipService $membershipService): JsonResponse
    {
        $this->authorize('review', $membershipRequest);

        $request->validate([
            'status' => 'required|in:approved,rejected',
        ]);

        $status = $request->input('status');
        $user = $request->user();

        $membershipRequest->update([
            'status'      => $status,
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
        ]);

        if ($status === 'approved') {
            $membershipService->admitUser($membershipRequest->club, $membershipRequest->user);

            NotificationService::notifyClubExecutives(
                $membershipRequest->club_id,
                'new_member_joined',
                'New Member Joined',
                "{$membershipRequest->user->name} has joined '{$membershipRequest->club->name}'.",
                Club::class,
                $membershipRequest->club_id,
                $user->id
            );
        }

        Notification::create([
            'user_id'      => $membershipRequest->user_id,
            'type'         => 'membership_request_' . $status,
            'title'        => 'Membership Request ' . ucfirst($status),
            'message'      => "Your request to join '{$membershipRequest->club->name}' has been {$status}.",
            'related_type' => Club::class,
            'related_id'   => $membershipRequest->club_id,
        ]);

        AuditService::log('membership.request_' . $status, $membershipRequest, [
            'status'         => $status,
            'applicant_name' => $membershipRequest->user->name,
            'club_name'      => $membershipRequest->club->name,
        ], $user->id, $membershipRequest->club_id);

        return response()->json($membershipRequest->load(['user', 'reviewer']));
    }
}
