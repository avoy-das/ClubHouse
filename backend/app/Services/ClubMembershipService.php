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
            ['status' => 'active', 'joined_at' => now(), 'role' => 'member']
        );

        if ($member->status !== 'active') {
            $member->update(['status' => 'active', 'joined_at' => now()]);
        }

        if ($member->wasRecentlyCreated || $member->positions()->count() === 0) {
            $default = $club->positions()->where('is_default', true)->first();
            
            if (!$default) {
                $default = $club->positions()->firstOrCreate(
                    ['title' => 'member', 'club_id' => $club->id],
                    ['is_executive' => false, 'is_default' => true, 'can_manage_members' => false, 'can_manage_events' => false, 'can_manage_announcements' => false, 'can_manage_recruitment' => false, 'can_track_attendance' => false]
                );
            }
            
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
