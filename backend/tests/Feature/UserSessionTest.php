<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserSessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_registration_accepts_integer_session(): void
    {
        $response = $this->postJson('/api/register', [
            'name'                  => 'Session Test User',
            'student_id'            => 'ASH2325001M',
            'email'                 => 'sessionuser@student.nstu.edu.bd',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
            'department'            => 'CSTE',
            'session'               => 25,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'email'   => 'sessionuser@student.nstu.edu.bd',
            'session' => 25,
        ]);

        $user = User::where('email', 'sessionuser@student.nstu.edu.bd')->first();
        $this->assertSame(25, $user->session);
    }

    public function test_user_can_update_session_in_profile(): void
    {
        $user = User::factory()->create([
            'email'   => 'sessionupdate@student.nstu.edu.bd',
            'session' => 23,
        ]);

        $this->actingAs($user);

        $response = $this->putJson('/api/me', [
            'session' => 26,
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('users', [
            'id'      => $user->id,
            'session' => 26,
        ]);
    }

    public function test_admin_can_update_user_session(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $student = User::factory()->create(['session' => 22]);

        $this->actingAs($admin);

        $response = $this->putJson("/api/users/{$student->id}", [
            'session' => 24,
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('users', [
            'id'      => $student->id,
            'session' => 24,
        ]);
    }

    public function test_session_validation_fails_out_of_range(): void
    {
        $response = $this->postJson('/api/register', [
            'name'                  => 'Invalid Session User',
            'student_id'            => 'ASH2325002M',
            'email'                 => 'invalidsession@student.nstu.edu.bd',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
            'department'            => 'CSTE',
            'session'               => 150,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['session']);
    }
}
