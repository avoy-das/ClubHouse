<?php

namespace App\Policies;

use App\Models\Club;
use App\Models\RecruitmentNotice;
use App\Models\User;

class RecruitmentNoticePolicy
{
    public function viewAny(?User $user): bool
    {
        return true;
    }

    public function view(?User $user, RecruitmentNotice $notice): bool
    {
        return true;
    }

    public function create(User $user, Club $club): bool
    {
        return $user->hasClubPermission($club, 'can_manage_recruitment');
    }

    public function update(User $user, RecruitmentNotice $notice): bool
    {
        return $user->hasClubPermission($notice->club_id, 'can_manage_recruitment');
    }

    public function delete(User $user, RecruitmentNotice $notice): bool
    {
        return $user->hasClubPermission($notice->club_id, 'can_manage_recruitment');
    }
}
