<?php

namespace App\Policies;

use App\Models\Announcement;
use App\Models\Club;
use App\Models\User;

class AnnouncementPolicy
{
    public function viewAny(?User $user): bool
    {
        return true;
    }

    public function view(?User $user, Announcement $announcement): bool
    {
        return true;
    }

    public function create(User $user, Club $club): bool
    {
        return $user->is_admin || $user->hasClubPermission($club, 'can_manage_announcements');
    }

    public function update(User $user, Announcement $announcement): bool
    {
        return $user->is_admin || $user->hasClubPermission($announcement->club_id, 'can_manage_announcements');
    }

    public function delete(User $user, Announcement $announcement): bool
    {
        return $user->is_admin || $user->hasClubPermission($announcement->club_id, 'can_manage_announcements');
    }
}
