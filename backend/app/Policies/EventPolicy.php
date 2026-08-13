<?php

namespace App\Policies;

use App\Models\Club;
use App\Models\Event;
use App\Models\User;

class EventPolicy
{
    public function viewAny(?User $user): bool
    {
        return true;
    }

    public function view(?User $user, Event $event): bool
    {
        return true;
    }

    public function create(User $user, Club $club): bool
    {
        if ($club->status === 'suspended') {
            return false;
        }

        return $user->hasClubPermission($club, 'can_manage_events') ||
            \Illuminate\Support\Facades\DB::table('club_members')
                ->where('user_id', $user->id)
                ->where('club_id', $club->id)
                ->where(function ($q) {
                    $q->whereNull('status')->orWhere('status', 'active');
                })
                ->whereIn('role', Event::execRoles())
                ->exists();
    }

    public function update(User $user, Event $event): bool
    {
        if ($event->club && $event->club->status === 'suspended') {
            return false;
        }

        return $user->hasClubPermission($event->club_id, 'can_manage_events');
    }

    public function delete(User $user, Event $event): bool
    {
        if ($event->club && $event->club->status === 'suspended') {
            return false;
        }

        return $user->hasClubPermission($event->club_id, 'can_manage_events');
    }
}
