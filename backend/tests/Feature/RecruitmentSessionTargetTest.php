<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\ClubMember;
use App\Models\RecruitmentNotice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecruitmentSessionTargetTest extends TestCase
{
    use RefreshDatabase;

    private function createClub(array $attributes = []): Club
    {
        $id = rand(1000, 9999);
        $creator = User::factory()->create();
        return Club::create(array_merge([
            'name'          => 'Test Club ' . $id,
            'description'   => 'Test Club Description',
            'category'      => 'Academic',
            'contact_email' => "club{$id}@nstu.edu.bd",
            'reason'        => 'Test club creation',
            'status'        => 'approved',
            'created_by'    => $creator->id,
        ], $attributes));
    }

    public function test_executive_can_create_recruitment_campaign_with_session_and_target_sessions(): void
    {
        $club = $this->createClub();
        $executive = User::factory()->create(['session' => 22]);
        ClubMember::create([
            'club_id'   => $club->id,
            'user_id'   => $executive->id,
            'role'      => 'president',
            'status'    => 'active',
            'joined_at' => now(),
        ]);

        $targetUser1 = User::factory()->create(['session' => 23]);
        $targetUser2 = User::factory()->create(['session' => 24]);
        $nonTargetUser = User::factory()->create(['session' => 25]);

        $this->actingAs($executive);

        $response = $this->postJson("/api/clubs/{$club->id}/recruitment-notices", [
            'title'           => 'CSE Club Recruitment 2026',
            'session'         => '26',
            'target_sessions' => [23, 24],
            'description'     => 'Join our team!',
            'opens_at'        => now()->toIso8601String(),
            'closes_at'       => now()->addDays(7)->toIso8601String(),
        ]);

        $response->assertStatus(201);
        $noticeId = $response->json('id');

        $this->assertDatabaseHas('recruitment_notices', [
            'id'      => $noticeId,
            'session' => '26',
        ]);

        // Verify targeted notifications
        $this->assertDatabaseHas('notifications', [
            'user_id' => $targetUser1->id,
            'type'    => 'recruitment_opened',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $targetUser2->id,
            'type'    => 'recruitment_opened',
        ]);
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $nonTargetUser->id,
            'type'    => 'recruitment_opened',
        ]);
    }

    public function test_only_one_recruitment_per_session_allowed_for_club(): void
    {
        $club = $this->createClub();
        $executive = User::factory()->create();
        ClubMember::create([
            'club_id'   => $club->id,
            'user_id'   => $executive->id,
            'role'      => 'president',
            'status'    => 'active',
            'joined_at' => now(),
        ]);

        RecruitmentNotice::create([
            'club_id'     => $club->id,
            'title'       => 'Spring 2026 Recruitment',
            'session'     => '26',
            'opens_at'    => now()->subDays(10),
            'closes_at'   => now()->subDays(2),
            'status'      => 'closed',
            'created_by'  => $executive->id,
        ]);

        $this->actingAs($executive);

        $response = $this->postJson("/api/clubs/{$club->id}/recruitment-notices", [
            'title'           => 'Second Recruitment Same Session',
            'session'         => '26',
            'target_sessions' => [23, 24],
            'description'     => 'Duplicate test',
            'opens_at'        => now()->toIso8601String(),
            'closes_at'       => now()->addDays(7)->toIso8601String(),
        ]);

        $response->assertStatus(422)
            ->assertJsonFragment([
                'message' => "A recruitment campaign for session '26' already exists for '{$club->name}'. Only one recruitment campaign per year/session is allowed."
            ]);
    }

    public function test_user_outside_target_sessions_cannot_apply(): void
    {
        $club = $this->createClub();
        $executive = User::factory()->create();
        ClubMember::create([
            'club_id'   => $club->id,
            'user_id'   => $executive->id,
            'role'      => 'president',
            'status'    => 'active',
            'joined_at' => now(),
        ]);

        $notice = RecruitmentNotice::create([
            'club_id'         => $club->id,
            'title'           => 'Fall 2026 Recruitment',
            'session'         => '26',
            'target_sessions' => [23, 24],
            'description'     => 'Join us',
            'opens_at'        => now()->subDay(),
            'closes_at'       => now()->addDays(5),
            'status'          => 'open',
            'created_by'      => $executive->id,
        ]);

        $eligibleUser = User::factory()->create(['session' => 23]);
        $ineligibleUser = User::factory()->create(['session' => 25]);

        // Eligible user applies successfully
        $this->actingAs($eligibleUser);
        $res1 = $this->postJson("/api/recruitment-notices/{$notice->id}/apply", [
            'answers' => ['motivation' => 'I love this club'],
        ]);
        $res1->assertStatus(201);

        // Ineligible user is rejected with 422
        $this->actingAs($ineligibleUser);
        $res2 = $this->postJson("/api/recruitment-notices/{$notice->id}/apply", [
            'answers' => ['motivation' => 'I want to join'],
        ]);
        $res2->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'Your academic session is not eligible to apply for this recruitment campaign.'
            ]);
    }
}
