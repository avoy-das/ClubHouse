<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardUpcomingEventsTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Club $club;

    private function createUser(array $attributes = []): User
    {
        static $counter = 5000;
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
            'name'          => 'Dashboard Test Club',
            'description'   => 'Club for testing dashboard upcoming events',
            'category'      => 'Academic',
            'department'    => 'Science',
            'contact_email' => 'dashboard@test.edu',
            'reason'        => 'Testing',
            'status'        => 'approved',
            'created_by'    => $this->user->id,
        ]);
    }

    public function test_dashboard_returns_upcoming_events_sorted_chronologically()
    {
        // Event A: 10 days in future
        $eventLater = Event::create([
            'club_id'       => $this->club->id,
            'created_by'    => $this->user->id,
            'title'         => 'Later Event',
            'description'   => 'Event in 10 days',
            'status'        => 'published',
            'visibility'    => 'public',
            'location_type' => 'physical',
            'location_value'=> 'Auditorium',
            'starts_at'     => now()->addDays(10),
            'ends_at'       => now()->addDays(10)->addHours(2),
            'capacity'      => 50,
        ]);

        // Event B: 2 days in future
        $eventSooner = Event::create([
            'club_id'       => $this->club->id,
            'created_by'    => $this->user->id,
            'title'         => 'Sooner Event',
            'description'   => 'Event in 2 days',
            'status'        => 'published',
            'visibility'    => 'public',
            'location_type' => 'physical',
            'location_value'=> 'Room 101',
            'starts_at'     => now()->addDays(2),
            'ends_at'       => now()->addDays(2)->addHours(2),
            'capacity'      => 50,
        ]);

        // User registers for Event A (later) first, then Event B (sooner)
        EventRegistration::create(['event_id' => $eventLater->id, 'user_id' => $this->user->id]);
        EventRegistration::create(['event_id' => $eventSooner->id, 'user_id' => $this->user->id]);

        $response = $this->actingAs($this->user)->getJson('/api/dashboard');

        $response->assertStatus(200);

        $events = $response->json('upcoming_events');
        $this->assertCount(2, $events);
        // Earlier event must come first regardless of registration order
        $this->assertEquals($eventSooner->id, $events[0]['id']);
        $this->assertEquals($eventLater->id, $events[1]['id']);
    }

    public function test_dashboard_syncs_event_statuses_and_filters_past_or_cancelled_events()
    {
        // Event that ended 1 hour ago (status still set to published in DB initially)
        $pastEvent = Event::create([
            'club_id'       => $this->club->id,
            'created_by'    => $this->user->id,
            'title'         => 'Past Event',
            'status'        => 'published',
            'visibility'    => 'public',
            'location_type' => 'physical',
            'location_value'=> 'Hall B',
            'starts_at'     => now()->subHours(3),
            'ends_at'       => now()->subHour(),
            'capacity'      => 50,
        ]);

        // Future event
        $futureEvent = Event::create([
            'club_id'       => $this->club->id,
            'created_by'    => $this->user->id,
            'title'         => 'Future Event',
            'status'        => 'published',
            'visibility'    => 'public',
            'location_type' => 'physical',
            'location_value'=> 'Hall C',
            'starts_at'     => now()->addDays(1),
            'ends_at'       => now()->addDays(1)->addHours(2),
            'capacity'      => 50,
        ]);

        EventRegistration::create(['event_id' => $pastEvent->id, 'user_id' => $this->user->id]);
        EventRegistration::create(['event_id' => $futureEvent->id, 'user_id' => $this->user->id]);

        $response = $this->actingAs($this->user)->getJson('/api/dashboard');

        $response->assertStatus(200);

        // Past event status should have been auto-synced to completed
        $this->assertDatabaseHas('events', [
            'id'     => $pastEvent->id,
            'status' => 'completed',
        ]);

        $events = $response->json('upcoming_events');
        $this->assertCount(1, $events);
        $this->assertEquals($futureEvent->id, $events[0]['id']);
    }
}
