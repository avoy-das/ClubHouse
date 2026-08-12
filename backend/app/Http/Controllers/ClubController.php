<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateClubRequest;
use App\Http\Requests\UpdateClubRequest;
use App\Models\Club;
use App\Models\ClubMember;
use App\Models\User;
use App\Models\AuditLog;
use App\Services\AuditService;
use App\Services\CacheInvalidationService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class ClubController extends Controller
{
    // Any authenticated user can submit a club creation request
    public function store(CreateClubRequest $request)
    {
        $logoPath = null;
        $bannerPath = null;
        $permissionDocPath = null;

        if ($request->hasFile('logo')) {
            $logoPath = $request->file('logo')->store('clubs/logos', 'public');
        }

        if ($request->hasFile('banner')) {
            $bannerPath = $request->file('banner')->store('clubs/banners', 'public');
        }

        if ($request->hasFile('permission_document')) {
            $permissionDocPath = $request->file('permission_document')->store('club_permissions', 'public');
        }

        $club = Club::create([
            'name'                => $request->name,
            'category'            => $request->category,
            'description'         => $request->description,
            'department'          => $request->department,
            'contact_email'       => $request->contact_email,
            'contact_phone'       => $request->contact_phone,
            'logo_path'           => $logoPath,
            'banner_path'         => $bannerPath,
            'permission_doc_path' => $permissionDocPath,
            'reason'              => $request->reason,
            'status'              => 'pending',
            'created_by'          => $request->user()->id,
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

        NotificationService::notifyUser(
            $request->user()->id,
            'club_creation_request_submitted',
            'Club Creation Request Submitted',
            "Your request to create the club '{$club->name}' has been submitted and is currently pending approval.",
            Club::class,
            $club->id
        );

        return response()->json([
            'message' => 'Club creation request submitted successfully.',
            'club'    => $club,
        ], 201);
    }

    // Any authenticated user can view approved clubs (or executive-scoped clubs if requested)
    public function index(Request $request): JsonResponse
    {
        if ($request->query('scope') === 'executive') {
            return response()->json($request->user()->getExecutiveClubs());
        }

        $user = $request->user();

        $query = Club::query();

        if ($user) {
            if ($user->is_admin) {
                // Admins see approved, pending, and suspended clubs on the main page (excluding rejected)
                $query->where('status', '!=', 'rejected');
            } else {
                $query->where(function ($q) use ($user) {
                    $q->where('status', 'approved')
                      ->orWhere(function ($q2) use ($user) {
                          $q2->where('created_by', $user->id)
                             ->where('status', '!=', 'rejected');
                      });
                });
            }
        } else {
            $query->where('status', 'approved');
        }

        $clubs = $query->with('creator:id,name')
            ->withCount('members')
            ->latest()
            ->get();

        return response()->json($clubs);
    }

    // Authenticated user gets list of clubs where they are an executive
    public function executiveClubs(Request $request): JsonResponse
    {
        return response()->json($request->user()->getExecutiveClubs());
    }

    // Any authenticated user can view an approved club (or admins/members/creators for pending/suspended clubs)
    public function show(Request $request, Club $club)
    {
        $user = $request->user();
        $isMemberOrExec = $user && ClubMember::where('club_id', $club->id)->where('user_id', $user->id)->exists();

        if ($club->status !== 'approved' && (!$user || (!$user->is_admin && $club->created_by !== $user->id && !$isMemberOrExec))) {
            return response()->json(['message' => 'Club not found.'], 404);
        }

        $cachedClub = Cache::remember("clubhouse:clubs:show:{$club->id}", 180, function () use ($club) {
            return $club->load('creator:id,name', 'members.user:id,name', 'members.positions.position');
        });

        return response()->json($cachedClub);
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

        CacheInvalidationService::club($club->id);

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

    // Admin only — update club details
    public function update(UpdateClubRequest $request, Club $club)
    {
        $user = $request->user();

        if (!$user->is_admin) {
            return response()->json(['message' => 'Only administrators can edit club details.'], 403);
        }

        $data = $request->validated();

        if ($request->hasFile('logo')) {
            if ($club->logo_path) {
                Storage::disk('public')->delete($club->logo_path);
            }
            $data['logo_path'] = $request->file('logo')->store('clubs/logos', 'public');
        }

        if ($request->hasFile('banner')) {
            if ($club->banner_path) {
                Storage::disk('public')->delete($club->banner_path);
            }
            $data['banner_path'] = $request->file('banner')->store('clubs/banners', 'public');
        }

        unset($data['logo'], $data['banner']);

        $dirty = array_diff_key($data, ['logo' => true, 'banner' => true]);
        $original = [];
        foreach (array_keys($dirty) as $field) {
            $original[$field] = $club->getOriginal($field);
        }

        $club->update($data);

        AuditService::log('club.updated', $club, [
            'changed'        => array_intersect_key($club->getChanges(), $dirty),
            'previous'       => $original,
            'changed_fields' => array_keys($dirty),
        ]);

        NotificationService::notifyClubMembers(
            $club->id,
            'club_updated',
            'Club Details Updated',
            "The details for club '{$club->name}' have been updated by an administrator.",
            Club::class,
            $club->id,
            $user->id
        );

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

    // Admin only — activate a suspended club
    public function activate(Club $club)
    {
        if ($club->status !== 'suspended') {
            return response()->json(['message' => 'Only suspended clubs can be activated.'], 422);
        }

        $club->update(['status' => 'approved']);

        AuditService::log('club.activated', $club, [
            'previous_status' => 'suspended',
        ]);

        NotificationService::notifyClubMembers(
            $club->id,
            'club_reactivated',
            'Club Reactivated',
            "The club '{$club->name}' has been reactivated by an administrator.",
            Club::class,
            $club->id
        );

        return response()->json([
            'message' => 'Club activated successfully.',
            'club'    => $club->fresh(),
        ]);
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

        $membersQuery = ClubMember::where(function ($q) {
                $q->where('status', 'active')->orWhereNull('status');
            })
            ->with([
                'user:id,name,student_id,email,department,phone,session',
                'club:id,name',
                'positions.position:id,title,is_executive'
            ]);

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

        // Attach joining details (recruitment application / membership request info) for executives/admins
        $isExecOrAdmin = $user && ($user->is_admin || ClubMember::where('club_id', $club->id)->where('user_id', $user->id)->whereIn('role', ['president', 'vice_president', 'secretary', 'treasurer'])->exists());

        if ($isExecOrAdmin) {
            $userIds = $members->pluck('user_id')->unique();

            // Fetch recruitment applications for this club's notices
            $recruitmentNoticeIds = \App\Models\RecruitmentNotice::where('club_id', $club->id)->pluck('id');
            $recruitmentApps = \App\Models\RecruitmentApplication::whereIn('recruitment_notice_id', $recruitmentNoticeIds)
                ->whereIn('user_id', $userIds)
                ->with('recruitmentNotice:id,title,session')
                ->latest()
                ->get()
                ->keyBy('user_id');

            // Fetch direct membership requests
            $membershipReqs = \App\Models\MembershipRequest::where('club_id', $club->id)
                ->whereIn('user_id', $userIds)
                ->latest()
                ->get()
                ->keyBy('user_id');

            $members->transform(function ($member) use ($recruitmentApps, $membershipReqs) {
                $memberArray = $member->toArray();
                $memberArray['recruitment_application'] = $recruitmentApps->get($member->user_id);
                $memberArray['membership_request'] = $membershipReqs->get($member->user_id);
                return $memberArray;
            });
        }

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
            'role' => ['required', 'string', 'in:president,vice_president,secretary,treasurer,executive,member'],
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

        // Single President slot rule: If assigning president, check if one already exists
        if ($newRole === 'president' && $membership->role !== 'president') {
            $presidentExists = ClubMember::where('club_id', $club->id)
                ->where('role', 'president')
                ->where('user_id', '!=', $user->id)
                ->exists();

            if ($presidentExists) {
                return response()->json([
                    'message' => 'A president already exists for this club. Only one president is allowed.',
                ], 422);
            }
        }

        // Orphan Executive protection: Cannot demote the last executive left in the club
        $isExecRole = in_array($membership->role, ['president', 'vice_president', 'secretary', 'treasurer', 'executive']);
        if ($isExecRole && $newRole === 'member') {
            $execCount = ClubMember::where('club_id', $club->id)
                ->whereIn('role', ['president', 'vice_president', 'secretary', 'treasurer', 'executive'])
                ->count();

            if ($execCount <= 1) {
                return response()->json([
                    'message' => 'Cannot demote the last remaining executive of the club.',
                ], 422);
            }
        }

        $oldRole = $membership->role;

        $membership->update([
            'role' => $newRole,
        ]);

        if ($newRole === 'member') {
            \App\Models\ClubMemberPosition::where('club_member_id', $membership->id)
                ->where(function ($q) {
                    $q->whereNull('ends_at')->orWhere('ends_at', '>', now());
                })
                ->update(['ends_at' => now()]);
        }

        AuditService::log('club.member_role_updated', $club, [
            'target_user_id'   => $user->id,
            'target_user_name' => $user->name,
            'previous_role'    => $oldRole,
            'new_role'         => $newRole,
            'previous'         => ['role' => $oldRole],
            'changed'          => ['role' => $newRole],
            'updated_by'       => $authUser->id,
        ]);

        if ($oldRole !== $newRole) {
            $roleLabels = [
                'president'      => 'President',
                'vice_president' => 'Vice President',
                'secretary'      => 'Secretary',
                'treasurer'      => 'Treasurer',
                'executive'      => 'Executive Member',
                'member'         => 'General Member',
            ];

            $oldRoleLabel = $roleLabels[$oldRole] ?? ucfirst(str_replace('_', ' ', $oldRole));
            $newRoleLabel = $roleLabels[$newRole] ?? ucfirst(str_replace('_', ' ', $newRole));

            NotificationService::notifyUser(
                $user->id,
                'club_role_updated',
                'Official Position Update',
                "Your official position in '{$club->name}' has been updated from {$oldRoleLabel} to {$newRoleLabel}.",
                Club::class,
                $club->id
            );
        }

        return response()->json([
            'message'    => "Member role updated to '{$newRole}'.",
            'membership' => $membership->fresh()->load('user:id,name,student_id,email,department'),
        ]);
    }

    /**
     * PUT /api/clubs/{club}/advisor
     *
     * President, Secretary, or Admin action to update club advisor info.
     */
    public function updateAdvisor(Request $request, Club $club): JsonResponse
    {
        $authUser = $request->user();

        $isPresidentOrSecretary = ClubMember::where('club_id', $club->id)
            ->where('user_id', $authUser->id)
            ->whereIn('role', ['president', 'secretary'])
            ->exists();

        if (!$authUser->is_admin && !$isPresidentOrSecretary) {
            return response()->json([
                'message' => 'Only the President, Secretary, or System Admin can manage advisor information.',
            ], 403);
        }

        if ($request->has('advisors')) {
            $request->validate([
                'advisors'                 => 'present|array',
                'advisors.*.name'          => 'required|string|max:255',
                'advisors.*.title'         => 'nullable|string|max:255',
                'advisors.*.department'    => 'nullable|string|max:255',
                'advisors.*.contact_email' => 'nullable|email|max:255',
            ]);
            $advisorData = $request->input('advisors');
        } else {
            $request->validate([
                'name'          => 'required|string|max:255',
                'title'         => 'nullable|string|max:255',
                'department'    => 'nullable|string|max:255',
                'contact_email' => 'nullable|email|max:255',
            ]);
            $advisorData = [$request->only(['name', 'title', 'department', 'contact_email'])];
        }

        $club->update(['advisor' => $advisorData]);

        AuditService::log('club.advisor_updated', $club, [
            'updated_by' => $authUser->id,
            'advisor'    => $advisorData,
        ]);

        $freshClub = $club->fresh();

        return response()->json([
            'message'  => 'Club advisor details updated successfully.',
            'advisor'  => $freshClub->advisor,
            'advisors' => $freshClub->advisors,
        ]);
    }

    /**
     * POST /api/clubs/{club}/transfer-presidency
     *
     * President or Admin action to transfer presidency to another active member.
     */
    public function transferPresidency(Request $request, Club $club): JsonResponse
    {
        $authUser = $request->user();

        $currentPresMembership = ClubMember::where('club_id', $club->id)
            ->where('role', 'president')
            ->where('status', 'active')
            ->first();

        $isCurrentPresident = $currentPresMembership && $currentPresMembership->user_id === $authUser->id;
        if (!$authUser->is_admin && !$isCurrentPresident) {
            return response()->json([
                'message' => 'Only the current President or a System Admin can transfer presidency.',
            ], 403);
        }

        $request->validate([
            'target_user_id' => 'required|exists:users,id',
            'former_role'    => 'nullable|string|in:vice_president,secretary,treasurer,member',
        ]);

        $targetUserId = (int) $request->input('target_user_id');
        $formerRole = $request->input('former_role', 'member');

        if ($currentPresMembership && $currentPresMembership->user_id === $targetUserId) {
            return response()->json([
                'message' => 'This user is already the President of the club.',
            ], 422);
        }

        $targetMembership = ClubMember::where('club_id', $club->id)
            ->where('user_id', $targetUserId)
            ->where('status', 'active')
            ->first();

        if (!$targetMembership) {
            return response()->json([
                'message' => 'The selected target user is not an active member of this club.',
            ], 404);
        }

        $roleLabels = [
            'president'      => 'President',
            'vice_president' => 'Vice President',
            'secretary'      => 'Secretary',
            'treasurer'      => 'Treasurer',
            'executive'      => 'Executive Member',
            'member'         => 'General Member',
        ];

        // 1. Reassign former president role
        if ($currentPresMembership) {
            $currentPresMembership->update(['role' => $formerRole]);
            $formerRoleLabel = $roleLabels[$formerRole] ?? 'General Member';

            NotificationService::notifyUser(
                $currentPresMembership->user_id,
                'club_role_updated',
                'Official Position Update',
                "Your official position in '{$club->name}' has been updated from President to {$formerRoleLabel}.",
                Club::class,
                $club->id
            );
        }

        // 2. Promote target member to president
        $targetOldRoleLabel = $roleLabels[$targetMembership->role] ?? 'General Member';
        $targetMembership->update(['role' => 'president']);

        AuditService::log('club.presidency_transferred', $club, [
            'transferred_by'      => $authUser->id,
            'new_president_id'    => $targetUserId,
            'former_president_id' => $currentPresMembership ? $currentPresMembership->user_id : null,
            'former_role'         => $formerRole,
        ]);

        NotificationService::notifyUser(
            $targetUserId,
            'presidency_transferred',
            'Official Position Update',
            "Your official position in '{$club->name}' has been updated from {$targetOldRoleLabel} to President.",
            Club::class,
            $club->id
        );

        return response()->json([
            'message' => 'Presidency successfully transferred.',
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

        // Orphan Executive protection: Cannot remove the last executive left in the club
        $isExecRole = in_array($membership->role, ['president', 'vice_president', 'secretary', 'treasurer', 'executive']);
        if ($isExecRole) {
            $execCount = ClubMember::where('club_id', $club->id)
                ->whereIn('role', ['president', 'vice_president', 'secretary', 'treasurer', 'executive'])
                ->count();

            if ($execCount <= 1) {
                return response()->json([
                    'message' => 'Cannot remove the last remaining executive of the club.',
                ], 422);
            }
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
     * Exec-only read-only activity feed scoped strictly to this club.
     * Excludes authentication logs and system admin overrides.
     */
    public function auditLogs(Request $request, Club $club): JsonResponse
    {
        $authUser = $request->user();

        if (!$this->canManageClub($authUser, $club)) {
            return response()->json([
                'message' => 'Only club executives or admins can view club audit logs.',
            ], 403);
        }

        $hasClubIdColumn = Schema::hasColumn('audit_logs', 'club_id');

        $query = AuditLog::with(['user:id,name,email', 'target'])
            ->where(function ($query) use ($club, $hasClubIdColumn) {
                if ($hasClubIdColumn) {
                    $query->where('club_id', $club->id)
                          ->orWhere(function ($q) use ($club) {
                              $q->where('target_type', 'Club')
                                ->where('target_id', $club->id);
                          });
                } else {
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
                }
            })
            // Exclude authentication and system admin override logs
            ->where('action', 'not like', 'auth.%')
            ->where('action', 'not like', 'admin.%');

        // Optional date range filtering for executives (read-only activity feed)
        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->input('from'));
        }
        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->input('to'));
        }

        $logs = $query->latest('id')->paginate(30);

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

        if ($club->logo_path) {
            Storage::disk('public')->delete($club->logo_path);
        }
        if ($club->banner_path) {
            Storage::disk('public')->delete($club->banner_path);
        }
        if ($club->permission_doc_path) {
            Storage::disk('public')->delete($club->permission_doc_path);
        }

        $club->delete();

        return response()->json(['message' => 'Club deleted successfully.']);
    }
}
