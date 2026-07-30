<?php

namespace App\Policies;

use App\Models\RecruitmentApplication;
use App\Models\User;

class RecruitmentApplicationPolicy
{
    public function review(User $user, RecruitmentApplication $application): bool
    {
        return $user->is_admin || $user->hasClubPermission($application->recruitmentNotice->club_id, 'can_manage_recruitment');
    }
}
