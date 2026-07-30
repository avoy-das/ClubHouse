<?php

namespace App\Services;

use App\Models\Club;
use App\Models\ClubMember;
use App\Models\ClubMemberPosition;
use App\Models\User;

class ClubMembershipService
{
    public function admitUser(Club $club, User $user): ClubMember
    {
        $member = ClubMember::firstOrCreate(
            ['club_id' => $club->id, 'user_id' => $user->id],
            ['status' => 'active', 'joined_at' => now()]
        );

        if ($member->status !== 'active') {
            $member->update(['status' => 'active', 'joined_at' => now()]);
        }

        if ($member->wasRecentlyCreated || $member->positions()->count() === 0) {
            $default = $club->positions()->where('is_default', true)->first();
            if ($default) {
                ClubMemberPosition::firstOrCreate([
                    'club_member_id'   => $member->id,
                    'club_position_id' => $default->id,
                ], [
                    'assigned_at'      => now(),
                ]);
            }
        }

        return $member;
    }
}
