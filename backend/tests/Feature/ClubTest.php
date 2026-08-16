<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClubTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_club_without_department(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/clubs', [
            'name'          => 'Robotics & AI Club',
            'category'      => 'Technology',
            'description'   => 'A club for robotics enthusiasts across all departments.',
            'contact_email' => 'robotics@student.nstu.edu.bd',
            'contact_phone' => '01700000000',
            'reason'        => 'Fostering tech innovation across campus.',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('club.department', null);

        $this->assertDatabaseHas('clubs', [
            'name'       => 'Robotics & AI Club',
            'department' => null,
            'status'     => 'pending',
        ]);
    }

    public function test_user_can_create_club_with_department(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/clubs', [
            'name'          => 'CSTE Software Club',
            'category'      => 'Academic',
            'description'   => 'Club specifically for CSTE department developers.',
            'department'    => 'CSTE',
            'contact_email' => 'cste.dev@student.nstu.edu.bd',
            'reason'        => 'Departmental coding workshops.',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('club.department', 'CSTE');

        $this->assertDatabaseHas('clubs', [
            'name'       => 'CSTE Software Club',
            'department' => 'CSTE',
            'status'     => 'pending',
        ]);
    }

    public function test_user_receives_notification_on_club_request(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/clubs', [
            'name'          => 'Cyber Security Club',
            'category'      => 'Technology',
            'description'   => 'Security lab and ethical hacking.',
            'contact_email' => 'cyber@student.nstu.edu.bd',
            'reason'        => 'Promote cyber security awareness.',
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'type'    => 'club_creation_request_submitted',
        ]);
    }

    public function test_user_can_see_own_pending_club_in_clubs_list(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        $this->actingAs($user1)->postJson('/api/clubs', [
            'name'          => 'Pending Club User 1',
            'category'      => 'Technology',
            'description'   => 'Pending club description',
            'contact_email' => 'user1@student.nstu.edu.bd',
            'reason'        => 'Reason',
        ]);

        // User 1 sees their pending club
        $res1 = $this->actingAs($user1)->getJson('/api/clubs');
        $res1->assertStatus(200)->assertJsonFragment(['name' => 'Pending Club User 1']);

        // User 2 does NOT see User 1's pending club
        $res2 = $this->actingAs($user2)->getJson('/api/clubs');
        $res2->assertStatus(200)->assertJsonMissing(['name' => 'Pending Club User 1']);
    }

    public function test_rejected_clubs_are_excluded_from_clubs_list(): void
    {
        $user = User::factory()->create();
        $admin = User::factory()->create(['is_admin' => true]);

        $club = \App\Models\Club::create([
            'name'          => 'Rejected Test Club',
            'category'      => 'Technology',
            'description'   => 'Rejected club description',
            'contact_email' => 'rejected@student.nstu.edu.bd',
            'reason'        => 'Reason',
            'status'        => 'rejected',
            'created_by'    => $user->id,
        ]);

        // Neither user nor admin sees rejected clubs in main list
        $userRes = $this->actingAs($user)->getJson('/api/clubs');
        $userRes->assertStatus(200)->assertJsonMissing(['name' => 'Rejected Test Club']);

        $adminRes = $this->actingAs($admin)->getJson('/api/clubs');
        $adminRes->assertStatus(200)->assertJsonMissing(['name' => 'Rejected Test Club']);
    }

    public function test_admin_can_suspend_and_activate_club(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $club = \App\Models\Club::create([
            'name'          => 'Active Test Club',
            'category'      => 'Technology',
            'description'   => 'Active club description',
            'contact_email' => 'active@student.nstu.edu.bd',
            'reason'        => 'Reason',
            'status'        => 'approved',
            'created_by'    => $admin->id,
        ]);

        // Suspend with reason
        $suspendRes = $this->actingAs($admin)->postJson("/api/admin/clubs/{$club->id}/suspend", [
            'suspension_reason' => 'Violation of club policies.',
        ]);
        $suspendRes->assertStatus(200);
        $this->assertDatabaseHas('clubs', [
            'id'                => $club->id,
            'status'            => 'suspended',
            'suspension_reason' => 'Violation of club policies.',
        ]);

        // Activate
        $activateRes = $this->actingAs($admin)->postJson("/api/admin/clubs/{$club->id}/activate");
        $activateRes->assertStatus(200);
        $this->assertDatabaseHas('clubs', [
            'id'                => $club->id,
            'status'            => 'approved',
            'suspension_reason' => null,
        ]);
    }
}
