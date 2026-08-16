<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RateLimitingTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_rate_limiting_triggers_after_max_attempts(): void
    {
        // 5 requests per minute allowed for specific email + ip
        for ($i = 0; $i < 5; $i++) {
            $response = $this->postJson('/api/login', [
                'email' => 'test@example.com',
                'password' => 'wrongpassword',
            ]);
            // Should not be rate limited yet (will return 401 unauthenticated or 422 validation)
            $this->assertNotEquals(429, $response->getStatusCode());
        }

        // 6th request should be rate limited with 429
        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(429);
        $response->assertHeader('X-RateLimit-Limit');
        $response->assertHeader('Retry-After');
    }

    public function test_register_rate_limiting_triggers_after_max_attempts(): void
    {
        // 3 requests per minute allowed for IP
        for ($i = 0; $i < 3; $i++) {
            $response = $this->postJson('/api/register', [
                'name' => 'Test User',
                'email' => "test{$i}@example.com",
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'student_id' => "200000{$i}",
                'department' => 'CSE',
                'session' => 2022,
            ]);
            $this->assertNotEquals(429, $response->getStatusCode());
        }

        // 4th request should be rate limited with 429
        $response = $this->postJson('/api/register', [
            'name' => 'Test User',
            'email' => 'test4@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'student_id' => '2000004',
            'department' => 'CSE',
            'session' => 2022,
        ]);

        $response->assertStatus(429);
    }

    public function test_change_password_rate_limiting(): void
    {
        $user = User::factory()->create(['password' => bcrypt('password123')]);

        for ($i = 0; $i < 5; $i++) {
            $response = $this->actingAs($user)->postJson('/api/me/change-password', [
                'current_password' => 'wrongpassword',
                'new_password' => 'NewPassword123!',
                'new_password_confirmation' => 'NewPassword123!',
            ]);
            $this->assertNotEquals(429, $response->getStatusCode());
        }

        // 6th request should be throttled
        $response = $this->actingAs($user)->postJson('/api/me/change-password', [
            'current_password' => 'wrongpassword',
            'new_password' => 'NewPassword123!',
            'new_password_confirmation' => 'NewPassword123!',
        ]);

        $response->assertStatus(429);
    }
}
