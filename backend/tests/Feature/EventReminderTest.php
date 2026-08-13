<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\ClubMember;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventReminderTest extends TestCase
{
    use RefreshDatabase;

    private function createClub(array $attributes = []): Club
    {
        static $counter = 1;
        $counter++;
        return Club::create(array_merge([
            'name'          => 'Test Club ' . $counter,
            'description'   => 'Test club description',
            'category'      => 'Academic',
            'department'    => 'Computer Science',
            'contact_email' => 'club' . $counter . '@g.bracuex.edu.bd',
            'contact_phone' => '017000000' . $counter,
            'reason'        => 'Test creation reason',
            'status'        => 'approved',
            'created_by'    => User::factory()->create()->id,
        ], $attributes));
    }

    private function createUser(array $attributes = []): User
    {
        static $counter = 5000;
        $counter++;
        return User::factory()->create(array_merge([
            'student_id' => 'ASH190' . $counter . 'M',
            'department' => 'CSTE',
            'email'      => 'user' . $counter . '@g.bracuex.edu.bd',
        ], $attributes));
    }

    private function createEvent(array $attributes = []): Event
    {
        return Event::create(array_merge([
            'location_type'  => 'physical',
            'location_value' => 'Auditorium 101',
            'ends_at'        => now()->addDays(3),
            'status'         => 'published',
        ], $attributes));
    }

    public function test_executive_can_send_manual_event_reminder(): void
    {
        $club = $this->createClub();
        $execUser = $this->createUser();
        ClubMember::create([
            'club_id' => $club->id,
            'user_id' => $execUser->id,
            'role'    => 'president',
            'status'  => 'active',
        ]);

        $attendee = $this->createUser();

        $event = $this->createEvent([
            'club_id'    => $club->id,
            'created_by' => $execUser->id,
            'title'      => 'Annual Hackathon',
            'starts_at'  => now()->addDays(2),
        ]);

        EventRegistration::create([
            'event_id' => $event->id,
            'user_id'  => $attendee->id,
            'status'   => 'registered',
        ]);

        $response = $this->actingAs($execUser)->postJson("/api/events/{$event->id}/send-reminder", [
            'message' => 'Please bring your laptop and charger!',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Event reminder successfully sent to all registered attendees.');

        $this->assertDatabaseHas('notifications', [
            'user_id'      => $attendee->id,
            'type'         => 'event_manual_reminder',
            'message'      => 'Please bring your laptop and charger!',
            'related_id'   => $event->id,
        ]);
    }

    public function test_non_executive_cannot_send_manual_reminder(): void
    {
        $club = $this->createClub();
        $normalUser = $this->createUser();
        $creator = $this->createUser();

        $event = $this->createEvent([
            'club_id'    => $club->id,
            'created_by' => $creator->id,
            'title'      => 'Seminar',
            'starts_at'  => now()->addDays(2),
        ]);

        $response = $this->actingAs($normalUser)->postJson("/api/events/{$event->id}/send-reminder", [
            'message' => 'Test message',
        ]);

        $response->assertStatus(403);
    }
}
