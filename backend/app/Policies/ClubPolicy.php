<?php

namespace App\Policies;

use App\Models\Club;
use App\Models\User;

class ClubPolicy
{
    public function viewAny(?User $user): bool
    {
        return true;
    }

    public function view(?User $user, Club $club): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Club $club): bool
    {
        return $user->is_admin || $user->hasClubPermission($club, 'can_manage_members');
    }

    public function delete(User $user, Club $club): bool
    {
        return $user->is_admin;
    }

    public function approve(User $user, Club $club): bool
    {
        return $user->is_admin;
    }

    public function suspend(User $user, Club $club): bool
    {
        return $user->is_admin;
    }
}
