<?php

namespace Tests\Feature;

use App\Models\Club;
use App\Models\ClubMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClubRoleHierarchyTest extends TestCase
{
    use RefreshDatabase;

    private function createTestClub(): Club
    {
        static $c = 1;
        $c++;
        $creator = User::factory()->create();
        return Club::create([
            'name'          => 'Test Club ' . $c,
            'description'   => 'Test description',
            'category'      => 'Academic',
            'contact_email' => "testclub{$c}@nstu.edu.bd",
            'reason'        => 'Testing hierarchy',
            'status'        => 'approved',
            'created_by'    => $creator->id,
        ]);
    }

    public function test_vice_president_cannot_modify_own_role(): void
    {
        $vpUser = User::factory()->create();
        $club = $this->createTestClub();
        
        ClubMember::create([
            'club_id'   => $club->id,
            'user_id'   => $vpUser->id,
            'role'      => 'vice_president',
            'joined_at' => now(),
        ]);

        $response = $this->actingAs($vpUser)
            ->patchJson("/api/clubs/{$club->id}/members/{$vpUser->id}/role", [
                'role' => 'treasurer',
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'You cannot modify your own role in the club.');

        $this->assertDatabaseHas('club_members', [
            'club_id' => $club->id,
            'user_id' => $vpUser->id,
            'role'    => 'vice_president',
        ]);
    }

    public function test_treasurer_cannot_promote_member_to_vice_president_or_president(): void
    {
        $treasurerUser = User::factory()->create();
        $memberUser = User::factory()->create();
        $club = $this->createTestClub();

        ClubMember::create([
            'club_id'   => $club->id,
            'user_id'   => $treasurerUser->id,
            'role'      => 'treasurer',
            'joined_at' => now(),
        ]);

        ClubMember::create([
            'club_id'   => $club->id,
            'user_id'   => $memberUser->id,
            'role'      => 'member',
            'joined_at' => now(),
        ]);

        // Attempting to promote member to Vice President as a Treasurer
        $response = $this->actingAs($treasurerUser)
            ->patchJson("/api/clubs/{$club->id}/members/{$memberUser->id}/role", [
                'role' => 'vice_president',
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'You cannot assign or promote a member to a role rank equal to or higher than your own rank.');

        $this->assertDatabaseHas('club_members', [
            'club_id' => $club->id,
            'user_id' => $memberUser->id,
            'role'    => 'member',
        ]);
    }

    public function test_president_can_promote_member_to_vice_president(): void
    {
        $presidentUser = User::factory()->create();
        $memberUser = User::factory()->create();
        $club = $this->createTestClub();

        ClubMember::create([
            'club_id'   => $club->id,
            'user_id'   => $presidentUser->id,
            'role'      => 'president',
            'joined_at' => now(),
        ]);

        ClubMember::create([
            'club_id'   => $club->id,
            'user_id'   => $memberUser->id,
            'role'      => 'member',
            'joined_at' => now(),
        ]);

        $response = $this->actingAs($presidentUser)
            ->patchJson("/api/clubs/{$club->id}/members/{$memberUser->id}/role", [
                'role' => 'vice_president',
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('club_members', [
            'club_id' => $club->id,
            'user_id' => $memberUser->id,
            'role'    => 'vice_president',
        ]);
    }

    public function test_treasurer_cannot_remove_vice_president(): void
    {
        $treasurerUser = User::factory()->create();
        $vpUser = User::factory()->create();
        $club = $this->createTestClub();

        ClubMember::create([
            'club_id'   => $club->id,
            'user_id'   => $treasurerUser->id,
            'role'      => 'treasurer',
            'joined_at' => now(),
        ]);

        ClubMember::create([
            'club_id'   => $club->id,
            'user_id'   => $vpUser->id,
            'role'      => 'vice_president',
            'joined_at' => now(),
        ]);

        $response = $this->actingAs($treasurerUser)
            ->deleteJson("/api/clubs/{$club->id}/members/{$vpUser->id}");

        $response->assertStatus(403)
            ->assertJsonPath('message', 'Only higher ranks can control members of lower ranks. You cannot remove a member with an equal or higher rank.');
    }

    public function test_admin_cannot_override_internal_club_role_hierarchy(): void
    {
        $adminUser = User::factory()->create(['is_admin' => true]);
        $memberUser = User::factory()->create();
        $club = $this->createTestClub();

        ClubMember::create([
            'club_id'   => $club->id,
            'user_id'   => $memberUser->id,
            'role'      => 'member',
            'joined_at' => now(),
        ]);

        $response = $this->actingAs($adminUser)
            ->patchJson("/api/clubs/{$club->id}/members/{$memberUser->id}/role", [
                'role' => 'president',
            ]);

        $response->assertStatus(403);
    }
}
