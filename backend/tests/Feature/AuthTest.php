<?php

namespace Tests\Feature;

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
        $this->assertDatabaseHas('users', [
            'email' => 'johndoe@student.nstu.edu.bd',
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
}
