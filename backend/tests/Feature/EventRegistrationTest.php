<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Club $club;
    private Event $event;

    private function createUser(array $attributes = []): User
    {
        static $counter = 1000;
        $counter++;
        return User::factory()->create(array_merge([
            'student_id' => 'ASH190' . $counter . 'M',
            'department' => 'CSTE',
        ], $attributes));
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = $this->createUser();

        $this->club = Club::create([
            'name'          => 'Test Science Club',
            'description'   => 'A test club',
            'category'      => 'Academic',
            'department'    => 'Science',
            'contact_email' => 'scienceclub@test.edu',
            'reason'        => 'Test club creation',
            'status'        => 'approved',
            'created_by'    => $this->user->id,
        ]);

        $this->event = Event::create([
            'club_id'       => $this->club->id,
            'created_by'    => $this->user->id,
            'title'         => 'Tech Workshop 2026',
            'description'   => 'An upcoming workshop.',
            'status'        => 'published',
            'visibility'    => 'public',
            'location_type' => 'physical',
            'location_value'=> 'Hall A',
            'starts_at'     => now()->addDays(5),
            'ends_at'       => now()->addDays(5)->addHours(2),
            'capacity'      => 10,
        ]);
    }

    public function test_user_can_register_for_an_upcoming_event()
    {
        $response = $this->actingAs($this->user)
            ->postJson("/api/events/{$this->event->id}/register");

        $response->assertStatus(201)
            ->assertJson([
                'is_registered' => true,
                'registrations_count' => 1,
            ]);

        $this->assertDatabaseHas('event_registrations', [
            'event_id' => $this->event->id,
            'user_id'  => $this->user->id,
        ]);
    }

    public function test_duplicate_registration_returns_409_conflict()
    {
        EventRegistration::create([
            'event_id' => $this->event->id,
            'user_id'  => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/events/{$this->event->id}/register");

        $response->assertStatus(409)
            ->assertJson([
                'message' => 'You are already registered for this event.',
            ]);
    }

    public function test_user_joins_waitlist_when_event_is_fully_booked()
    {
        $this->event->update(['capacity' => 1]);

        $anotherUser = $this->createUser();
        EventRegistration::create([
            'event_id' => $this->event->id,
            'user_id'  => $anotherUser->id,
            'status'   => 'registered',
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/events/{$this->event->id}/register");

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'waitlisted',
                'message' => 'Successfully joined the waitlist.',
            ]);
    }

    public function test_user_can_cancel_registration_for_upcoming_event()
    {
        EventRegistration::create([
            'event_id' => $this->event->id,
            'user_id'  => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->deleteJson("/api/events/{$this->event->id}/register");

        $response->assertStatus(200)
            ->assertJson([
                'is_registered' => false,
            ]);

        $this->assertDatabaseMissing('event_registrations', [
            'event_id' => $this->event->id,
            'user_id'  => $this->user->id,
        ]);
    }

    public function test_cannot_cancel_registration_after_event_has_started()
    {
        $pastEvent = Event::create([
            'club_id'       => $this->club->id,
            'created_by'    => $this->user->id,
            'title'         => 'Past Hackathon',
            'status'        => 'ongoing',
            'visibility'    => 'public',
            'location_type' => 'physical',
            'location_value'=> 'Lab 1',
            'starts_at'     => now()->subHours(2),
            'ends_at'       => now()->addHours(2),
            'capacity'      => 50,
        ]);

        EventRegistration::create([
            'event_id' => $pastEvent->id,
            'user_id'  => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->deleteJson("/api/events/{$pastEvent->id}/register");

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Registration changes are not allowed after the event has started.',
            ]);
    }

    public function test_events_index_can_filter_by_registered_parameter()
    {
        EventRegistration::create([
            'event_id' => $this->event->id,
            'user_id'  => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/events?registered=true');

        $response->assertStatus(200)
            ->assertJsonFragment(['title' => $this->event->title]);
    }

    public function test_nobody_can_register_for_draft_event_before_it_is_published()
    {
        $execUser = $this->createUser();
        \App\Models\ClubMember::create([
            'club_id'   => $this->club->id,
            'user_id'   => $execUser->id,
            'role'      => 'president',
            'status'    => 'active',
            'joined_at' => now(),
        ]);

        $draftEvent = Event::create([
            'club_id'        => $this->club->id,
            'created_by'     => $execUser->id,
            'title'          => 'Draft Innovation Summit',
            'description'    => 'Unpublished draft event.',
            'status'         => 'draft',
            'visibility'     => 'public',
            'location_type'  => 'physical',
            'location_value' => 'Auditorium',
            'starts_at'      => now()->addDays(5),
            'ends_at'        => now()->addDays(5)->addHours(2),
            'capacity'       => 50,
        ]);

        // Regular user attempt
        $res1 = $this->actingAs($this->user)
            ->postJson("/api/events/{$draftEvent->id}/register");
        $res1->assertStatus(422)
            ->assertJson(['message' => 'Registration is not allowed before the event is published.']);

        // Executive user attempt
        $res2 = $this->actingAs($execUser)
            ->postJson("/api/events/{$draftEvent->id}/register");
        $res2->assertStatus(422)
            ->assertJson(['message' => 'Registration is not allowed before the event is published.']);
    }

    public function test_user_joins_waitlist_when_capacity_exceeded()
    {
        $this->event->update(['capacity' => 1]);

        $user1 = $this->createUser();
        $this->actingAs($user1)
            ->postJson("/api/events/{$this->event->id}/register")
            ->assertStatus(201)
            ->assertJson(['status' => 'registered']);

        $user2 = $this->createUser();
        $this->actingAs($user2)
            ->postJson("/api/events/{$this->event->id}/register")
            ->assertStatus(201)
            ->assertJson([
                'status' => 'waitlisted',
                'message' => 'Successfully joined the waitlist.'
            ]);

        $this->assertDatabaseHas('event_registrations', [
            'event_id' => $this->event->id,
            'user_id' => $user2->id,
            'status' => 'waitlisted',
        ]);
    }

    public function test_user_promoted_from_waitlist_on_self_cancellation()
    {
        $this->event->update(['capacity' => 1]);

        $user1 = $this->createUser();
        $this->actingAs($user1)->postJson("/api/events/{$this->event->id}/register");

        $user2 = $this->createUser();
        $this->actingAs($user2)->postJson("/api/events/{$this->event->id}/register");

        // User 1 cancels
        $this->actingAs($user1)
            ->deleteJson("/api/events/{$this->event->id}/register")
            ->assertStatus(200);

        // User 2 should be promoted to registered
        $this->assertDatabaseHas('event_registrations', [
            'event_id' => $this->event->id,
            'user_id' => $user2->id,
            'status' => 'registered',
        ]);
        
        $this->assertDatabaseMissing('event_registrations', [
            'event_id' => $this->event->id,
            'user_id' => $user1->id,
        ]);
    }

    public function test_user_promoted_from_waitlist_on_executive_cancellation()
    {
        $this->event->update(['capacity' => 1]);

        $execUser = $this->createUser();
        \App\Models\ClubMember::create([
            'club_id'   => $this->club->id,
            'user_id'   => $execUser->id,
            'role'      => 'president',
            'status'    => 'active',
            'joined_at' => now(),
        ]);

        $user1 = $this->createUser();
        $this->actingAs($user1)->postJson("/api/events/{$this->event->id}/register");

        $user2 = $this->createUser();
        $this->actingAs($user2)->postJson("/api/events/{$this->event->id}/register");

        // Exec cancels User 1
        $this->actingAs($execUser)
            ->deleteJson("/api/events/{$this->event->id}/registrations/{$user1->id}/cancel")
            ->assertStatus(200)
            ->assertJson(['message' => 'Registration cancelled by executive.']);

        $this->assertDatabaseHas('event_registrations', [
            'event_id' => $this->event->id,
            'user_id' => $user2->id,
            'status' => 'registered',
        ]);
    }

    public function test_executive_can_block_registered_user_which_cancels_registration_and_promotes_next_in_waitlist()
    {
        $this->event->update(['capacity' => 1]);

        $execUser = $this->createUser();
        \App\Models\ClubMember::create([
            'club_id'   => $this->club->id,
            'user_id'   => $execUser->id,
            'role'      => 'president',
            'status'    => 'active',
            'joined_at' => now(),
        ]);

        $user1 = $this->createUser();
        $this->actingAs($user1)->postJson("/api/events/{$this->event->id}/register");

        $user2 = $this->createUser();
        $this->actingAs($user2)->postJson("/api/events/{$this->event->id}/register");

        // Exec blocks User 1
        $this->actingAs($execUser)
            ->postJson("/api/events/{$this->event->id}/blocks", [
                'user_id' => $user1->id,
                'reason' => 'Spam registration',
            ])
            ->assertStatus(200)
            ->assertJson(['message' => 'User successfully blocked and registration cancelled.']);

        // Check user 1 blocked
        $this->assertDatabaseHas('event_blocks', [
            'event_id' => $this->event->id,
            'user_id' => $user1->id,
            'reason' => 'Spam registration',
        ]);

        // Check user 1 registration is gone
        $this->assertDatabaseMissing('event_registrations', [
            'event_id' => $this->event->id,
            'user_id' => $user1->id,
        ]);

        // User 2 promoted
        $this->assertDatabaseHas('event_registrations', [
            'event_id' => $this->event->id,
            'user_id' => $user2->id,
            'status' => 'registered',
        ]);
    }

    public function test_blocked_user_cannot_register()
    {
        $execUser = $this->createUser();
        \App\Models\ClubMember::create([
            'club_id'   => $this->club->id,
            'user_id'   => $execUser->id,
            'role'      => 'president',
            'status'    => 'active',
            'joined_at' => now(),
        ]);

        $user = $this->createUser();

        // Block user
        $this->actingAs($execUser)
            ->postJson("/api/events/{$this->event->id}/blocks", [
                'user_id' => $user->id,
            ])
            ->assertStatus(200);

        // Attempt register
        $this->actingAs($user)
            ->postJson("/api/events/{$this->event->id}/register")
            ->assertStatus(403)
            ->assertJson(['message' => 'You are blocked from registering for this event.']);
    }

    public function test_executive_can_unblock_user()
    {
        $execUser = $this->createUser();
        \App\Models\ClubMember::create([
            'club_id'   => $this->club->id,
            'user_id'   => $execUser->id,
            'role'      => 'president',
            'status'    => 'active',
            'joined_at' => now(),
        ]);

        $user = $this->createUser();

        // Block
        \App\Models\EventBlock::create([
            'event_id' => $this->event->id,
            'user_id' => $user->id,
            'blocked_by' => $execUser->id,
        ]);

        // Unblock
        $this->actingAs($execUser)
            ->deleteJson("/api/events/{$this->event->id}/blocks/{$user->id}")
            ->assertStatus(200)
            ->assertJson(['message' => 'User successfully unblocked.']);

        $this->assertDatabaseMissing('event_blocks', [
            'event_id' => $this->event->id,
            'user_id' => $user->id,
        ]);
    }
}
