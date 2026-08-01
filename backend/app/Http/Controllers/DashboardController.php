<?php

namespace App\Http\Controllers;

use App\Models\ClubMember;
use App\Models\EventRegistration;
use App\Models\Notification;
use App\Models\Announcement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // User's clubs
        $myClubs = ClubMember::where('user_id', $user->id)
            ->with(['club:id,name,category,department,status,logo_path', 'club.creator:id,name'])
            ->get();

        // User's upcoming registered events
        $upcomingEvents = EventRegistration::where('user_id', $user->id)
            ->whereHas('event', function ($q) {
                $q->where('starts_at', '>', now());
            })
            ->with(['event:id,title,starts_at,location_value,club_id', 'event.club:id,name'])
            ->limit(5)
            ->get();

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
            'my_clubs'             => $myClubs,
            'upcoming_events'      => $upcomingEvents,
            'recent_notifications' => $recentNotifications,
            'recent_announcements' => $recentAnnouncements,
            'unread_count'         => $unreadCount,
        ]);
    }
}
