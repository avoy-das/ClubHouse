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
        return $user->is_admin || $user->hasClubPermission($club, 'can_manage_events');
    }

    public function update(User $user, Event $event): bool
    {
        return $user->is_admin || $user->hasClubPermission($event->club_id, 'can_manage_events');
    }

    public function delete(User $user, Event $event): bool
    {
        return $user->is_admin || $user->hasClubPermission($event->club_id, 'can_manage_events');
    }
}
