<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\ClubMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExecutiveEventCreationTest extends TestCase
{
    use RefreshDatabase;

    private function createApprovedClub(string $name, User $creator): Club
    {
        return Club::create([
            'name'          => $name,
            'description'   => 'Description for ' . $name,
            'category'      => 'Academic',
            'contact_email' => strtolower(str_replace(' ', '', $name)) . '@nstu.edu.bd',
            'reason'        => 'Testing executive events',
            'status'        => 'approved',
            'created_by'    => $creator->id,
        ]);
    }

    public function test_executive_clubs_endpoint_returns_only_clubs_where_user_is_executive(): void
    {
        $execUser = User::factory()->create();
        $otherUser = User::factory()->create();

        $club1 = $this->createApprovedClub('Club One', $execUser);
        $club2 = $this->createApprovedClub('Club Two', $otherUser);

        // Make execUser a president of club1 and a regular member of club2
        ClubMember::create([
            'club_id'   => $club1->id,
            'user_id'   => $execUser->id,
            'role'      => 'president',
            'status'    => 'active',
            'joined_at' => now(),
        ]);

        ClubMember::create([
            'club_id'   => $club2->id,
            'user_id'   => $execUser->id,
            'role'      => 'member',
            'status'    => 'active',
            'joined_at' => now(),
        ]);

        $response = $this->actingAs($execUser)->getJson('/api/clubs/executive');

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $club1->id);
    }

    public function test_admin_who_is_not_club_exec_gets_empty_list_in_executive_endpoint(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $creator = User::factory()->create();

        $club1 = $this->createApprovedClub('Alpha Club', $creator);
        $club2 = $this->createApprovedClub('Beta Club', $creator);

        $response = $this->actingAs($admin)->getJson('/api/clubs/executive');

        $response->assertStatus(200)
            ->assertJsonCount(0);
    }

    public function test_admin_who_is_not_club_exec_cannot_create_event_and_gets_403(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $creator = User::factory()->create();
        $club = $this->createApprovedClub('Robotics Club', $creator);

        $payload = [
            'club_id'        => $club->id,
            'title'          => 'Admin Created Event',
            'description'    => 'Admin should not be able to create events',
            'visibility'     => 'public',
            'location_type'  => 'physical',
            'location_value' => 'Room 101',
            'capacity'       => 50,
            'starts_at'      => now()->addDays(1)->toDateTimeString(),
            'ends_at'        => now()->addDays(1)->addHours(2)->toDateTimeString(),
        ];

        $response = $this->actingAs($admin)->postJson('/api/events', $payload);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'Only club executives can create events.');
    }

    public function test_executive_user_can_create_event_for_their_club(): void
    {
        $execUser = User::factory()->create();
        $club = $this->createApprovedClub('Tech Club', $execUser);

        ClubMember::create([
            'club_id'   => $club->id,
            'user_id'   => $execUser->id,
            'role'      => 'vice_president',
            'status'    => 'active',
            'joined_at' => now(),
        ]);

        $payload = [
            'club_id'        => $club->id,
            'title'          => 'Hackathon 2026',
            'description'    => 'Annual hackathon event',
            'visibility'     => 'public',
            'location_type'  => 'physical',
            'location_value' => 'Auditorium 1',
            'capacity'       => 100,
            'starts_at'      => now()->addDays(2)->toDateTimeString(),
            'ends_at'        => now()->addDays(2)->addHours(4)->toDateTimeString(),
        ];

        $response = $this->actingAs($execUser)->postJson('/api/events', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('event.title', 'Hackathon 2026')
            ->assertJsonPath('event.club_id', $club->id);

        $this->assertDatabaseHas('events', [
            'club_id' => $club->id,
            'title'   => 'Hackathon 2026',
        ]);
    }

    public function test_non_executive_member_cannot_create_event_and_gets_403(): void
    {
        $regularUser = User::factory()->create();
        $creator = User::factory()->create();
        $club = $this->createApprovedClub('Robotics Club', $creator);

        ClubMember::create([
            'club_id'   => $club->id,
            'user_id'   => $regularUser->id,
            'role'      => 'member',
            'status'    => 'active',
            'joined_at' => now(),
        ]);

        $payload = [
            'club_id'        => $club->id,
            'title'          => 'Unauthorized Event',
            'description'    => 'Should fail',
            'visibility'     => 'public',
            'location_type'  => 'physical',
            'location_value' => 'Room 101',
            'capacity'       => 50,
            'starts_at'      => now()->addDays(1)->toDateTimeString(),
            'ends_at'        => now()->addDays(1)->addHours(2)->toDateTimeString(),
        ];

        $response = $this->actingAs($regularUser)->postJson('/api/events', $payload);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'Only club executives can create events.');

        $this->assertDatabaseMissing('events', [
            'title' => 'Unauthorized Event',
        ]);
    }

    public function test_cancelled_events_do_not_appear_in_main_events_section(): void
    {
        $user = User::factory()->create();
        $creator = User::factory()->create();
        $club = $this->createApprovedClub('Sports Club', $creator);

        $activeEvent = \App\Models\Event::create([
            'club_id'        => $club->id,
            'created_by'     => $creator->id,
            'title'          => 'Active Football Match',
            'status'         => 'published',
            'visibility'     => 'public',
            'location_type'  => 'physical',
            'location_value' => 'Playground',
            'starts_at'      => now()->addDays(3),
            'ends_at'        => now()->addDays(3)->addHours(2),
            'capacity'       => 50,
        ]);

        $cancelledEvent = \App\Models\Event::create([
            'club_id'        => $club->id,
            'created_by'     => $creator->id,
            'title'          => 'Cancelled Cricket Match',
            'status'         => 'cancelled',
            'visibility'     => 'public',
            'location_type'  => 'physical',
            'location_value' => 'Playground',
            'starts_at'      => now()->addDays(4),
            'ends_at'        => now()->addDays(4)->addHours(2),
            'capacity'       => 50,
        ]);

        $response = $this->actingAs($user)->getJson('/api/events');

        $response->assertStatus(200);
        $titles = collect($response->json('data'))->pluck('title');

        $this->assertTrue($titles->contains('Active Football Match'));
        $this->assertFalse($titles->contains('Cancelled Cricket Match'));
    }

    public function test_events_are_sorted_by_creation_date_latest_first(): void
    {
        $user = User::factory()->create();
        $creator = User::factory()->create();
        $club = $this->createApprovedClub('Music Club', $creator);

        $olderEvent = \App\Models\Event::create([
            'club_id'        => $club->id,
            'created_by'     => $creator->id,
            'title'          => 'Older Created Event',
            'status'         => 'published',
            'visibility'     => 'public',
            'location_type'  => 'physical',
            'location_value' => 'Stage 1',
            'starts_at'      => now()->addDays(10), // start date in future
            'ends_at'        => now()->addDays(10)->addHours(2),
            'capacity'       => 50,
        ]);
        $olderEvent->created_at = now()->subDays(5);
        $olderEvent->save();

        $newerEvent = \App\Models\Event::create([
            'club_id'        => $club->id,
            'created_by'     => $creator->id,
            'title'          => 'Newer Created Event',
            'status'         => 'published',
            'visibility'     => 'public',
            'location_type'  => 'physical',
            'location_value' => 'Stage 2',
            'starts_at'      => now()->addDays(2), // start date earlier than older event
            'ends_at'        => now()->addDays(2)->addHours(2),
            'capacity'       => 50,
            'created_at'     => now(),
        ]);

        $response = $this->actingAs($user)->getJson('/api/events');

        $response->assertStatus(200);
        $eventsData = $response->json('data');

        $this->assertEquals('Newer Created Event', $eventsData[0]['title']);
        $this->assertEquals('Older Created Event', $eventsData[1]['title']);
    }
}
