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
}
