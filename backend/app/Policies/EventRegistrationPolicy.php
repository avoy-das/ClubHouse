<?php

namespace App\Policies;

use App\Models\EventRegistration;
use App\Models\User;

class EventRegistrationPolicy
{
    public function markAttendance(User $user, EventRegistration $registration): bool
    {
        return $user->is_admin || $user->hasClubPermission($registration->event->club_id, 'can_track_attendance');
    }
}
