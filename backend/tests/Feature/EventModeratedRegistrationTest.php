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

class EventModeratedRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private User $execUser;
    private Club $club;
    private Event $moderatedEvent;

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
        $this->execUser = $this->createUser();

        $this->club = Club::create([
            'name'          => 'NSTU Tech Society',
            'description'   => 'A technology society club',
            'category'      => 'Academic',
            'department'    => 'CSTE',
            'contact_email' => 'tech@nstu.edu.bd',
            'reason'        => 'Test club creation',
            'status'        => 'approved',
            'created_by'    => $this->execUser->id,
        ]);

        ClubMember::create([
            'club_id'   => $this->club->id,
            'user_id'   => $this->execUser->id,
            'role'      => 'president',
            'status'    => 'active',
            'joined_at' => now(),
        ]);

        $this->moderatedEvent = Event::create([
            'club_id'           => $this->club->id,
            'created_by'        => $this->execUser->id,
            'title'             => 'Moderated AI Hackathon 2026',
            'description'       => 'Exclusive hackathon requiring executive screening.',
            'status'            => 'published',
            'visibility'        => 'public',
            'location_type'     => 'physical',
            'location_value'    => 'Lab 3',
            'starts_at'         => now()->addDays(5),
            'ends_at'           => now()->addDays(5)->addHours(4),
            'capacity'          => 2,
            'requires_approval' => true,
        ]);
    }

    public function test_executive_can_create_event_with_requires_approval_flag()
    {
        $response = $this->actingAs($this->execUser)
            ->postJson('/api/events', [
                'club_id'           => $this->club->id,
                'title'             => 'Exclusive Robotics Workshop',
                'description'       => 'Hands-on robotics lab',
                'visibility'        => 'public',
                'location_type'     => 'physical',
                'location_value'    => 'Robotics Lab',
                'starts_at'         => now()->addDays(10)->format('Y-m-d H:i:s'),
                'ends_at'           => now()->addDays(10)->addHours(2)->format('Y-m-d H:i:s'),
                'capacity'          => 20,
                'requires_approval' => true,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('event.requires_approval', true);

        $this->assertDatabaseHas('events', [
            'title'             => 'Exclusive Robotics Workshop',
            'requires_approval' => true,
        ]);
    }

    public function test_registration_for_moderated_event_lands_in_pending_status_and_notifies_executives()
    {
        $response = $this->actingAs($this->user)
            ->postJson("/api/events/{$this->moderatedEvent->id}/register");

        $response->assertStatus(201)
            ->assertJson([
                'status'  => 'pending',
                'message' => 'Registration request submitted! Awaiting executive review.',
            ]);

        $this->assertDatabaseHas('event_registrations', [
            'event_id' => $this->moderatedEvent->id,
            'user_id'  => $this->user->id,
            'status'   => 'pending',
        ]);

        // Assert notification sent to student
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->user->id,
            'type'    => 'event_registration_pending',
        ]);

        // Assert notification sent to executive
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->execUser->id,
            'type'    => 'event_registration_pending_exec',
        ]);
    }

    public function test_duplicate_registration_attempt_for_pending_application_returns_409()
    {
        EventRegistration::create([
            'event_id' => $this->moderatedEvent->id,
            'user_id'  => $this->user->id,
            'status'   => 'pending',
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/events/{$this->moderatedEvent->id}/register");

        $response->assertStatus(409)
            ->assertJson([
                'message' => 'Your registration request is currently pending executive approval.',
            ]);
    }

    public function test_pending_registrations_do_not_consume_capacity()
    {
        // Add 2 pending registrations (event capacity is 2)
        $student1 = $this->createUser();
        $student2 = $this->createUser();

        EventRegistration::create([
            'event_id' => $this->moderatedEvent->id,
            'user_id'  => $student1->id,
            'status'   => 'pending',
        ]);

        EventRegistration::create([
            'event_id' => $this->moderatedEvent->id,
            'user_id'  => $student2->id,
            'status'   => 'pending',
        ]);

        // Spots remaining should still be 2 because pending registrations don't consume capacity
        $this->assertEquals(2, $this->moderatedEvent->fresh()->spotsRemaining());

        // A third student can still apply
        $this->actingAs($this->user)
            ->postJson("/api/events/{$this->moderatedEvent->id}/register")
            ->assertStatus(201)
            ->assertJson(['status' => 'pending']);
    }

    public function test_executive_can_approve_pending_registration()
    {
        EventRegistration::create([
            'event_id' => $this->moderatedEvent->id,
            'user_id'  => $this->user->id,
            'status'   => 'pending',
        ]);

        $response = $this->actingAs($this->execUser)
            ->postJson("/api/events/{$this->moderatedEvent->id}/registrations/{$this->user->id}/approve");

        $response->assertStatus(200)
            ->assertJson(['message' => 'Registration successfully approved.']);

        $this->assertDatabaseHas('event_registrations', [
            'event_id' => $this->moderatedEvent->id,
            'user_id'  => $this->user->id,
            'status'   => 'approved',
        ]);

        // Approved registration now consumes capacity spot (1 spot remaining out of 2)
        $this->assertEquals(1, $this->moderatedEvent->fresh()->spotsRemaining());

        // Student receives approval notification
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->user->id,
            'type'    => 'event_registration_approved',
        ]);
    }

    public function test_executive_can_reject_pending_registration_with_reason()
    {
        EventRegistration::create([
            'event_id' => $this->moderatedEvent->id,
            'user_id'  => $this->user->id,
            'status'   => 'pending',
        ]);

        $reason = 'Did not meet technical wing experience requirements.';

        $response = $this->actingAs($this->execUser)
            ->postJson("/api/events/{$this->moderatedEvent->id}/registrations/{$this->user->id}/reject", [
                'reason' => $reason,
            ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'Registration request rejected.']);

        $this->assertDatabaseHas('event_registrations', [
            'event_id' => $this->moderatedEvent->id,
            'user_id'  => $this->user->id,
            'status'   => 'rejected',
        ]);

        // Notification sent with reason
        $notification = Notification::where('user_id', $this->user->id)
            ->where('type', 'event_registration_rejected')
            ->first();

        $this->assertNotNull($notification);
        $this->assertStringContainsString($reason, $notification->message);
    }

    public function test_rejected_student_can_reapply_for_event()
    {
        EventRegistration::create([
            'event_id' => $this->moderatedEvent->id,
            'user_id'  => $this->user->id,
            'status'   => 'rejected',
        ]);

        // Student re-applies
        $response = $this->actingAs($this->user)
            ->postJson("/api/events/{$this->moderatedEvent->id}/register");

        $response->assertStatus(201)
            ->assertJson([
                'status'  => 'pending',
                'message' => 'Registration request submitted! Awaiting executive review.',
            ]);

        // Check registration is now pending
        $this->assertDatabaseHas('event_registrations', [
            'event_id' => $this->moderatedEvent->id,
            'user_id'  => $this->user->id,
            'status'   => 'pending',
        ]);
    }

    public function test_non_executive_cannot_approve_or_reject_registrations()
    {
        $otherUser = $this->createUser();

        EventRegistration::create([
            'event_id' => $this->moderatedEvent->id,
            'user_id'  => $this->user->id,
            'status'   => 'pending',
        ]);

        $this->actingAs($otherUser)
            ->postJson("/api/events/{$this->moderatedEvent->id}/registrations/{$this->user->id}/approve")
            ->assertStatus(403);

        $this->actingAs($otherUser)
            ->postJson("/api/events/{$this->moderatedEvent->id}/registrations/{$this->user->id}/reject")
            ->assertStatus(403);
    }
}
