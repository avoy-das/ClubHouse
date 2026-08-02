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

    public function create(User $user, ?Club $club = null): bool
    {
        if ($user->is_admin) {
            return true;
        }

        if ($club) {
            return $user->hasClubPermission($club, 'can_manage_announcements');
        }

        return $user->getExecutiveClubs()->count() > 0;
    }

    public function update(User $user, Announcement $announcement): bool
    {
        if ($user->is_admin) {
            return true;
        }

        $clubId = $announcement->club_id ?? $announcement->target_club_id;
        if ($clubId) {
            return $user->hasClubPermission($clubId, 'can_manage_announcements');
        }

        return false;
    }

    public function delete(User $user, Announcement $announcement): bool
    {
        if ($user->is_admin) {
            return true;
        }

        $clubId = $announcement->club_id ?? $announcement->target_club_id;
        if ($clubId) {
            return $user->hasClubPermission($clubId, 'can_manage_announcements');
        }

        return false;
    }
}
