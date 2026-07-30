<?php

namespace App\Http\Controllers;

use App\Models\Certificate;
use App\Models\Club;
use App\Models\ClubMember;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class ReportController extends Controller
{
    public function overview(): JsonResponse
    {
        return response()->json([
            'total_users'         => User::count(),
            'total_clubs'         => Club::count(),
            'pending_clubs'       => Club::where('status', 'pending')->count(),
            'approved_clubs'      => Club::where('status', 'approved')->count(),
            'suspended_clubs'     => Club::where('status', 'suspended')->count(),
            'total_memberships'   => ClubMember::where('status', 'active')->count(),
            'total_events'        => Event::count(),
            'total_registrations' => EventRegistration::where('status', 'registered')->count(),
            'total_certificates'  => Certificate::count(),
        ]);
    }
}
