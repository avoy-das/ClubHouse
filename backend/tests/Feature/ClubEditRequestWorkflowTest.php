<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\ClubEditRequest;
use App\Models\ClubMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClubEditRequestWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_executive_submits_club_edit_request_for_admin_approval()
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $execUser = User::factory()->create(['is_admin' => false]);
        $memberUser = User::factory()->create(['is_admin' => false]);

        $club = Club::create([
            'name'          => 'Robotics & AI Club',
            'category'      => 'Technology',
            'description'   => 'Original description before edit request.',
            'reason'        => 'Creation reason',
            'status'        => 'approved',
            'created_by'    => $admin->id,
            'contact_email' => 'robotics@clubhouse.ac.bd',
        ]);

        ClubMember::create([
            'club_id' => $club->id,
            'user_id' => $execUser->id,
            'role'    => 'president',
            'status'  => 'active',
        ]);

        ClubMember::create([
            'club_id' => $club->id,
            'user_id' => $memberUser->id,
            'role'    => 'member',
            'status'  => 'active',
        ]);

        // 1. Executive submits edit request
        $response = $this->actingAs($execUser, 'sanctum')
            ->postJson("/api/clubs/{$club->id}/edit-requests", [
                'name'          => 'Advanced Robotics & AI Society',
                'category'      => 'Technology',
                'description'   => 'Updated vision and mission for 2026.',
                'contact_email' => 'advanced.robotics@clubhouse.ac.bd',
                'reason'        => 'Rebranding to align with international competitions.',
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['message' => 'Club edit request submitted successfully. An administrator will review and approve your changes.']);

        // Check club is NOT updated yet
        $this->assertEquals('Robotics & AI Club', $club->fresh()->name);

        // Check club_edit_requests database record
        $this->assertDatabaseHas('club_edit_requests', [
            'club_id'      => $club->id,
            'requested_by' => $execUser->id,
            'name'         => 'Advanced Robotics & AI Society',
            'status'       => 'pending',
        ]);

        // Check admin notification
        $this->assertDatabaseHas('notifications', [
            'user_id' => $admin->id,
            'type'    => 'club_edit_request',
        ]);

        $editRequest = ClubEditRequest::first();

        // 2. Admin approves the edit request
        $approveResponse = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/club-edit-requests/{$editRequest->id}/approve");

        $approveResponse->assertStatus(200);

        // Check club IS now updated
        $this->assertEquals('Advanced Robotics & AI Society', $club->fresh()->name);
        $this->assertEquals('Updated vision and mission for 2026.', $club->fresh()->description);

        // Check executive notification
        $this->assertDatabaseHas('notifications', [
            'user_id' => $execUser->id,
            'type'    => 'club_edit_approved',
        ]);

        // Check ALL active members receive notification of club update
        $this->assertDatabaseHas('notifications', [
            'user_id' => $memberUser->id,
            'type'    => 'club_updated',
        ]);
    }

    public function test_admin_rejects_club_edit_request_with_reason()
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $execUser = User::factory()->create(['is_admin' => false]);

        $club = Club::create([
            'name'          => 'Debate Society',
            'category'      => 'Arts',
            'description'   => 'Original description.',
            'reason'        => 'Creation reason',
            'status'        => 'approved',
            'created_by'    => $admin->id,
            'contact_email' => 'debate@clubhouse.ac.bd',
        ]);

        ClubMember::create([
            'club_id' => $club->id,
            'user_id' => $execUser->id,
            'role'    => 'vice_president',
            'status'  => 'active',
        ]);

        $editRequest = ClubEditRequest::create([
            'club_id'       => $club->id,
            'requested_by'  => $execUser->id,
            'name'          => 'Invalid Name Change',
            'category'      => 'Arts',
            'description'   => 'New description',
            'contact_email' => 'debate@clubhouse.ac.bd',
            'reason'        => 'Name update',
            'status'        => 'pending',
        ]);

        // Admin rejects request
        $rejectResponse = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/club-edit-requests/{$editRequest->id}/reject", [
                'rejection_reason' => 'Official club names must be pre-approved by student governance.',
            ]);

        $rejectResponse->assertStatus(200);

        // Check edit request status = rejected
        $this->assertEquals('rejected', $editRequest->fresh()->status);
        $this->assertEquals('Official club names must be pre-approved by student governance.', $editRequest->fresh()->rejection_reason);

        // Check club details remain unchanged
        $this->assertEquals('Debate Society', $club->fresh()->name);

        // Check executive notified of rejection with reason
        $this->assertDatabaseHas('notifications', [
            'user_id' => $execUser->id,
            'type'    => 'club_edit_rejected',
        ]);
    }
}
