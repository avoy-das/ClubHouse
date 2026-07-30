<?php

namespace Database\Seeders;

use App\Models\Club;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ClubSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@university.edu'],
            [
                'name'       => 'System Admin',
                'student_id' => 'ADMIN-001',
                'password'   => bcrypt('password'),
                'department' => 'Administration',
                'phone'      => '1234567890',
                'is_admin'   => true,
            ]
        );

        $student = User::firstOrCreate(
            ['email' => 'student@university.edu'],
            [
                'name'       => 'John Student',
                'student_id' => 'STU-1001',
                'password'   => bcrypt('password'),
                'department' => 'Computer Science',
                'phone'      => '0987654321',
                'is_admin'   => false,
            ]
        );

        $sampleClubs = [
            [
                'name'        => 'Computer Science Society',
                'category'    => 'Academic & Technology',
                'description' => 'The official student organization for computer science, software engineering, and AI enthusiasts.',
            ],
            [
                'name'        => 'Robotics & Automation Club',
                'category'    => 'Engineering',
                'description' => 'Building next-generation autonomous systems, drones, and competitive robots.',
            ],
            [
                'name'        => 'University Debating Club',
                'category'    => 'Cultural & Arts',
                'description' => 'Fostering critical thinking, public speaking, and parliamentary debate excellence.',
            ],
        ];

        foreach ($sampleClubs as $clubData) {
            $club = Club::firstOrCreate(
                ['slug' => Str::slug($clubData['name'])],
                [
                    'name'        => $clubData['name'],
                    'description' => $clubData['description'],
                    'category'    => $clubData['category'],
                    'status'      => 'approved',
                    'created_by'  => $admin->id,
                ]
            );

            // Default position
            $defaultPos = $club->positions()->firstOrCreate(
                ['title' => 'Member'],
                ['is_default' => true]
            );

            // Executive position
            $presPos = $club->positions()->firstOrCreate(
                ['title' => 'President'],
                [
                    'can_manage_members'       => true,
                    'can_manage_events'        => true,
                    'can_manage_announcements' => true,
                    'can_manage_recruitment'   => true,
                    'can_track_attendance'     => true,
                    'is_default'               => false,
                ]
            );

            // Assign admin as President
            $adminMember = $club->members()->firstOrCreate(
                ['user_id' => $admin->id],
                ['status' => 'active', 'joined_at' => now()]
            );

            $adminMember->positions()->firstOrCreate([
                'club_position_id' => $presPos->id,
            ], ['assigned_at' => now()]);

            // Assign student as Member
            $studentMember = $club->members()->firstOrCreate(
                ['user_id' => $student->id],
                ['status' => 'active', 'joined_at' => now()]
            );

            $studentMember->positions()->firstOrCreate([
                'club_position_id' => $defaultPos->id,
            ], ['assigned_at' => now()]);
        }
    }
}
