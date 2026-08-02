<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\ClubMember;
use App\Models\RecruitmentApplication;
use App\Models\RecruitmentNotice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecruitmentApplicationTest extends TestCase
{
    use RefreshDatabase;

    private User $applicant;
    private User $memberUser;
    private Club $club;
    private RecruitmentNotice $notice;

    private function createUser(array $attributes = []): User
    {
        static $counter = 3000;
        $counter++;
        return User::factory()->create(array_merge([
            'student_id' => 'ASH190' . $counter . 'M',
            'department' => 'CSTE',
        ], $attributes));
    }

    protected function setUp(): void
    {
        parent::setUp();

        $creator = $this->createUser();
        $this->applicant = $this->createUser();
        $this->memberUser = $this->createUser();

        $this->club = Club::create([
            'name'          => 'Robotics Club',
            'description'   => 'A robotics club',
            'category'      => 'Technology',
            'department'    => 'CSTE',
            'contact_email' => 'robotics@test.edu',
            'reason'        => 'Test club creation',
            'status'        => 'approved',
            'created_by'    => $creator->id,
        ]);

        ClubMember::create([
            'club_id'   => $this->club->id,
            'user_id'   => $this->memberUser->id,
            'role'      => 'member',
            'status'    => 'active',
            'joined_at' => now(),
        ]);

        $this->notice = RecruitmentNotice::create([
            'club_id'     => $this->club->id,
            'created_by'  => $creator->id,
            'title'       => 'Robotics Member Recruitment 2026',
            'description' => 'Join the robotics team.',
            'status'      => 'open',
            'opens_at'    => now()->subDay(),
            'closes_at'   => now()->addDays(7),
        ]);
    }

    public function test_user_can_submit_recruitment_application_once(): void
    {
        $response = $this->actingAs($this->applicant)
            ->postJson("/api/recruitment-notices/{$this->notice->id}/apply", [
                'answers' => ['motivation' => 'I love robots!'],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'pending');

        $this->assertDatabaseHas('recruitment_applications', [
            'recruitment_notice_id' => $this->notice->id,
            'user_id'               => $this->applicant->id,
        ]);
    }

    public function test_user_cannot_submit_duplicate_application_for_same_recruitment(): void
    {
        RecruitmentApplication::create([
            'recruitment_notice_id' => $this->notice->id,
            'user_id'               => $this->applicant->id,
            'status'                => 'pending',
            'answers'               => ['motivation' => 'First attempt'],
        ]);

        $response = $this->actingAs($this->applicant)
            ->postJson("/api/recruitment-notices/{$this->notice->id}/apply", [
                'answers' => ['motivation' => 'Second attempt'],
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'You have already submitted an application for this recruitment campaign. Candidates are permitted to apply only once per recruitment campaign.');
    }

    public function test_active_club_member_cannot_apply_for_recruitment(): void
    {
        $response = $this->actingAs($this->memberUser)
            ->postJson("/api/recruitment-notices/{$this->notice->id}/apply", [
                'answers' => ['motivation' => 'I am already a member.'],
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'You are already an active member of this club. Recruitment is reserved for new applicants.');
    }
}
