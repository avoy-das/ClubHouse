<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Club;
use App\Models\ClubMember;
use App\Models\Event;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NewFeatureRequirementsTest extends TestCase
{
    use RefreshDatabase;

    public function test_editing_club_details_requires_admin_permission()
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $memberUser = User::factory()->create(['is_admin' => false]);

        $club = Club::create([
            'name'          => 'Test Coding Club',
            'category'      => 'Technology',
            'description'   => 'Original description',
            'reason'        => 'Creation reason',
            'status'        => 'approved',
            'created_by'    => $admin->id,
            'contact_email' => 'tech@clubhouse.ac.bd',
        ]);

        ClubMember::create([
            'club_id'   => $club->id,
            'user_id'   => $memberUser->id,
            'role'      => 'president',
            'joined_at' => now(),
        ]);

        // Non-admin president attempt -> 403
        $response = $this->actingAs($memberUser, 'sanctum')
            ->putJson("/api/clubs/{$club->id}", [
                'name' => 'Attempted Edit by Non Admin',
            ]);
        $response->assertStatus(403);

        // Admin attempt -> 200 & notifies members
        $adminResponse = $this->actingAs($admin, 'sanctum')
            ->putJson("/api/clubs/{$club->id}", [
                'name' => 'Updated by Admin',
            ]);
        $adminResponse->assertStatus(200);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $memberUser->id,
            'type'    => 'club_updated',
        ]);
    }

    public function test_drafted_events_hidden_from_regular_members()
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $exec = User::factory()->create(['is_admin' => false]);
        $regularUser = User::factory()->create(['is_admin' => false]);

        $club = Club::create([
            'name'          => 'Robotics Club',
            'category'      => 'Science',
            'description'   => 'Desc',
            'reason'        => 'Creation reason',
            'status'        => 'approved',
            'created_by'    => $admin->id,
            'contact_email' => 'robotics@clubhouse.ac.bd',
        ]);

        ClubMember::create([
            'club_id' => $club->id,
            'user_id' => $exec->id,
            'role'    => 'president',
        ]);

        $draftEvent = Event::create([
            'club_id'        => $club->id,
            'created_by'     => $exec->id,
            'title'          => 'Secret Executive Meeting',
            'status'         => 'draft',
            'visibility'     => 'public',
            'location_type'  => 'physical',
            'location_value' => 'Room 101',
            'starts_at'      => now()->addDays(5),
            'ends_at'        => now()->addDays(5)->addHours(2),
            'capacity'       => 50,
        ]);

        // Regular user cannot view draft event -> 403
        $this->actingAs($regularUser, 'sanctum')
            ->getJson("/api/events/{$draftEvent->id}")
            ->assertStatus(403);

        // Club executive can view draft event -> 200
        $this->actingAs($exec, 'sanctum')
            ->getJson("/api/events/{$draftEvent->id}")
            ->assertStatus(200);
    }

    public function test_venue_and_time_conflict_blocks_publishing()
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $club = Club::create([
            'name'          => 'Debate Club',
            'category'      => 'Arts',
            'description'   => 'Desc',
            'reason'        => 'Creation reason',
            'status'        => 'approved',
            'created_by'    => $admin->id,
            'contact_email' => 'debate@clubhouse.ac.bd',
        ]);

        ClubMember::create([
            'club_id'   => $club->id,
            'user_id'   => $admin->id,
            'role'      => 'president',
            'status'    => 'active',
            'joined_at' => now(),
        ]);

        // First published event at Auditorium 1
        Event::create([
            'club_id'        => $club->id,
            'created_by'     => $admin->id,
            'title'          => 'National Debate Championship',
            'status'         => 'published',
            'visibility'     => 'public',
            'location_type'  => 'physical',
            'location_value' => 'Auditorium 1',
            'starts_at'      => '2026-09-10 10:00:00',
            'ends_at'        => '2026-09-10 14:00:00',
            'capacity'       => 200,
        ]);

        // Attempting to publish another event at Auditorium 1 during overlapping time -> 422
        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/events', [
                'club_id'        => $club->id,
                'title'          => 'Conflicting Music Fest',
                'status'         => 'published',
                'visibility'     => 'public',
                'location_type'  => 'physical',
                'location_value' => 'auditorium 1 ', // test case-insensitivity & trim
                'starts_at'      => '2026-09-10 12:00:00',
                'ends_at'        => '2026-09-10 16:00:00',
                'capacity'       => 100,
            ]);

        $response->assertStatus(422)
            ->assertJsonFragment(['message' => "Venue conflict: Cannot publish event. Another event ('National Debate Championship') is already published at 'auditorium 1' during this time window."]);
    }

    public function test_receiver_can_unpin_announcement()
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $user = User::factory()->create(['is_admin' => false]);

        $announcement = Announcement::create([
            'title'       => 'Global Campus Notice',
            'body'        => 'Important update for everyone',
            'posted_by'   => $admin->id,
            'is_pinned'   => true,
            'target_type' => 'all_users',
        ]);

        // Prior to unpinning, announcement has is_pinned_for_me = true
        $res1 = $this->actingAs($user, 'sanctum')->getJson('/api/announcements');
        $res1->assertStatus(200);
        $this->assertTrue($res1->json()[0]['is_pinned_for_me']);

        // Receiver unpins announcement
        $this->actingAs($user, 'sanctum')
            ->postJson("/api/announcements/{$announcement->id}/unpin")
            ->assertStatus(200);

        // After unpinning, is_pinned_for_me is false for this user
        $res2 = $this->actingAs($user, 'sanctum')->getJson('/api/announcements');
        $res2->assertStatus(200);
        $this->assertFalse($res2->json()[0]['is_pinned_for_me']);
    }
}
