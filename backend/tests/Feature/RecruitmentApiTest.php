<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\ClubMember;
use App\Models\RecruitmentApplication;
use App\Models\RecruitmentNotice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecruitmentApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $executive;
    private User $applicant;
    private User $existingMember;
    private Club $club;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['is_admin' => true, 'session' => 20]);
        $this->executive = User::factory()->create(['session' => 21]);
        $this->applicant = User::factory()->create(['session' => 24]);
        $this->existingMember = User::factory()->create(['session' => 23]);

        $this->club = Club::create([
            'name'          => 'Computer Club',
            'description'   => 'A computer science club',
            'category'      => 'Technology',
            'department'    => 'CSE',
            'contact_email' => 'computerclub@test.edu',
            'reason'        => 'Creation reason',
            'status'        => 'approved',
            'created_by'    => $this->executive->id,
        ]);

        ClubMember::create([
            'club_id'   => $this->club->id,
            'user_id'   => $this->executive->id,
            'role'      => 'president',
            'status'    => 'active',
            'joined_at' => now(),
        ]);

        ClubMember::create([
            'club_id'   => $this->club->id,
            'user_id'   => $this->existingMember->id,
            'role'      => 'member',
            'status'    => 'active',
            'joined_at' => now(),
        ]);
    }

    public function test_full_recruitment_lifecycle_api_workflow(): void
    {
        // 1. Executive creates a recruitment notice
        $createResponse = $this->actingAs($this->executive)
            ->postJson("/api/clubs/{$this->club->id}/recruitment-notices", [
                'title'             => 'Annual Executive Recruitment 2026',
                'description'       => 'We are hiring new members.',
                'requirements'      => 'Passion for tech',
                'session'           => '26',
                'target_sessions'   => [24, 25],
                'opens_at'          => now()->subHour()->toIso8601String(),
                'closes_at'         => now()->addDays(7)->toIso8601String(),
                'pipeline_template' => 'simple',
            ]);

        $createResponse->assertStatus(201)
            ->assertJsonPath('title', 'Annual Executive Recruitment 2026');

        $noticeId = $createResponse->json('id');

        // 2. Fetch list of recruitment notices as Admin
        $listResponse = $this->actingAs($this->admin)
            ->getJson('/api/recruitment-notices');

        $listResponse->assertStatus(200);
        $this->assertNotEmpty($listResponse->json());

        // 3. Fetch recruitment notices specifically for the club
        $clubNoticesResponse = $this->actingAs($this->executive)
            ->getJson("/api/clubs/{$this->club->id}/recruitment-notices");

        $clubNoticesResponse->assertStatus(200)
            ->assertJsonCount(1);

        // 4. View single recruitment notice details as Applicant
        $showResponse = $this->actingAs($this->applicant)
            ->getJson("/api/recruitment-notices/{$noticeId}");

        $showResponse->assertStatus(200)
            ->assertJsonPath('id', $noticeId)
            ->assertJsonPath('is_member', false);

        // 5. Update recruitment notice details as Executive
        $updateResponse = $this->actingAs($this->executive)
            ->putJson("/api/recruitment-notices/{$noticeId}", [
                'title'       => 'Updated Annual Recruitment 2026',
                'description' => 'Updated description.',
                'opens_at'    => now()->subHour()->toIso8601String(),
                'closes_at'   => now()->addDays(10)->toIso8601String(),
            ]);

        $updateResponse->assertStatus(200)
            ->assertJsonPath('title', 'Updated Annual Recruitment 2026');

        // 6. Applicant submits application
        $applyResponse = $this->actingAs($this->applicant)
            ->postJson("/api/recruitment-notices/{$noticeId}/apply", [
                'answers' => ['why_join' => 'I love building software.'],
            ]);

        $applyResponse->assertStatus(201)
            ->assertJsonPath('status', 'submitted');

        $applicationId = $applyResponse->json('id');

        // 7. Executive views applications for the recruitment notice
        $applicationsResponse = $this->actingAs($this->executive)
            ->getJson("/api/recruitment-notices/{$noticeId}/applications");

        $applicationsResponse->assertStatus(200)
            ->assertJsonCount(1);

        // 8. Executive reviews and updates application status
        $reviewResponse = $this->actingAs($this->executive)
            ->patchJson("/api/recruitment-applications/{$applicationId}", [
                'status' => 'accepted',
            ]);

        $reviewResponse->assertStatus(200)
            ->assertJsonPath('status', 'accepted');

        // 9. Executive deletes the recruitment notice
        $deleteResponse = $this->actingAs($this->executive)
            ->deleteJson("/api/recruitment-notices/{$noticeId}");

        $deleteResponse->assertStatus(200);

        $this->assertDatabaseMissing('recruitment_notices', ['id' => $noticeId]);
    }
}
