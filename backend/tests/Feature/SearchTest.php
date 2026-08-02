<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\ClubMember;
use App\Models\Event;
use App\Models\RecruitmentNotice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SearchTest extends TestCase
{
    use RefreshDatabase;

    private function createUser(array $attributes = []): User
    {
        static $counter = 1000;
        $counter++;
        return User::factory()->create(array_merge([
            'student_id' => 'ASH190' . $counter . 'M',
            'department' => 'CSTE',
        ], $attributes));
    }

    private function createClub(array $attributes = []): Club
    {
        static $counter = 100;
        $counter++;
        return Club::create(array_merge([
            'name'          => 'Basketball Club ' . $counter,
            'description'   => 'University basketball team and community',
            'category'      => 'Sports',
            'department'    => 'CSTE',
            'contact_email' => 'club' . $counter . '@student.nstu.edu.bd',
            'reason'        => 'Establish sports organization',
            'status'        => 'approved',
        ], $attributes));
    }

    public function test_search_requires_minimum_2_characters(): void
    {
        $user = $this->createUser();
        Sanctum::actingAs($user);

        // Empty query
        $response = $this->getJson('/api/search?q=');
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['q']);

        // 1-character query
        $response1 = $this->getJson('/api/search?q=a');
        $response1->assertStatus(422)
            ->assertJsonValidationErrors(['q']);
    }

    public function test_student_search_returns_clubs_events_and_open_recruitment_without_members(): void
    {
        $student = $this->createUser(['is_admin' => false]);
        Sanctum::actingAs($student);

        $club = $this->createClub(['name' => 'Basketball Club', 'created_by' => $student->id]);

        Event::create([
            'club_id'        => $club->id,
            'title'          => 'Basketball Tournament',
            'description'    => 'Inter-department basketball cup',
            'location_type'  => 'physical',
            'location_value' => 'Main Gymnasium',
            'starts_at'      => now()->addDays(2),
            'ends_at'        => now()->addDays(2)->addHours(4),
            'capacity'       => 100,
            'status'         => 'published',
            'created_by'     => $student->id,
        ]);

        RecruitmentNotice::create([
            'club_id'     => $club->id,
            'title'       => 'Basketball Player Recruitment',
            'description' => 'Join the varsity basketball roster',
            'status'      => 'open',
            'opens_at'    => now(),
            'closes_at'   => now()->addDays(7),
            'created_by'  => $student->id,
        ]);

        RecruitmentNotice::create([
            'club_id'     => $club->id,
            'title'       => 'Basketball Executive Draft',
            'description' => 'Internal draft for executive positions',
            'status'      => 'draft',
            'opens_at'    => now(),
            'closes_at'   => now()->addDays(7),
            'created_by'  => $student->id,
        ]);

        $response = $this->getJson('/api/search?q=basketball');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'clubs')
            ->assertJsonCount(1, 'events')
            ->assertJsonCount(1, 'recruitment') // only open status
            ->assertJsonMissingPath('members');
    }

    public function test_admin_search_returns_all_categories_including_members_and_all_recruitment_statuses(): void
    {
        $admin = $this->createUser(['is_admin' => true, 'name' => 'Basketball Coordinator']);
        Sanctum::actingAs($admin);

        $club = $this->createClub(['name' => 'Basketball Club', 'created_by' => $admin->id]);

        RecruitmentNotice::create([
            'club_id'     => $club->id,
            'title'       => 'Basketball Open Notice',
            'description' => 'Notice description',
            'status'      => 'open',
            'opens_at'    => now(),
            'closes_at'   => now()->addDays(7),
            'created_by'  => $admin->id,
        ]);

        RecruitmentNotice::create([
            'club_id'     => $club->id,
            'title'       => 'Basketball Closed Notice',
            'description' => 'Notice description',
            'status'      => 'closed',
            'opens_at'    => now(),
            'closes_at'   => now()->addDays(7),
            'created_by'  => $admin->id,
        ]);

        $response = $this->getJson('/api/search?q=basketball');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'clubs')
            ->assertJsonCount(2, 'recruitment') // open and closed for admin
            ->assertJsonCount(1, 'members');    // includes admin matching 'Basketball Coordinator'
    }

    public function test_contextual_member_search(): void
    {
        $user1 = $this->createUser(['name' => 'Michael Jordan', 'student_id' => 'MJ23000']);
        $user2 = $this->createUser(['name' => 'LeBron James', 'student_id' => 'LJ06000']);

        $club = $this->createClub(['created_by' => $user1->id]);

        ClubMember::create(['club_id' => $club->id, 'user_id' => $user1->id, 'role' => 'president', 'joined_at' => now()]);
        ClubMember::create(['club_id' => $club->id, 'user_id' => $user2->id, 'role' => 'member', 'joined_at' => now()]);

        Sanctum::actingAs($user1);
        $response = $this->getJson("/api/clubs/{$club->id}/members?q=Jordan");
        $response->assertStatus(200)
            ->assertJsonCount(1);
    }
}
