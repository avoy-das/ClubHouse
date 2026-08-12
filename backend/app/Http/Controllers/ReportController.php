<?php

namespace App\Http\Controllers;

use App\Models\Club;
use App\Models\ClubMember;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class ReportController extends Controller
{
    public function overview(): JsonResponse
    {
        $stats = Cache::remember('clubhouse:reports:overview', 300, function () {
            return [
                'total_users'         => User::count(),
                'total_clubs'         => Club::where('status', 'approved')->count(),
                'approved_clubs'      => Club::where('status', 'approved')->count(),
                'pending_clubs'       => Club::where('status', 'pending')->count(),
                'suspended_clubs'     => Club::where('status', 'suspended')->count(),
                'total_memberships'   => ClubMember::where('status', 'active')->count(),
                'total_events'        => Event::count(),
                'total_registrations' => EventRegistration::count(),
            ];
        });

        return response()->json($stats);
    }

    public function clubReport(Club $club): JsonResponse
    {
        $eventIds = Event::where('club_id', $club->id)->pluck('id');
        $totalRegistrations = EventRegistration::whereIn('event_id', $eventIds)->count();
        $attendedCount = EventRegistration::whereIn('event_id', $eventIds)
            ->where('attended', true)
            ->count();

        $avgAttendanceRate = $totalRegistrations > 0 ? round(($attendedCount / $totalRegistrations) * 100, 2) : 0;

        return response()->json([
            'club'                => $club->load('creator:id,name'),
            'total_members'       => ClubMember::where('club_id', $club->id)->count(),
            'total_events'        => Event::where('club_id', $club->id)->count(),
            'upcoming_events'     => Event::where('club_id', $club->id)->where('starts_at', '>', now())->count(),
            'total_registrations' => $totalRegistrations,
            'avg_attendance_rate' => $avgAttendanceRate,
        ]);
    }
}
