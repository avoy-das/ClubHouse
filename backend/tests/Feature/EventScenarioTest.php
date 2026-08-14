<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Database\Seeders\EventSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventScenarioTest extends TestCase
{
    use RefreshDatabase;

    private User $newUser;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed the 5 events with 5 different settings
        $this->seed(EventSeeder::class);

        // Create a new independent user for test scenarios
        $this->newUser = User::factory()->create([
            'student_id' => 'ASH190099M',
            'department' => 'CSTE',
        ]);
    }

    /**
     * Criteria 1: Upcoming Event with Available Capacity
     * - Open for registration
     * - Calculates remaining spots correctly (20 - 2 = 18)
     * - User can successfully register
     */
    public function test_criteria_1_upcoming_event_with_available_capacity()
    {
        $event = Event::where('title', 'AI & Machine Learning Bootcamp 2026')->firstOrFail();

        // 1. Check detail endpoint
        $response = $this->actingAs($this->newUser)
            ->getJson("/api/events/{$event->id}");

        $response->assertStatus(200)
            ->assertJson([
                'is_registered'   => false,
                'spots_remaining' => 18,
            ]);

        // 2. Register for event
        $regResponse = $this->actingAs($this->newUser)
            ->postJson("/api/events/{$event->id}/register");

        $regResponse->assertStatus(201)
            ->assertJson([
                'is_registered'       => true,
                'registrations_count' => 3,
                'spots_remaining'     => 17,
            ]);
    }

    /**
     * Criteria 2: Fully Booked Event
     * - Capacity is set (2) and registrations count equals capacity (2)
     * - Remaining spots is 0
     * - Registration attempts are blocked with 422 "This event is fully booked."
     */
    public function test_criteria_2_fully_booked_event()
    {
        $event = Event::where('title', 'Exclusive Cybersecurity Masterclass')->firstOrFail();

        // 1. Check detail endpoint
        $response = $this->actingAs($this->newUser)
            ->getJson("/api/events/{$event->id}");

        $response->assertStatus(200)
            ->assertJson([
                'spots_remaining' => 0,
            ]);

        // 2. Attempt registration
        $regResponse = $this->actingAs($this->newUser)
            ->postJson("/api/events/{$event->id}/register");

        $regResponse->assertStatus(201)
            ->assertJson([
                'status' => 'waitlisted',
                'message' => 'Successfully joined the waitlist.',
            ]);
    }

    /**
     * Criteria 3: Unlimited Capacity Event
     * - Capacity is null
     * - Spots remaining is null
     * - Any user can register without limit
     */
    public function test_criteria_3_unlimited_capacity_event()
    {
        $event = Event::where('title', 'Annual Tech Fest Keynote Speech')->firstOrFail();

        $this->assertNull($event->capacity);

        // 1. Register for event
        $regResponse = $this->actingAs($this->newUser)
            ->postJson("/api/events/{$event->id}/register");

        $regResponse->assertStatus(201)
            ->assertJson([
                'is_registered' => true,
            ]);

        $this->assertDatabaseHas('event_registrations', [
            'event_id' => $event->id,
            'user_id'  => $this->newUser->id,
        ]);
    }

    /**
     * Criteria 4: Ongoing Event
     * - Status is 'ongoing'
     * - Existing registered user attempts to cancel
     * - Cancel operation returns 403 Forbidden with clear warning
     */
    public function test_criteria_4_ongoing_event_cancellation_restricted()
    {
        $event = Event::where('title', 'Live Hackathon 2026')->firstOrFail();
        $registeredUser = User::where('email', 'student4@student.nstu.edu.bd')->firstOrFail();

        // Attempt to cancel registration while event is ongoing
        $cancelResponse = $this->actingAs($registeredUser)
            ->deleteJson("/api/events/{$event->id}/register");

        $cancelResponse->assertStatus(403)
            ->assertJson([
                'message' => 'Registration changes are not allowed after the event has started.',
            ]);
    }

    /**
     * Criteria 5: Completed / Past Event
     * - Status is 'completed' and ends_at is in the past
     * - New registration attempt is blocked with 422 "Registration is closed..."
     */
    public function test_criteria_5_completed_event_registration_closed()
    {
        $event = Event::where('title', 'Web Development Starter Workshop')->firstOrFail();

        $regResponse = $this->actingAs($this->newUser)
            ->postJson("/api/events/{$event->id}/register");

        $regResponse->assertStatus(422)
            ->assertJson([
                'message' => 'Registration is closed because this event has ended or is cancelled.',
            ]);
    }
}
