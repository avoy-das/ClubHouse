<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_request_password_reset_link(): void
    {
        $user = User::factory()->create([
            'email' => 'student1@student.nstu.edu.bd',
        ]);

        $response = $this->postJson('/api/forgot-password', [
            'email' => 'student1@student.nstu.edu.bd',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('password_reset_tokens', [
            'email' => 'student1@student.nstu.edu.bd',
        ]);
    }

    public function test_user_cannot_request_reset_for_nonexistent_email(): void
    {
        $response = $this->postJson('/api/forgot-password', [
            'email' => 'nonexistent@student.nstu.edu.bd',
        ]);

        $response->assertStatus(422);
    }

    public function test_user_can_reset_password_with_valid_token(): void
    {
        $user = User::factory()->create([
            'email'    => 'student1@student.nstu.edu.bd',
            'password' => bcrypt('oldpassword123'),
        ]);

        $token = Password::createToken($user);

        $response = $this->postJson('/api/reset-password', [
            'token'                 => $token,
            'email'                 => 'student1@student.nstu.edu.bd',
            'password'              => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ]);

        $response->assertStatus(200);

        // Verify old password no longer works and new password works
        $this->postJson('/api/login', [
            'email'    => 'student1@student.nstu.edu.bd',
            'password' => 'oldpassword123',
        ])->assertStatus(401);

        $this->postJson('/api/login', [
            'email'    => 'student1@student.nstu.edu.bd',
            'password' => 'newpassword123',
        ])->assertStatus(200);
    }

    public function test_user_cannot_reset_password_with_invalid_token(): void
    {
        $user = User::factory()->create([
            'email' => 'student1@student.nstu.edu.bd',
        ]);

        $response = $this->postJson('/api/reset-password', [
            'token'                 => 'invalid-token',
            'email'                 => 'student1@student.nstu.edu.bd',
            'password'              => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ]);

        $response->assertStatus(422);
    }
}
