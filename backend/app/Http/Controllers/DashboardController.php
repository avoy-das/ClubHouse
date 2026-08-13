<?php

namespace App\Http\Controllers;

use App\Models\ClubMember;
use App\Models\EventRegistration;
use App\Models\Notification;
use App\Models\Announcement;
use App\Models\RecruitmentApplication;
use App\Models\MembershipRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // User's active club memberships (Cached for 2 minutes)
        $myClubs = Cache::remember("clubhouse:dashboard:clubs:{$user->id}", 120, function () use ($user) {
            return ClubMember::where('user_id', $user->id)
                ->where('status', 'active')
                ->with(['club:id,name,category,department,status,logo_path', 'club.creator:id,name'])
                ->get();
        });

        $clubsList = $myClubs->map(function ($cm) {
            if (!$cm->club) return null;
            $c = $cm->club->toArray();
            $c['pivot'] = ['role' => $cm->role, 'status' => $cm->status];
            return $c;
        })->filter()->values();

        // Cache upcoming events and counts for 2 minutes per user
        $cachedDashboardData = Cache::remember("clubhouse:dashboard:events:{$user->id}", 120, function () use ($user, $myClubs) {
            // Fetch registered event IDs for the current user
            $registeredEventIds = EventRegistration::where('user_id', $user->id)
                ->pluck('event_id')
                ->toArray();

            // Build upcoming events query (starts_at >= now(), active statuses)
            $eventsQuery = \App\Models\Event::where('starts_at', '>=', now())
                ->whereNotIn('status', ['draft', 'cancelled', 'completed']);

            // Visibility restrictions for non-admins
            if (!$user->is_admin) {
                $userClubIds = $myClubs->pluck('club_id');
                $eventsQuery->where(function ($q) use ($userClubIds) {
                    $q->where('visibility', 'public')
                      ->orWhereIn('club_id', $userClubIds);
                });
            }

            $upcomingEventsCount = (clone $eventsQuery)->count();

            // Upcoming campus events sorted chronologically (limit to top 5)
            $campusEvents = $eventsQuery->with(['club:id,name'])
                ->orderBy('starts_at', 'asc')
                ->limit(5)
                ->get();

            $formattedEvents = $campusEvents->map(function ($ev) use ($registeredEventIds) {
                return [
                    'id'            => $ev->id,
                    'title'         => $ev->title,
                    'description'   => $ev->description ?? '',
                    'start_time'    => $ev->starts_at,
                    'starts_at'     => $ev->starts_at,
                    'ends_at'       => $ev->ends_at,
                    'location'      => $ev->location_value,
                    'is_registered' => in_array($ev->id, $registeredEventIds),
                    'club'          => $ev->club ? ['id' => $ev->club->id, 'name' => $ev->club->name] : null,
                    'banner_path'   => $ev->banner_path,
                    'banner_url'    => $ev->banner_url,
                    'banner_thumbnail_path' => $ev->banner_thumbnail_path,
                    'banner_thumbnail_url'  => $ev->banner_thumbnail_url,
                ];
            })->values();

            // Pending requests / approvals count based on user role
            if ($user->is_admin) {
                $pendingRequests = \App\Models\Club::where('status', 'pending')->count()
                    + \App\Models\ClubEditRequest::where('status', 'pending')->count();
            } else {
                $pendingAppsCount = RecruitmentApplication::where('user_id', $user->id)
                    ->where('status', 'pending')
                    ->count();
                $pendingMemReqsCount = MembershipRequest::where('user_id', $user->id)
                    ->where('status', 'pending')
                    ->count();
                $pendingRequests = $pendingAppsCount + $pendingMemReqsCount;
            }

            return [
                'upcoming_events_count' => $upcomingEventsCount,
                'formatted_events'      => $formattedEvents,
                'pending_requests'      => $pendingRequests,
            ];
        });

        $upcomingEventsCount = $cachedDashboardData['upcoming_events_count'];
        $formattedEvents     = $cachedDashboardData['formatted_events'];
        $pendingRequests     = $cachedDashboardData['pending_requests'];

        // Recent notifications
        $recentNotifications = Notification::where('user_id', $user->id)
            ->latest()
            ->limit(5)
            ->get();

        // Recent announcements from user's clubs (Cached for 2 minutes)
        $userClubIds = $myClubs->pluck('club_id');
        $recentAnnouncements = Cache::remember("clubhouse:dashboard:announcements:{$user->id}", 120, function () use ($userClubIds) {
            return Announcement::whereIn('club_id', $userClubIds)
                ->with(['club:id,name', 'author:id,name'])
                ->latest()
                ->limit(5)
                ->get();
        });

        // Unread notification count
        $unreadCount = Notification::where('user_id', $user->id)
            ->where(function ($q) {
                $q->where('is_read', false)->orWhereNull('read_at');
            })
            ->count();

        return response()->json([
            'stats' => [
                'joined_clubs'     => $myClubs->count(),
                'upcoming_events'  => $upcomingEventsCount,
                'pending_requests' => $pendingRequests,
            ],
            'clubs'                      => $clubsList,
            'my_clubs'                   => $myClubs,
            'upcoming_events'            => $formattedEvents,
            'recent_notifications'       => $recentNotifications,
            'recent_announcements'       => $recentAnnouncements,
            'unread_notifications_count' => $unreadCount,
            'unread_count'               => $unreadCount,
        ]);
    }
}

