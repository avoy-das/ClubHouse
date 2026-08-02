<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateClubRequest;
use App\Http\Requests\UpdateClubRequest;
use App\Models\Club;
use App\Models\ClubMember;
use App\Models\User;
use App\Models\AuditLog;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ClubController extends Controller
{
    // Any authenticated user can submit a club creation request
    public function store(CreateClubRequest $request)
    {
        $logoPath = null;

        if ($request->hasFile('logo')) {
            $logoPath = $request->file('logo')->store('logos', 'public');
        }

        $club = Club::create([
            'name'          => $request->name,
            'category'      => $request->category,
            'description'   => $request->description,
            'department'    => $request->department,
            'contact_email' => $request->contact_email,
            'contact_phone' => $request->contact_phone,
            'logo_path'     => $logoPath,
            'reason'        => $request->reason,
            'status'        => 'pending',
            'created_by'    => $request->user()->id,
        ]);

        AuditService::log('club.created', $club);

        NotificationService::notifyAdmins(
            'club_creation_request',
            'New Club Creation Request',
            "A new club creation request for '{$club->name}' has been submitted.",
            Club::class,
            $club->id,
            $request->user()->id
        );

        return response()->json([
            'message' => 'Club creation request submitted successfully.',
            'club'    => $club,
        ], 201);
    }

    // Any authenticated user can view approved clubs
    public function index()
    {
        $clubs = Club::where('status', 'approved')
            ->with('creator:id,name')
            ->withCount('members')
            ->latest()
            ->get();

        return response()->json($clubs);
    }

    // Any authenticated user can view a single approved club
    public function show(Club $club)
    {
        if ($club->status !== 'approved') {
            return response()->json(['message' => 'Club not found.'], 404);
        }

        $club->load('creator:id,name', 'members.user:id,name');

        return response()->json($club);
    }

    // Admin only — view all clubs regardless of status
    public function adminIndex(Request $request)
    {
        $clubs = Club::with('creator:id,name')
            ->latest()
            ->get();

        return response()->json($clubs);
    }

    // Admin only — approve a club
    public function approve(Request $request, Club $club)
    {
        if ($club->status !== 'pending') {
            return response()->json(['message' => 'Only pending clubs can be approved.'], 422);
        }

        $club->update([
            'status'      => 'approved',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        // Founder becomes president automatically
        ClubMember::create([
            'club_id'   => $club->id,
            'user_id'   => $club->created_by,
            'role'      => 'president',
            'joined_at' => now(),
        ]);

        AuditService::log('club.approved', $club, [
            'previous_status' => 'pending',
        ]);

        NotificationService::notifyUser(
            $club->created_by,
            'club_approved',
            'Club Approved',
            "Your request to create the club '{$club->name}' has been approved by an administrator!",
            Club::class,
            $club->id
        );

        return response()->json([
            'message' => 'Club approved successfully.',
            'club'    => $club,
        ]);
    }

    // Admin only — reject a club
    public function reject(Request $request, Club $club)
    {
        $request->validate([
            'rejection_reason' => 'required|string',
        ]);

        if ($club->status !== 'pending') {
            return response()->json(['message' => 'Only pending clubs can be rejected.'], 422);
        }

        $club->update([
            'status'           => 'rejected',
            'rejection_reason' => $request->rejection_reason,
        ]);

        AuditService::log('club.rejected', $club, [
            'previous_status'  => 'pending',
            'rejection_reason' => $request->rejection_reason,
        ]);

        NotificationService::notifyUser(
            $club->created_by,
            'club_rejected',
            'Club Creation Request Rejected',
            "Your request to create the club '{$club->name}' was rejected. Reason: {$request->rejection_reason}",
            Club::class,
            $club->id
        );

        return response()->json([
            'message' => 'Club rejected.',
            'club'    => $club,
        ]);
    }

    // Admin or Club Executive — update club details
    public function update(UpdateClubRequest $request, Club $club)
    {
        $user = $request->user();

        if (!$this->canManageClub($user, $club)) {
            return response()->json(['message' => 'Only club executives or admins can edit club details.'], 403);
        }

        $data = $request->validated();

        if ($request->hasFile('logo')) {
            $data['logo_path'] = $request->file('logo')->store('logos', 'public');
        }

        unset($data['logo']);

        $club->update($data);

        AuditService::log('club.updated', $club);

        if ($user->is_admin) {
            NotificationService::notifyClubExecutives(
                $club->id,
                'club_updated',
                'Club Details Updated',
                "An admin has updated details for your club '{$club->name}'.",
                Club::class,
                $club->id,
                $user->id
            );
        }

        return response()->json([
            'message' => 'Club updated successfully.',
            'club'    => $club->fresh()->load('creator:id,name'),
        ]);
    }

    // Admin only — suspend a club
    public function suspend(Club $club)
    {
        if ($club->status !== 'approved') {
            return response()->json(['message' => 'Only approved clubs can be suspended.'], 422);
        }

        $club->update(['status' => 'suspended']);

        AuditService::log('club.suspended', $club, [
            'previous_status' => 'approved',
        ]);

        return response()->json(['message' => 'Club suspended.']);
    }

    // Authenticated user leaves a club
    public function leave(Request $request, Club $club)
    {
        $user = $request->user();

        $membership = ClubMember::where('club_id', $club->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$membership) {
            return response()->json(['message' => 'You are not a member of this club.'], 422);
        }

        if (in_array($membership->role, ['president', 'vice_president', 'secretary', 'treasurer'])) {
            return response()->json([
                'message' => 'Executives cannot leave the club without transferring their role first.',
            ], 422);
        }

        $membership->delete();

        AuditService::log('club.member_left', $club, [
            'user_id' => $user->id,
        ]);

        NotificationService::notifyClubExecutives(
            $club->id,
            'member_left',
            'Member Left Club',
            "{$user->name} has left '{$club->name}'.",
            Club::class,
            $club->id,
            $user->id
        );

        return response()->json([
            'message' => 'You have left the club successfully.',
        ]);
    }

    // Contextual search and listing for club members
    public function members(Request $request, Club $club)
    {
        $user = $request->user();
        $q = trim($request->input('q', ''));

        $membersQuery = ClubMember::where('status', 'active')
            ->with(['user:id,name,student_id,email,department', 'club:id,name']);

        if ($q !== '') {
            $escaped = '%' . addcslashes($q, '%_\\') . '%';

            $membersQuery->whereHas('user', function ($query) use ($escaped) {
                $query->where('name', 'LIKE', $escaped)
                      ->orWhere('student_id', 'LIKE', $escaped);
            });

            // Club Exec/Student searches only members of their own club
            // Admin searches all members platform-wide
            if (!$user || !$user->is_admin) {
                $membersQuery->where('club_id', $club->id);
            }
        } else {
            $membersQuery->where('club_id', $club->id);
        }

        $members = $membersQuery->get();

        return response()->json($members);
    }

    /**
     * PATCH /api/clubs/{club}/members/{user}/role
     *
     * Exec/Admin action to promote or demote a club member.
     */
    public function updateMemberRole(Request $request, Club $club, User $user): JsonResponse
    {
        $authUser = $request->user();

        if (!$this->canManageClub($authUser, $club)) {
            return response()->json([
                'message' => 'Only club executives or admins can change member roles.',
            ], 403);
        }

        $request->validate([
            'role' => ['required', 'string', 'in:president,vice_president,secretary,treasurer,member'],
        ]);

        $newRole = $request->input('role');

        $membership = ClubMember::where('club_id', $club->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$membership) {
            return response()->json([
                'message' => 'This user is not a member of the club.',
            ], 404);
        }

        if ($authUser->id === $user->id && !$authUser->is_admin) {
            return response()->json([
                'message' => 'You cannot modify your own role in the club.',
            ], 403);
        }

        $callerRank = $authUser->getClubRank($club);
        $targetCurrentRank = $membership->getHighestRank();
        $newRoleRank = ClubMember::getRoleRank($newRole);

        if ($targetCurrentRank >= $callerRank && !$authUser->is_admin) {
            return response()->json([
                'message' => 'Only higher ranks can control members of lower ranks. You cannot modify the role of a member with an equal or higher rank.',
            ], 403);
        }

        if ($newRoleRank >= $callerRank && !$authUser->is_admin) {
            return response()->json([
                'message' => 'You cannot assign or promote a member to a role rank equal to or higher than your own rank.',
            ], 403);
        }

        $oldRole = $membership->role;

        $membership->update([
            'role' => $newRole,
        ]);

        AuditService::log('club.member_role_updated', $club, [
            'target_user_id' => $user->id,
            'old_role'       => $oldRole,
            'new_role'       => $newRole,
            'updated_by'     => $authUser->id,
        ]);

        return response()->json([
            'message'    => "Member role updated to '{$newRole}'.",
            'membership' => $membership->fresh()->load('user:id,name,student_id,email,department'),
        ]);
    }

    /**
     * DELETE /api/clubs/{club}/members/{user}
     *
     * Exec/Admin action to kick/remove a member from a club.
     */
    public function removeMember(Request $request, Club $club, User $user): JsonResponse
    {
        $authUser = $request->user();

        if (!$this->canManageClub($authUser, $club)) {
            return response()->json([
                'message' => 'Only club executives or admins can remove members.',
            ], 403);
        }

        $membership = ClubMember::where('club_id', $club->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$membership) {
            return response()->json([
                'message' => 'This user is not a member of the club.',
            ], 404);
        }

        if ($authUser->id === $user->id && !$authUser->is_admin) {
            return response()->json([
                'message' => 'You cannot remove yourself from the club.',
            ], 403);
        }

        $callerRank = $authUser->getClubRank($club);
        $targetCurrentRank = $membership->getHighestRank();

        if ($targetCurrentRank >= $callerRank && !$authUser->is_admin) {
            return response()->json([
                'message' => 'Only higher ranks can control members of lower ranks. You cannot remove a member with an equal or higher rank.',
            ], 403);
        }

        // Prevent kicking president unless auth user is admin
        if ($membership->role === 'president' && !$authUser->is_admin) {
            return response()->json([
                'message' => 'Cannot remove the club president. Transfer or demote role first.',
            ], 422);
        }

        $membership->delete();

        AuditService::log('club.member_removed', $club, [
            'target_user_id' => $user->id,
            'removed_by'     => $authUser->id,
        ]);

        return response()->json([
            'message' => 'Member removed from club successfully.',
        ]);
    }

    /**
     * GET /api/clubs/{club}/audit-logs
     *
     * Exec-only read-only activity logs scoped strictly to this club.
     */
    public function auditLogs(Request $request, Club $club): JsonResponse
    {
        $authUser = $request->user();

        if (!$this->canManageClub($authUser, $club)) {
            return response()->json([
                'message' => 'Only club executives or admins can view club audit logs.',
            ], 403);
        }

        $logs = AuditLog::with('user:id,name,email')
            ->where(function ($query) use ($club) {
                $query->where(function ($q) use ($club) {
                    $q->where('target_type', 'Club')
                      ->where('target_id', $club->id);
                })
                ->orWhere(function ($q) use ($club) {
                    $q->where('target_type', 'Event')
                      ->whereIn('target_id', function ($sub) use ($club) {
                          $sub->select('id')->from('events')->where('club_id', $club->id);
                      });
                })
                ->orWhereRaw("JSON_EXTRACT(metadata, '$.club_id') = ?", [$club->id]);
            })
            ->latest('id')
            ->paginate(30);

        return response()->json($logs);
    }

    /**
     * Helper to check if user is admin or executive of club.
     */
    private function canManageClub($user, Club $club): bool
    {
        if ($user->is_admin) {
            return true;
        }

        return ClubMember::where('club_id', $club->id)
            ->where('user_id', $user->id)
            ->whereIn('role', ['president', 'vice_president', 'secretary', 'treasurer'])
            ->exists();
    }

    /**
     * DELETE /api/admin/clubs/{club}
     *
     * Admin-only hard delete of club with cascade cleanups.
     */
    public function destroyAdmin(Request $request, Club $club): JsonResponse
    {
        ClubMember::where('club_id', $club->id)->delete();

        $events = \App\Models\Event::where('club_id', $club->id)->get();
        foreach ($events as $event) {
            \App\Models\EventRegistration::where('event_id', $event->id)->delete();
            $event->delete();
        }

        \App\Models\Announcement::where('club_id', $club->id)->delete();
        \App\Models\RecruitmentNotice::where('club_id', $club->id)->delete();

        AuditService::log('admin.club_deleted', $club, [
            'deleted_by' => $request->user()->id,
            'club_name'  => $club->name,
        ]);

        $club->delete();

        return response()->json(['message' => 'Club deleted successfully.']);
    }
}
