<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Club;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditLogSystemTest extends TestCase
{
    use RefreshDatabase;

    public function test_no_dual_write_on_club_approval(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $club = Club::create([
            'name'          => 'Robotics Club',
            'category'      => 'Technology',
            'description'   => 'Robotics enthusiasts',
            'contact_email' => 'robotics@student.nstu.edu.bd',
            'contact_phone' => '01700000000',
            'reason'        => 'Tech innovation',
            'status'        => 'pending',
            'created_by'    => $admin->id,
        ]);

        AuditLog::query()->delete();

        $this->actingAs($admin)
            ->postJson("/api/clubs/{$club->id}/approve");

        $logs = AuditLog::where('target_type', 'Club')->where('target_id', $club->id)->get();
        $this->assertCount(1, $logs);
        $this->assertEquals('club.approved', $logs->first()->action);
        $this->assertEquals($club->id, $logs->first()->club_id);
        $this->assertEquals('admin', $logs->first()->actor_role);
    }

    public function test_recruitment_actions_use_two_level_dot_notation(): void
    {
        $exec = User::factory()->create();
        $club = Club::create([
            'name'          => 'Coding Club',
            'category'      => 'Technology',
            'description'   => 'Coding enthusiasts',
            'contact_email' => 'coding@student.nstu.edu.bd',
            'contact_phone' => '01700000001',
            'reason'        => 'Programming innovation',
            'status'        => 'active',
            'created_by'    => $exec->id,
        ]);
        $club->members()->create(['user_id' => $exec->id, 'role' => 'president', 'status' => 'active']);

        AuditLog::query()->delete();

        $response = $this->actingAs($exec)->postJson("/api/clubs/{$club->id}/recruitment-notices", [
            'title'           => 'Spring Recruitment 2026',
            'description'     => 'Join our creative team!',
            'session'         => '2024',
            'target_sessions' => [20, 21],
            'opens_at'        => now()->toDateTimeString(),
            'closes_at'       => now()->addDays(7)->toDateTimeString(),
        ]);

        $response->assertStatus(201);

        $log = AuditLog::where('action', 'recruitment.notice_created')->first();
        $this->assertNotNull($log);
        $this->assertEquals($club->id, $log->club_id);
        $this->assertEquals('executive', $log->actor_role);
    }

    public function test_target_label_resolves_human_readable_name(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $club = Club::create([
            'name'          => 'NSTU Debate Club',
            'category'      => 'Cultural',
            'description'   => 'Debating society',
            'contact_email' => 'debate@student.nstu.edu.bd',
            'contact_phone' => '01700000002',
            'reason'        => 'Debate excellence',
            'status'        => 'active',
            'created_by'    => $admin->id,
        ]);

        AuditService::log('club.updated', $club, ['name' => $club->name]);

        $log = AuditLog::where('action', 'club.updated')->first();
        $this->assertEquals('NSTU Debate Club', $log->target_label);

        $response = $this->actingAs($admin)->getJson('/api/admin/audit-logs');
        $response->assertStatus(200)
            ->assertJsonFragment(['target_label' => 'NSTU Debate Club']);
    }

    public function test_executive_audit_feed_excludes_auth_and_admin_actions(): void
    {
        $exec = User::factory()->create();
        $club = Club::create([
            'name'          => 'Robotics Club',
            'category'      => 'Technology',
            'description'   => 'Robotics team',
            'contact_email' => 'robotics2@student.nstu.edu.bd',
            'contact_phone' => '01700000003',
            'reason'        => 'Robotics',
            'status'        => 'active',
            'created_by'    => $exec->id,
        ]);
        $club->members()->create(['user_id' => $exec->id, 'role' => 'president', 'status' => 'active']);

        AuditLog::query()->delete();

        // 1. Log operational club activity (Allowed)
        AuditService::log('club.updated', $club, ['name' => $club->name], $exec->id, $club->id);

        // 2. Log auth activity (Must be excluded from exec view)
        AuditService::log('auth.profile.updated', $exec, ['name' => 'New Name'], $exec->id, $club->id);

        // 3. Log admin override (Must be excluded from exec view)
        AuditService::log('admin.user_deactivated', $exec, ['reason' => 'Admin ban'], $exec->id, $club->id);

        $response = $this->actingAs($exec)->getJson("/api/clubs/{$club->id}/audit-logs");
        $response->assertStatus(200);

        $actions = collect($response->json('data'))->pluck('action')->toArray();
        $this->assertContains('club.updated', $actions);
        $this->assertNotContains('auth.profile.updated', $actions);
        $this->assertNotContains('admin.user_deactivated', $actions);
    }
}
