<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\ClubMember;
use App\Models\Event;
use App\Models\EventFeedback;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventFeedbackTest extends TestCase
{
    use RefreshDatabase;

    private User $creator;
    private User $student;
    private User $execUser;
    private User $admin;
    private Club $club;
    private Event $completedEvent;

    private function createUser(array $attributes = []): User
    {
        static $counter = 2000;
        $counter++;
        return User::factory()->create(array_merge([
            'student_id' => 'ASH190' . $counter . 'M',
            'department' => 'CSTE',
        ], $attributes));
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->creator = $this->createUser(['name' => 'Event Creator']);
        $this->student = $this->createUser(['name' => 'Student Attendee']);
        $this->execUser = $this->createUser(['name' => 'Club Executive']);
        $this->admin = $this->createUser(['name' => 'Platform Admin', 'is_admin' => true]);

        $this->club = Club::create([
            'name'          => 'Test Science Club',
            'description'   => 'A test club',
            'category'      => 'Academic',
            'department'    => 'Science',
            'contact_email' => 'scienceclub@test.edu',
            'reason'        => 'Test club creation',
            'status'        => 'approved',
            'created_by'    => $this->creator->id,
        ]);

        ClubMember::create([
            'club_id' => $this->club->id,
            'user_id' => $this->execUser->id,
            'role'    => 'president',
            'status'  => 'active',
        ]);

        $this->completedEvent = Event::create([
            'club_id'        => $this->club->id,
            'created_by'     => $this->creator->id,
            'title'          => 'Annual Tech Symposium',
            'description'    => 'Tech talks and workshops',
            'status'         => 'completed',
            'visibility'     => 'public',
            'location_type'  => 'physical',
            'location_value' => 'Auditorium A',
            'starts_at'      => now()->subDays(2),
            'ends_at'        => now()->subDays(1),
            'capacity'       => 100,
        ]);
    }

    public function test_non_attendee_cannot_submit_feedback()
    {
        $response = $this->actingAs($this->student)
            ->postJson("/api/events/{$this->completedEvent->id}/feedback", [
                'rating'  => 5,
                'comment' => 'Great event!',
            ]);

        $response->assertStatus(422)
            ->assertJson(['message' => 'Only users who attended this event can submit feedback.']);
    }

    public function test_event_creator_cannot_submit_feedback()
    {
        EventRegistration::create([
            'event_id' => $this->completedEvent->id,
            'user_id'  => $this->creator->id,
            'attended' => true,
        ]);

        $response = $this->actingAs($this->creator)
            ->postJson("/api/events/{$this->completedEvent->id}/feedback", [
                'rating'  => 5,
                'comment' => 'I loved my own event!',
            ]);

        $response->assertStatus(422)
            ->assertJson(['message' => 'Event creators cannot submit feedback for their own events.']);
    }

    public function test_cannot_submit_feedback_for_upcoming_event()
    {
        $upcomingEvent = Event::create([
            'club_id'        => $this->club->id,
            'created_by'     => $this->creator->id,
            'title'          => 'Upcoming Workshop',
            'status'         => 'published',
            'visibility'     => 'public',
            'location_type'  => 'physical',
            'location_value' => 'Room 101',
            'starts_at'      => now()->addDays(5),
            'ends_at'        => now()->addDays(5)->addHours(2),
            'capacity'       => 50,
        ]);

        EventRegistration::create([
            'event_id' => $upcomingEvent->id,
            'user_id'  => $this->student->id,
            'attended' => true,
        ]);

        $response = $this->actingAs($this->student)
            ->postJson("/api/events/{$upcomingEvent->id}/feedback", [
                'rating'  => 5,
                'comment' => 'Premature review!',
            ]);

        $response->assertStatus(422)
            ->assertJson(['message' => 'Feedback can only be submitted for completed events.']);
    }

    public function test_low_rating_can_be_submitted_without_min_comment_length()
    {
        EventRegistration::create([
            'event_id' => $this->completedEvent->id,
            'user_id'  => $this->student->id,
            'attended' => true,
        ]);

        $response = $this->actingAs($this->student)
            ->postJson("/api/events/{$this->completedEvent->id}/feedback", [
                'rating'  => 2,
                'comment' => 'Short',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'rating'  => 2,
                'comment' => 'Short',
            ]);
    }

    public function test_attended_user_can_submit_feedback_and_prevent_duplicates()
    {
        EventRegistration::create([
            'event_id' => $this->completedEvent->id,
            'user_id'  => $this->student->id,
            'attended' => true,
        ]);

        $response = $this->actingAs($this->student)
            ->postJson("/api/events/{$this->completedEvent->id}/feedback", [
                'rating'  => 5,
                'comment' => 'Extremely well-organized event! Inspiring speakers.',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'rating'  => 5,
                'comment' => 'Extremely well-organized event! Inspiring speakers.',
            ]);

        // Duplicate submission check
        $duplicateResponse = $this->actingAs($this->student)
            ->postJson("/api/events/{$this->completedEvent->id}/feedback", [
                'rating'  => 4,
                'comment' => 'Another review',
            ]);

        $duplicateResponse->assertStatus(422)
            ->assertJson(['message' => 'Feedback already submitted for this event.']);
    }

    public function test_user_can_update_and_delete_own_feedback()
    {
        EventRegistration::create([
            'event_id' => $this->completedEvent->id,
            'user_id'  => $this->student->id,
            'attended' => true,
        ]);

        EventFeedback::create([
            'event_id' => $this->completedEvent->id,
            'user_id'  => $this->student->id,
            'rating'   => 4,
            'comment'  => 'Good event overall, learned a lot.',
        ]);

        // Update
        $updateResponse = $this->actingAs($this->student)
            ->putJson("/api/events/{$this->completedEvent->id}/feedback", [
                'rating'  => 5,
                'comment' => 'Updated: Absolutely fantastic experience!',
            ]);

        $updateResponse->assertStatus(200)
            ->assertJson([
                'rating'  => 5,
                'comment' => 'Updated: Absolutely fantastic experience!',
            ]);

        // Delete
        $deleteResponse = $this->actingAs($this->student)
            ->deleteJson("/api/events/{$this->completedEvent->id}/feedback");

        $deleteResponse->assertStatus(200)
            ->assertJson(['message' => 'Feedback deleted.']);

        $this->assertDatabaseMissing('event_feedback', [
            'event_id' => $this->completedEvent->id,
            'user_id'  => $this->student->id,
        ]);
    }

    public function test_feedback_summary_calculation()
    {
        $u1 = $this->createUser();
        $u2 = $this->createUser();

        EventRegistration::create(['event_id' => $this->completedEvent->id, 'user_id' => $u1->id, 'attended' => true]);
        EventRegistration::create(['event_id' => $this->completedEvent->id, 'user_id' => $u2->id, 'attended' => true]);

        EventFeedback::create(['event_id' => $this->completedEvent->id, 'user_id' => $u1->id, 'rating' => 5, 'comment' => 'Perfect']);
        EventFeedback::create(['event_id' => $this->completedEvent->id, 'user_id' => $u2->id, 'rating' => 3, 'comment' => 'Average']);

        $response = $this->actingAs($u1)
            ->getJson("/api/events/{$this->completedEvent->id}/feedback/summary");

        $response->assertStatus(200)
            ->assertJson([
                'average_rating' => 4.0,
                'total_reviews'  => 2,
                'rating_distribution' => [
                    '5' => 1,
                    '4' => 0,
                    '3' => 1,
                    '2' => 0,
                    '1' => 0,
                ],
            ]);
    }

    public function test_exec_views_feedback_with_user_details()
    {
        EventRegistration::create(['event_id' => $this->completedEvent->id, 'user_id' => $this->student->id, 'attended' => true]);

        EventFeedback::create([
            'event_id' => $this->completedEvent->id,
            'user_id'  => $this->student->id,
            'rating'   => 4,
            'comment'  => 'Constructive feedback from attendee',
        ]);

        $execResponse = $this->actingAs($this->execUser)
            ->getJson("/api/events/{$this->completedEvent->id}/feedback");

        $execResponse->assertStatus(200)
            ->assertJsonFragment([
                'name' => 'Student Attendee',
            ]);
    }

    public function test_registered_only_policy_allows_unattended_registered_users()
    {
        $regEvent = Event::create([
            'club_id'         => $this->club->id,
            'created_by'      => $this->creator->id,
            'title'           => 'Large Concert',
            'status'          => 'completed',
            'visibility'      => 'public',
            'location_type'   => 'physical',
            'location_value'  => 'Main Campus Field',
            'starts_at'       => now()->subDays(2),
            'ends_at'         => now()->subDays(1),
            'capacity'        => 500,
            'feedback_policy' => 'registered_only',
        ]);

        EventRegistration::create([
            'event_id' => $regEvent->id,
            'user_id'  => $this->student->id,
            'attended' => false,
        ]);

        $response = $this->actingAs($this->student)
            ->postJson("/api/events/{$regEvent->id}/feedback", [
                'rating'  => 5,
                'comment' => 'Amazing concert!',
            ]);

        $response->assertStatus(201)
            ->assertJson(['rating' => 5]);
    }

    public function test_open_to_all_policy_allows_unregistered_students()
    {
        $openEvent = Event::create([
            'club_id'         => $this->club->id,
            'created_by'      => $this->creator->id,
            'title'           => 'Open Orientation',
            'status'          => 'completed',
            'visibility'      => 'public',
            'location_type'   => 'physical',
            'location_value'  => 'Auditorium B',
            'starts_at'       => now()->subDays(2),
            'ends_at'         => now()->subDays(1),
            'capacity'        => 1000,
            'feedback_policy' => 'open_to_all',
        ]);

        $response = $this->actingAs($this->student)
            ->postJson("/api/events/{$openEvent->id}/feedback", [
                'rating'  => 4,
                'comment' => 'Walked in and loved the talks!',
            ]);

        $response->assertStatus(201)
            ->assertJson(['rating' => 4]);
    }
}
