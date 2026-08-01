<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_fails_for_non_institutional_email(): void
    {
        $response = $this->postJson('/api/register', [
            'name'                  => 'John Doe',
            'student_id'            => 'ASH1901001M',
            'email'                 => 'johndoe@gmail.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
            'department'            => 'CSTE',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email'])
            ->assertJsonFragment([
                'email' => ['Only official NSTU student emails (@student.nstu.edu.bd) are allowed to register.']
            ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'auth.register.failed',
        ]);
    }

    public function test_registration_succeeds_for_valid_institutional_email(): void
    {
        $response = $this->postJson('/api/register', [
            'name'                  => 'John Doe',
            'student_id'            => 'ASH1901001M',
            'email'                 => 'johndoe@student.nstu.edu.bd',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
            'department'            => 'CSTE',
        ]);

        $response->assertStatus(201);
        $user = User::where('email', 'johndoe@student.nstu.edu.bd')->first();

        $this->assertDatabaseHas('users', [
            'email' => 'johndoe@student.nstu.edu.bd',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action'      => 'auth.register.success',
            'user_id'     => $user->id,
            'target_type' => 'User',
            'target_id'   => $user->id,
        ]);
    }

    public function test_registration_normalizes_uppercase_institutional_email(): void
    {
        $response = $this->postJson('/api/register', [
            'name'                  => 'Jane Doe',
            'student_id'            => 'ASH1901002M',
            'email'                 => 'JANEDOE@STUDENT.NSTU.EDU.BD',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
            'department'            => 'CSTE',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'email' => 'janedoe@student.nstu.edu.bd',
        ]);
    }

    public function test_login_succeeds_logs_to_audit_logs(): void
    {
        $user = User::factory()->create([
            'email'    => 'testuser@student.nstu.edu.bd',
            'password' => bcrypt('secret123'),
        ]);

        $response = $this->postJson('/api/login', [
            'email'    => 'testuser@student.nstu.edu.bd',
            'password' => 'secret123',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('audit_logs', [
            'action'      => 'auth.login.success',
            'user_id'     => $user->id,
            'target_type' => 'User',
            'target_id'   => $user->id,
        ]);
    }

    public function test_login_fails_invalid_credentials_logs_to_audit_logs(): void
    {
        $user = User::factory()->create([
            'email'    => 'testuser@student.nstu.edu.bd',
            'password' => bcrypt('secret123'),
        ]);

        $response = $this->postJson('/api/login', [
            'email'    => 'testuser@student.nstu.edu.bd',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401);

        $this->assertDatabaseHas('audit_logs', [
            'action'      => 'auth.login.failed',
            'user_id'     => $user->id,
            'target_type' => 'User',
            'target_id'   => $user->id,
        ]);
    }

    public function test_login_fails_non_existent_user_logs_to_audit_logs(): void
    {
        $response = $this->postJson('/api/login', [
            'email'    => 'nonexistent@student.nstu.edu.bd',
            'password' => 'secret123',
        ]);

        $response->assertStatus(401);

        $this->assertDatabaseHas('audit_logs', [
            'action'  => 'auth.login.failed',
            'user_id' => null,
        ]);
    }

    public function test_login_fails_validation_logs_to_audit_logs(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'not-an-email',
        ]);

        $response->assertStatus(422);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'auth.login.failed',
        ]);
    }
}
