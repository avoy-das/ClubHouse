<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventAutoStatusTransitionTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Club $club;

    private function createUser(): User
    {
        static $counter = 7000;
        $counter++;
        return User::factory()->create([
            'student_id' => 'ASH190' . $counter . 'M',
            'department' => 'CSTE',
        ]);
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = $this->createUser();
        $this->club = Club::create([
            'name'          => 'Auto Transition Test Club',
            'description'   => 'Club for testing automatic event status transitions',
            'category'      => 'Academic',
            'department'    => 'Science',
            'contact_email' => 'autotransition@test.edu',
            'reason'        => 'Testing status sync',
            'status'        => 'approved',
            'created_by'    => $this->user->id,
        ]);
    }

    public function test_published_event_automatically_transitions_to_ongoing_when_start_time_is_reached(): void
    {
        // Event published with start time in the past and end time in the future
        $event = Event::create([
            'club_id'        => $this->club->id,
            'created_by'     => $this->user->id,
            'title'          => 'Started Hackathon',
            'description'    => 'Event should be ongoing now.',
            'status'         => 'published',
            'visibility'     => 'public',
            'location_type'  => 'physical',
            'location_value' => 'Auditorium 1',
            'starts_at'      => now()->subMinutes(30),
            'ends_at'        => now()->addHours(2),
            'capacity'       => 100,
        ]);

        \App\Http\Controllers\EventController::syncEventStatuses();

        $this->assertDatabaseHas('events', [
            'id'     => $event->id,
            'status' => 'ongoing',
        ]);
    }

    public function test_ongoing_event_automatically_transitions_to_completed_when_end_time_is_reached(): void
    {
        // Event marked ongoing with end time in the past
        $event = Event::create([
            'club_id'        => $this->club->id,
            'created_by'     => $this->user->id,
            'title'          => 'Finished Workshop',
            'description'    => 'Event has ended.',
            'status'         => 'ongoing',
            'visibility'     => 'public',
            'location_type'  => 'physical',
            'location_value' => 'Lab 2',
            'starts_at'      => now()->subHours(4),
            'ends_at'        => now()->subMinutes(15),
            'capacity'       => 50,
        ]);

        \App\Http\Controllers\EventController::syncEventStatuses();

        $this->assertDatabaseHas('events', [
            'id'     => $event->id,
            'status' => 'completed',
        ]);
    }

    public function test_published_event_that_ended_in_past_automatically_transitions_to_completed(): void
    {
        // Event was published, but time passed end time without ever being viewed while ongoing
        $event = Event::create([
            'club_id'        => $this->club->id,
            'created_by'     => $this->user->id,
            'title'          => 'Unmonitored Past Event',
            'description'    => 'Event ended in the past.',
            'status'         => 'published',
            'visibility'     => 'public',
            'location_type'  => 'physical',
            'location_value' => 'Room 303',
            'starts_at'      => now()->subDays(2),
            'ends_at'        => now()->subDays(1),
            'capacity'       => 50,
        ]);

        \App\Http\Controllers\EventController::syncEventStatuses();

        $this->assertDatabaseHas('events', [
            'id'     => $event->id,
            'status' => 'completed',
        ]);
    }

    public function test_draft_event_automatically_transitions_to_cancelled_if_start_time_reached_without_being_published(): void
    {
        // Event was left in draft state when start time arrived
        $event = Event::create([
            'club_id'        => $this->club->id,
            'created_by'     => $this->user->id,
            'title'          => 'Forgotten Draft Event',
            'description'    => 'Never published.',
            'status'         => 'draft',
            'visibility'     => 'public',
            'location_type'  => 'physical',
            'location_value' => 'Room 101',
            'starts_at'      => now()->subMinutes(5),
            'ends_at'        => now()->addHours(2),
            'capacity'       => 30,
        ]);

        \App\Http\Controllers\EventController::syncEventStatuses();

        $this->assertDatabaseHas('events', [
            'id'     => $event->id,
            'status' => 'cancelled',
        ]);
    }

    public function test_artisan_command_updates_event_statuses(): void
    {
        $event1 = Event::create([
            'club_id'        => $this->club->id,
            'created_by'     => $this->user->id,
            'title'          => 'Command Test Event Ongoing',
            'status'         => 'published',
            'visibility'     => 'public',
            'location_type'  => 'physical',
            'location_value' => 'Main Hall',
            'starts_at'      => now()->subMinutes(10),
            'ends_at'        => now()->addHours(1),
            'capacity'       => 50,
        ]);

        $event2 = Event::create([
            'club_id'        => $this->club->id,
            'created_by'     => $this->user->id,
            'title'          => 'Command Test Event Completed',
            'status'         => 'ongoing',
            'visibility'     => 'public',
            'location_type'  => 'physical',
            'location_value' => 'Main Hall',
            'starts_at'      => now()->subHours(3),
            'ends_at'        => now()->subMinutes(5),
            'capacity'       => 50,
        ]);

        $this->artisan('events:update-statuses')
            ->assertExitCode(0);

        $this->assertDatabaseHas('events', ['id' => $event1->id, 'status' => 'ongoing']);
        $this->assertDatabaseHas('events', ['id' => $event2->id, 'status' => 'completed']);
    }

    public function test_api_events_index_triggers_automatic_status_synchronization(): void
    {
        $event = Event::create([
            'club_id'        => $this->club->id,
            'created_by'     => $this->user->id,
            'title'          => 'API Triggered Ongoing Event',
            'status'         => 'published',
            'visibility'     => 'public',
            'location_type'  => 'physical',
            'location_value' => 'Plaza',
            'starts_at'      => now()->subMinutes(15),
            'ends_at'        => now()->addHours(3),
            'capacity'       => 50,
        ]);

        $response = $this->actingAs($this->user)->getJson('/api/events');

        $response->assertStatus(200);

        $this->assertDatabaseHas('events', [
            'id'     => $event->id,
            'status' => 'ongoing',
        ]);
    }
}
