<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::factory()->create([
            'name'       => 'Test User',
            'email'      => 'test@example.com',
            'student_id' => 'STU-000',
            'department' => 'General',
            'phone'      => '0000000000',
            'is_admin'   => false,
        ]);

        $this->call(ClubSeeder::class);
    }
}
