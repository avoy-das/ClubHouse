<?php

namespace App\Policies;

use App\Models\MembershipRequest;
use App\Models\User;

class MembershipRequestPolicy
{
    public function review(User $user, MembershipRequest $request): bool
    {
        return $user->is_admin || $user->hasClubPermission($request->club_id, 'can_manage_members');
    }
}
