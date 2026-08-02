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

    public function test_user_cannot_register_for_fully_booked_event()
    {
        $this->event->update(['capacity' => 1]);

        $anotherUser = $this->createUser();
        EventRegistration::create([
            'event_id' => $this->event->id,
            'user_id'  => $anotherUser->id,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/events/{$this->event->id}/register");

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'This event is fully booked.',
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
}
