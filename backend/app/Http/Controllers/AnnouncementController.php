<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAnnouncementRequest;
use App\Http\Requests\UpdateAnnouncementRequest;
use App\Models\Announcement;
use App\Models\Club;
use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnnouncementController extends Controller
{
    private function filterForUser($query, $user)
    {
        $userClubIds = \App\Models\ClubMember::where('user_id', $user->id)
            ->where('status', 'active')
            ->pluck('club_id');

        $query->where(function($q) use ($user, $userClubIds) {
            // 1. all_users
            $q->whereJsonContains('targets->types', 'all_users');
            
            // 2. entire_club
            $q->orWhere(function($subQ) use ($userClubIds) {
                $subQ->whereJsonContains('targets->types', 'entire_club');
                $subQ->where(function($clubQ) use ($userClubIds) {
                    foreach ($userClubIds as $cId) {
                        $clubQ->orWhereJsonContains('targets->club_ids', $cId);
                    }
                    $clubQ->orWhere(function($fallbackQ) use ($userClubIds) {
                        $fallbackQ->whereIn('club_id', $userClubIds);
                    });
                });
            });

            // 3. single_user or single_club_member
            $q->orWhere(function($subQ) use ($user) {
                $subQ->where(function($typeQ) {
                    $typeQ->whereJsonContains('targets->types', 'single_user')
                          ->orWhereJsonContains('targets->types', 'single_club_member');
                })
                ->whereJsonContains('targets->user_ids', $user->id);
            });
            
            // 4. Backward compatibility
            $q->orWhere(function($subQ) use ($userClubIds) {
                $subQ->whereNull('targets')
                     ->whereIn('club_id', $userClubIds);
            });
            
            // 5. Posted by self
            $q->orWhere('posted_by', $user->id);
        });

        return $query;
    }

    public function index(Request $request, Club $club): JsonResponse
    {
        $query = Announcement::where('club_id', $club->id)
            ->with('author')
            ->orderBy('is_pinned', 'desc')
            ->latest();
            
        $this->filterForUser($query, $request->user());

        return response()->json($query->get());
    }

    public function storeGlobal(StoreAnnouncementRequest $request): JsonResponse
    {
        return $this->processAnnouncementCreation($request->validated(), clone $request->user(), null);
    }

    public function store(StoreAnnouncementRequest $request, Club $club): JsonResponse
    {
        $this->authorize('create', [Announcement::class, $club]);
        return $this->processAnnouncementCreation($request->validated(), clone $request->user(), $club->id);
    }

    private function processAnnouncementCreation(array $data, $user, ?int $clubId): JsonResponse
    {
        $targets = $data['targets'] ?? ['types' => [$clubId ? 'entire_club' : 'all_users']];
        
        $announcement = Announcement::create([
            'club_id'   => $clubId,
            'title'     => $data['title'],
            'body'      => $data['body'],
            'posted_by' => $user->id,
            'is_pinned' => $data['is_pinned'] ?? false,
            'targets'   => $targets,
        ]);

        $userIdsToNotify = [];
        $types = $targets['types'] ?? [];

        if (in_array('all_users', $types)) {
            $userIdsToNotify = \App\Models\User::pluck('id')->toArray();
        } else {
            if (in_array('entire_club', $types)) {
                $cIds = $targets['club_ids'] ?? [];
                if (empty($cIds) && $clubId) {
                    $cIds = [$clubId];
                }
                if (!empty($cIds)) {
                    $clubMembers = \App\Models\ClubMember::whereIn('club_id', $cIds)
                        ->where('status', 'active')
                        ->pluck('user_id')->toArray();
                    $userIdsToNotify = array_merge($userIdsToNotify, $clubMembers);
                }
            }
            if (in_array('single_user', $types) || in_array('single_club_member', $types)) {
                if (!empty($targets['user_ids'])) {
                    $userIdsToNotify = array_merge($userIdsToNotify, $targets['user_ids']);
                }
            }
        }

        $userIdsToNotify = array_unique($userIdsToNotify);
        $userIdsToNotify = array_diff($userIdsToNotify, [$user->id]);

        $notifications = [];
        foreach ($userIdsToNotify as $recipientId) {
            $notifications[] = [
                'user_id' => $recipientId,
                'type' => 'announcement_posted',
                'title' => 'New Announcement',
                'message' => "New announcement: {$announcement->title}",
                'related_type' => Announcement::class,
                'related_id' => $announcement->id,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        
        if (!empty($notifications)) {
            Notification::insert($notifications);
        }

        \App\Services\AuditService::log('announcement_created', $announcement, [
            'title' => $announcement->title,
            'target_types' => $types,
            'recipient_count' => count($userIdsToNotify)
        ], $user->id);

        return response()->json($announcement->load('author'), 201);
    }

    public function show(Request $request, Announcement $announcement): JsonResponse
    {
        return response()->json($announcement->load(['club', 'author']));
    }

    public function update(UpdateAnnouncementRequest $request, Announcement $announcement): JsonResponse
    {
        $this->authorize('update', $announcement);

        $data = $request->validated();
        if (isset($data['targets'])) {
            $announcement->targets = $data['targets'];
        }
        $announcement->update($data);
        
        \App\Services\AuditService::log('announcement_updated', $announcement, [
            'title' => $announcement->title,
        ], $request->user()->id);

        return response()->json($announcement->load('author'));
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

        \App\Services\AuditService::log('announcement_deleted', $announcement, [
            'title' => $announcement->title,
        ], $request->user()->id);

        $announcement->delete();

        return response()->json(['message' => 'Announcement deleted successfully.']);
    }

    public function allAnnouncements(Request $request): JsonResponse
    {
        $query = Announcement::with(['club:id,name', 'author:id,name'])
            ->orderBy('is_pinned', 'desc')
            ->latest();
            
        $this->filterForUser($query, $request->user());

        return response()->json($query->get());
    }
}
