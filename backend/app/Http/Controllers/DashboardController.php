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

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // User's active club memberships
        $myClubs = ClubMember::where('user_id', $user->id)
            ->where('status', 'active')
            ->with(['club:id,name,category,department,status,logo_path', 'club.creator:id,name'])
            ->get();

        $clubsList = $myClubs->map(function ($cm) {
            if (!$cm->club) return null;
            $c = $cm->club->toArray();
            $c['pivot'] = ['role' => $cm->role, 'status' => $cm->status];
            return $c;
        })->filter()->values();

        // User's upcoming registered events
        $upcomingEvents = EventRegistration::where('user_id', $user->id)
            ->whereHas('event', function ($q) {
                $q->where('starts_at', '>', now());
            })
            ->with(['event:id,title,description,starts_at,location_value,club_id', 'event.club:id,name'])
            ->limit(5)
            ->get();

        $formattedEvents = $upcomingEvents->map(function ($reg) {
            if (!$reg->event) return null;
            return [
                'id'          => $reg->event->id,
                'title'       => $reg->event->title,
                'description' => $reg->event->description ?? '',
                'start_time'  => $reg->event->starts_at,
                'starts_at'   => $reg->event->starts_at,
                'location'    => $reg->event->location_value,
                'club'        => $reg->event->club ? ['id' => $reg->event->club->id, 'name' => $reg->event->club->name] : null,
            ];
        })->filter()->values();

        // Pending requests count
        $pendingAppsCount = RecruitmentApplication::where('user_id', $user->id)
            ->where('status', 'pending')
            ->count();
        $pendingMemReqsCount = MembershipRequest::where('user_id', $user->id)
            ->where('status', 'pending')
            ->count();
        $pendingRequests = $pendingAppsCount + $pendingMemReqsCount;

        // Recent notifications
        $recentNotifications = Notification::where('user_id', $user->id)
            ->latest()
            ->limit(5)
            ->get();

        // Recent announcements from user's clubs
        $userClubIds = $myClubs->pluck('club_id');
        $recentAnnouncements = Announcement::whereIn('club_id', $userClubIds)
            ->with(['club:id,name', 'author:id,name'])
            ->latest()
            ->limit(5)
            ->get();

        // Unread notification count
        $unreadCount = Notification::where('user_id', $user->id)
            ->where(function ($q) {
                $q->where('is_read', false)->orWhereNull('read_at');
            })
            ->count();

        return response()->json([
            'stats' => [
                'joined_clubs'     => $myClubs->count(),
                'upcoming_events'  => $upcomingEvents->count(),
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

