<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Club;
use App\Models\ClubMember;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    public function index(Club $club): JsonResponse
    {
        $announcements = Announcement::where('club_id', $club->id)
            ->orWhere('target_club_id', $club->id)
            ->with(['author', 'club', 'targetClub', 'targetUser'])
            ->orderBy('is_pinned', 'desc')
            ->latest()
            ->get();

        return response()->json($announcements);
    }

    public function allAnnouncements(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->is_admin) {
            $announcements = Announcement::with(['club', 'author', 'targetClub', 'targetUser'])
                ->orderBy('is_pinned', 'desc')
                ->latest()
                ->get();
            return response()->json($announcements);
        }

        $userClubIds = ClubMember::where('user_id', $user->id)
            ->where('status', 'active')
            ->pluck('club_id');

        $announcements = Announcement::where('target_type', 'all_users')
            ->orWhere('posted_by', $user->id)
            ->orWhereHas('recipients', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            })
            ->orWhereIn('club_id', $userClubIds)
            ->orWhereIn('target_club_id', $userClubIds)
            ->with(['club', 'author', 'targetClub', 'targetUser'])
            ->orderBy('is_pinned', 'desc')
            ->latest()
            ->get()
            ->unique('id')
            ->values();

        return response()->json($announcements);
    }

    public function creationContext(Request $request): JsonResponse
    {
        $user = $request->user();
        $execClubs = $user->getExecutiveClubs();
        $canCreate = $user->is_admin || $execClubs->count() > 0;

        return response()->json([
            'is_admin'    => (bool) $user->is_admin,
            'can_create'  => $canCreate,
            'exec_clubs'  => $execClubs,
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
            'target_type'    => 'required|string|in:all_users,specific_user,club_members,club_executives,specific_club_member',
            'target_club_id' => 'nullable|exists:clubs,id',
            'target_user_id' => 'nullable|exists:users,id',
        ]);

        if ($club && empty($validated['target_club_id'])) {
            $validated['target_club_id'] = $club->id;
        }

        // Authorization check
        $execClubs = $user->getExecutiveClubs();
        if (!$user->is_admin && $execClubs->count() === 0) {
            return response()->json(['message' => 'Unauthorized. Only Administrators and Club Executives can create announcements.'], 403);
        }

        // Non-admin rules enforcement
        if (!$user->is_admin) {
            if (in_array($validated['target_type'], ['club_members', 'club_executives', 'specific_club_member'])) {
                if (empty($validated['target_club_id']) || !$execClubs->pluck('id')->contains($validated['target_club_id'])) {
                    return response()->json(['message' => 'You can only select clubs where you are an executive.'], 403);
                }
            }

            if ($validated['target_type'] === 'specific_club_member') {
                if (empty($validated['target_user_id'])) {
                    return response()->json(['message' => 'Target user is required for specific member announcements.'], 422);
                }
                $isMember = ClubMember::where('club_id', $validated['target_club_id'])
                    ->where('user_id', $validated['target_user_id'])
                    ->where('status', 'active')
                    ->exists();

                if (!$isMember) {
                    return response()->json(['message' => 'The selected user is not an active member of your club.'], 422);
                }
            }
        }

        if ($validated['target_type'] === 'specific_user' && empty($validated['target_user_id'])) {
            return response()->json(['message' => 'Target user is required.'], 422);
        }

        if (in_array($validated['target_type'], ['club_members', 'club_executives', 'specific_club_member']) && empty($validated['target_club_id'])) {
            return response()->json(['message' => 'Target club is required.'], 422);
        }

        $announcement = Announcement::create([
            'club_id'        => $validated['target_club_id'] ?? ($club ? $club->id : null),
            'title'          => $validated['title'],
            'body'           => $validated['body'],
            'posted_by'      => $user->id,
            'is_pinned'      => $validated['is_pinned'] ?? false,
            'target_type'    => $validated['target_type'],
            'target_club_id' => $validated['target_club_id'] ?? null,
            'target_user_id' => $validated['target_user_id'] ?? null,
        ]);

        // Resolve recipients
        $recipientUserIds = [];

        switch ($validated['target_type']) {
            case 'all_users':
                $recipientUserIds = User::pluck('id')->toArray();
                break;
            case 'specific_user':
                $recipientUserIds = [$validated['target_user_id']];
                break;
            case 'club_members':
                $recipientUserIds = ClubMember::where('club_id', $validated['target_club_id'])
                    ->where('status', 'active')
                    ->pluck('user_id')
                    ->toArray();
                break;
            case 'club_executives':
                $recipientUserIds = ClubMember::where('club_id', $validated['target_club_id'])
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
            case 'specific_club_member':
                $recipientUserIds = [$validated['target_user_id']];
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
                "New announcement: '{$announcement->title}'",
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

        $announcement->delete();

        return response()->json(['message' => 'Announcement deleted successfully.']);
    }
}
