<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Club;
use App\Models\ClubMember;
use App\Models\User;
use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AnnouncementController extends Controller
{
    public function index(Request $request, Club $club): JsonResponse
    {
        $user = $request->user();
        $userId = $user ? $user->id : null;

        $unpinnedAnnouncementIds = $userId ? DB::table('announcement_recipients')
            ->where('user_id', $userId)
            ->where('is_unpinned', true)
            ->pluck('announcement_id')
            ->toArray() : [];

        // Exclude generic platform-wide 'all_users' announcements from Admin
        $query = Announcement::where(function ($q) use ($club) {
            $q->where('club_id', $club->id)
              ->orWhere('target_club_id', $club->id);
        })->where('target_type', '!=', 'all_users');

        $announcements = $query->with(['author', 'club', 'targetClub', 'targetUser'])
            ->latest()
            ->get();

        // Filter based on user's authorization/role for the club
        $isMember = $user ? $user->isMemberOf($club) : false;
        $isExec   = $user ? ($user->is_admin || $user->hasClubPermission($club, 'can_manage_announcements')) : false;

        $filtered = $announcements->filter(function ($announcement) use ($user, $isMember, $isExec) {
            $targetType = $announcement->target_type;

            // Public announcements from club are visible to everyone (including guests/visitors)
            if ($targetType === 'public') {
                return true;
            }

            // Unauthenticated visitors cannot see member/exec specific announcements
            if (!$user) {
                return false;
            }

            // Creator or platform admin can see all
            if ($user->is_admin || $announcement->posted_by === $user->id) {
                return true;
            }

            if ($targetType === 'club_members') {
                return $isMember || $isExec;
            }

            if ($targetType === 'club_executives') {
                return $isExec;
            }

            if ($targetType === 'specific_club_member') {
                return $announcement->target_user_id === $user->id || $isExec;
            }

            return false;
        })->values();

        $transformed = $filtered->map(function ($announcement) use ($unpinnedAnnouncementIds) {
            $arr = $announcement->toArray();
            $isUnpinnedByMe = in_array($announcement->id, $unpinnedAnnouncementIds);
            $arr['is_pinned_for_me'] = (bool) ($announcement->is_pinned && !$isUnpinnedByMe);
            return $arr;
        })->sort(function ($a, $b) {
            if ($a['is_pinned_for_me'] !== $b['is_pinned_for_me']) {
                return $b['is_pinned_for_me'] <=> $a['is_pinned_for_me'];
            }
            $timeA = \Carbon\Carbon::parse($a['created_at'])->timestamp;
            $timeB = \Carbon\Carbon::parse($b['created_at'])->timestamp;
            return $timeB <=> $timeA; // newest timestamp first
        })->values();

        return response()->json($transformed);
    }

    public function allAnnouncements(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = $user ? $user->id : null;

        $unpinnedAnnouncementIds = $userId ? DB::table('announcement_recipients')
            ->where('user_id', $userId)
            ->where('is_unpinned', true)
            ->pluck('announcement_id')
            ->toArray() : [];

        if ($user && $user->is_admin) {
            $announcements = Announcement::where('target_type', '!=', 'public')
                ->with(['club', 'author', 'targetClub', 'targetUser'])
                ->latest()
                ->get();
        } else {
            $userClubIds = $user ? ClubMember::where('user_id', $user->id)
                ->where('status', 'active')
                ->pluck('club_id') : collect([]);

            $announcements = Announcement::where('target_type', '!=', 'public')
                ->where(function ($query) use ($user, $userClubIds) {
                    $query->where('target_type', 'all_users');
                    if ($user) {
                        $query->orWhere('posted_by', $user->id)
                            ->orWhere('target_user_id', $user->id)
                            ->orWhereHas('recipients', function ($q) use ($user) {
                                $q->where('user_id', $user->id);
                            })
                            ->orWhereIn('club_id', $userClubIds)
                            ->orWhereIn('target_club_id', $userClubIds);
                    }
                })
                ->with(['club', 'author', 'targetClub', 'targetUser'])
                ->latest()
                ->get()
                ->unique('id')
                ->values();
        }

        $transformed = $announcements->map(function ($announcement) use ($unpinnedAnnouncementIds) {
            $arr = $announcement->toArray();
            $isUnpinnedByMe = in_array($announcement->id, $unpinnedAnnouncementIds);
            $arr['is_pinned_for_me'] = (bool) ($announcement->is_pinned && !$isUnpinnedByMe);
            return $arr;
        })->sort(function ($a, $b) {
            if ($a['is_pinned_for_me'] !== $b['is_pinned_for_me']) {
                return $b['is_pinned_for_me'] <=> $a['is_pinned_for_me'];
            }
            $timeA = \Carbon\Carbon::parse($a['created_at'])->timestamp;
            $timeB = \Carbon\Carbon::parse($b['created_at'])->timestamp;
            return $timeB <=> $timeA; // newest timestamp first
        })->values();

        return response()->json($transformed);
    }

    public function creationContext(Request $request): JsonResponse
    {
        $user = $request->user();
        $execClubs = $user->getExecutiveClubs();
        $canCreate = $user->is_admin || $execClubs->count() > 0;

        // Enhance exec_clubs with user's specific role title in each club
        $enhancedExecClubs = $execClubs->map(function ($club) use ($user) {
            $member = ClubMember::where('club_id', $club->id)
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->first();

            $roleLabel = $member ? match (strtolower($member->role ?? 'member')) {
                'president'      => 'President',
                'vice_president' => 'Vice President',
                'secretary'      => 'Secretary',
                'treasurer'      => 'Treasurer',
                'executive'      => 'Executive',
                default          => 'Executive Member',
            } : 'Executive';

            return [
                'id'         => $club->id,
                'name'       => $club->name,
                'user_role'  => $roleLabel,
            ];
        });

        return response()->json([
            'is_admin'    => (bool) $user->is_admin,
            'can_create'  => $canCreate,
            'exec_clubs'  => $enhancedExecClubs,
            'all_clubs'   => $user->is_admin ? Club::where('status', 'approved')->get(['id', 'name']) : [],
            'all_users'   => $user->is_admin ? User::select('id', 'name', 'student_id', 'email')->get() : [],
        ]);
    }

    public function clubMembers(Request $request, Club $club): JsonResponse
    {
        $members = User::whereHas('clubMemberships', function ($q) use ($club) {
            $q->where('club_id', $club->id)->where('status', 'active');
        })->select('id', 'name', 'student_id', 'email')->get();

        return response()->json($members);
    }

    public function store(Request $request, ?Club $club = null): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'title'          => 'required|string|max:255',
            'body'           => 'required|string',
            'is_pinned'      => 'boolean',
            'from_identity'  => 'nullable|string', // 'admin' or 'club_{id}'
            'from_type'      => 'required_without:from_identity|string|in:admin,club',
            'from_club_id'   => 'nullable|exists:clubs,id',
            'target_type'    => 'required|string|in:all_users,specific_user,club_executives,club_members,specific_club_member,public',
            'target_club_id' => 'nullable|exists:clubs,id',
            'target_user_id' => 'nullable|exists:users,id',
            'attachment'     => 'nullable|file|max:10240', // 10MB file limit
        ]);

        if (!empty($validated['from_identity'])) {
            if ($validated['from_identity'] === 'admin') {
                $validated['from_type'] = 'admin';
                $validated['from_club_id'] = null;
            } elseif (str_starts_with($validated['from_identity'], 'club_')) {
                $validated['from_type'] = 'club';
                $validated['from_club_id'] = (int) substr($validated['from_identity'], 5);
            }
        }

        if ($club && empty($validated['from_club_id']) && isset($validated['from_type']) && $validated['from_type'] === 'club') {
            $validated['from_club_id'] = $club->id;
        }

        if ($club && empty($validated['target_club_id'])) {
            $validated['target_club_id'] = $club->id;
        }

        // Authorization and From validation
        $execClubs = $user->getExecutiveClubs();

        if ($validated['from_type'] === 'admin') {
            if (!$user->is_admin) {
                return response()->json(['message' => 'Unauthorized. Only platform administrators can send announcements from Admin.'], 403);
            }
            if (!in_array($validated['target_type'], ['all_users', 'specific_user', 'club_executives'])) {
                return response()->json(['message' => 'Invalid recipient target for Admin announcements.'], 422);
            }
            $senderType = 'admin';
            $senderRoleLabel = 'Administrator';
            $assignedClubId = null;
        } else {
            // from_type === 'club'
            if (empty($validated['from_club_id'])) {
                return response()->json(['message' => 'Source club is required when sending from a club.'], 422);
            }
            $sourceClub = Club::find($validated['from_club_id']);
            if (!$sourceClub) {
                return response()->json(['message' => 'Source club not found.'], 404);
            }

            // An admin who is NOT an executive of the source club cannot send as a club executive
            $isClubExecutive = ClubMember::where('club_id', $sourceClub->id)
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->where(function ($q) {
                    $q->whereIn('role', ['president', 'vice_president', 'secretary', 'treasurer', 'executive'])
                      ->orWhereHas('positions', function ($p) {
                          $p->where(function ($p2) {
                              $p2->whereNull('ends_at')->orWhere('ends_at', '>', now());
                          })->whereHas('position', fn ($q3) => $q3->where('can_manage_announcements', true)->orWhere('is_executive', true));
                      });
                })->exists();

            if (!$isClubExecutive) {
                return response()->json(['message' => 'Unauthorized. You are not an executive of the selected club.'], 403);
            }

            if (!in_array($validated['target_type'], ['club_members', 'specific_club_member', 'public'])) {
                return response()->json(['message' => 'Invalid recipient target for club announcements.'], 422);
            }

            $senderType = 'club';
            $assignedClubId = $sourceClub->id;
            $validated['target_club_id'] = $sourceClub->id;

            // Determine user's role in source club
            $memberRecord = ClubMember::where('club_id', $sourceClub->id)
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->first();

            $roleTitle = $memberRecord ? match (strtolower($memberRecord->role ?? 'member')) {
                'president'      => 'President',
                'vice_president' => 'Vice President',
                'secretary'      => 'Secretary',
                'treasurer'      => 'Treasurer',
                'executive'      => 'Executive',
                default          => 'Executive Member',
            } : 'Executive';

            $senderRoleLabel = "{$roleTitle} of {$sourceClub->name}";
        }

        // Additional target checks
        if ($validated['target_type'] === 'specific_user' && empty($validated['target_user_id'])) {
            return response()->json(['message' => 'Target user is required for specific user announcements.'], 422);
        }

        if ($validated['target_type'] === 'specific_club_member') {
            if (empty($validated['target_user_id'])) {
                return response()->json(['message' => 'Target member is required.'], 422);
            }
            $targetClubId = $validated['target_club_id'] ?? $assignedClubId;
            $isMember = ClubMember::where('club_id', $targetClubId)
                ->where('user_id', $validated['target_user_id'])
                ->where('status', 'active')
                ->exists();

            if (!$isMember) {
                return response()->json(['message' => 'The selected user is not an active member of this club.'], 422);
            }
        }

        if ($validated['target_type'] === 'club_executives' && empty($validated['target_club_id'])) {
            return response()->json(['message' => 'Target club is required when sending to club executives.'], 422);
        }

        // Handle attachment file upload
        $attachmentPath = null;
        $attachmentName = null;

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $attachmentName = $file->getClientOriginalName();
            $attachmentPath = $file->store('announcements/attachments', 'public');
        }

        $announcement = Announcement::create([
            'club_id'           => $assignedClubId,
            'title'             => $validated['title'],
            'body'              => $validated['body'],
            'posted_by'         => $user->id,
            'is_pinned'         => $validated['is_pinned'] ?? false,
            'target_type'       => $validated['target_type'],
            'target_club_id'    => $validated['target_club_id'] ?? $assignedClubId,
            'target_user_id'    => $validated['target_user_id'] ?? null,
            'attachment_path'   => $attachmentPath,
            'attachment_name'   => $attachmentName,
            'sender_type'       => $senderType,
            'sender_role_label' => $senderRoleLabel,
        ]);

        // Resolve recipient user IDs
        $recipientUserIds = [];

        switch ($validated['target_type']) {
            case 'all_users':
            case 'public':
                $recipientUserIds = User::pluck('id')->toArray();
                break;
            case 'specific_user':
            case 'specific_club_member':
                $recipientUserIds = [$validated['target_user_id']];
                break;
            case 'club_members':
                $targetClubId = $validated['target_club_id'] ?? $assignedClubId;
                $recipientUserIds = ClubMember::where('club_id', $targetClubId)
                    ->where('status', 'active')
                    ->pluck('user_id')
                    ->toArray();
                break;
            case 'club_executives':
                $targetClubId = $validated['target_club_id'];
                $recipientUserIds = ClubMember::where('club_id', $targetClubId)
                    ->where('status', 'active')
                    ->where(function ($q) {
                        $q->whereIn('role', ['president', 'vice_president', 'secretary', 'treasurer', 'executive'])
                          ->orWhereHas('positions', function ($p) {
                              $p->where(function ($p2) {
                                  $p2->whereNull('ends_at')->orWhere('ends_at', '>', now());
                              })->whereHas('position', fn ($q3) => $q3->where('can_manage_announcements', true));
                          });
                    })
                    ->pluck('user_id')
                    ->toArray();
                break;
        }

        $recipientUserIds = array_unique($recipientUserIds);
        $announcement->recipients()->syncWithoutDetaching($recipientUserIds);

        // Notify recipients
        foreach ($recipientUserIds as $recipientId) {
            NotificationService::notifyUser(
                $recipientId,
                'announcement_posted',
                'New Announcement',
                "New announcement from {$senderRoleLabel}: '{$announcement->title}'",
                Announcement::class,
                $announcement->id
            );
        }

        return response()->json($announcement->load(['club', 'author', 'targetClub', 'targetUser']), 201);
    }

    public function show(Announcement $announcement): JsonResponse
    {
        return response()->json($announcement->load(['club', 'author', 'targetClub', 'targetUser']));
    }

    public function update(Request $request, Announcement $announcement): JsonResponse
    {
        $this->authorize('update', $announcement);

        $validated = $request->validate([
            'title'     => 'sometimes|string|max:255',
            'body'      => 'sometimes|string',
            'is_pinned' => 'sometimes|boolean',
        ]);

        $announcement->update($validated);

        return response()->json($announcement->load(['club', 'author', 'targetClub', 'targetUser']));
    }

    public function destroy(Request $request, Announcement $announcement): JsonResponse
    {
        $this->authorize('delete', $announcement);

        if ($request->user()->is_admin && $announcement->posted_by !== $request->user()->id) {
            NotificationService::notifyUser(
                $announcement->posted_by,
                'announcement_deleted',
                'Announcement Deleted by Admin',
                "Your announcement '{$announcement->title}' was deleted by an administrator.",
                Announcement::class,
                $announcement->id
            );
        }

        if ($announcement->attachment_path) {
            Storage::disk('public')->delete($announcement->attachment_path);
        }

        $announcement->delete();

        return response()->json(['message' => 'Announcement deleted successfully.']);
    }

    public function unpin(Request $request, Announcement $announcement): JsonResponse
    {
        $user = $request->user();

        DB::table('announcement_recipients')->updateOrInsert(
            [
                'announcement_id' => $announcement->id,
                'user_id'         => $user->id,
            ],
            [
                'is_unpinned' => true,
                'updated_at'  => now(),
            ]
        );

        return response()->json([
            'message'      => 'Announcement unpinned for you successfully.',
            'announcement' => $announcement,
        ]);
    }
}
