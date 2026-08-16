<?php

namespace Database\Seeders;

use App\Models\Club;
use App\Models\ClubMember;
use App\Models\Event;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class NewEntitiesSeeder extends Seeder
{
    public function run(): void
    {
        $hashedPassword = Hash::make('12345678');

        // 1. Create 5 New Users (1 Admin, 3 Club Executives, 1 Normal Member)
        $admin = User::create([
            'name'        => 'System Administrator 2',
            'student_id'  => 'ADM200001',
            'email'       => 'admin2@clubhouse.edu',
            'password'    => $hashedPassword,
            'department'  => 'Administration',
            'phone'       => '01700000001',
            'is_admin'    => true,
        ]);

        $exec1 = User::create([
            'name'        => 'Rahim Ahmed',
            'student_id'  => 'ASH200010M',
            'email'       => 'rahim.robotics@student.nstu.edu.bd',
            'password'    => $hashedPassword,
            'department'  => 'CSTE',
            'phone'       => '01700000002',
            'is_admin'    => false,
        ]);

        $exec2 = User::create([
            'name'        => 'Nusrat Jahan',
            'student_id'  => 'ASH200011M',
            'email'       => 'nusrat.robotics@student.nstu.edu.bd',
            'password'    => $hashedPassword,
            'department'  => 'EEE',
            'phone'       => '01700000003',
            'is_admin'    => false,
        ]);

        $exec3 = User::create([
            'name'        => 'Tanvir Hassan',
            'student_id'  => 'ASH200012M',
            'email'       => 'tanvir.debate@student.nstu.edu.bd',
            'password'    => $hashedPassword,
            'department'  => 'English',
            'phone'       => '01700000004',
            'is_admin'    => false,
        ]);

        $normalMember = User::create([
            'name'        => 'Sultana Razia',
            'student_id'  => 'ASH200013M',
            'email'       => 'sultana.member@student.nstu.edu.bd',
            'password'    => $hashedPassword,
            'department'  => 'ICE',
            'phone'       => '01700000005',
            'is_admin'    => false,
        ]);

        // 2. Create 2 New Clubs
        $club1 = Club::create([
            'name'          => 'Robotics & Automation Society',
            'category'      => 'Technology',
            'description'   => 'A club dedicated to robotics, automation, IoT, and embedded systems innovation.',
            'department'    => 'CSTE',
            'contact_email' => 'robotics@nstu.edu.bd',
            'contact_phone' => '01800000001',
            'reason'        => 'Promoting STEM and robotics research among NSTU students.',
            'status'        => 'approved',
            'created_by'    => $exec1->id,
            'approved_by'   => $admin->id,
            'approved_at'   => now(),
        ]);

        $club2 = Club::create([
            'name'          => 'NSTU Debate Club',
            'category'      => 'Academic',
            'description'   => 'Fostering public speaking, parliamentary debate skills, and critical thinking.',
            'department'    => 'English',
            'contact_email' => 'debate@nstu.edu.bd',
            'contact_phone' => '01800000002',
            'reason'        => 'Enhancing extracurricular speech and logic skills.',
            'status'        => 'approved',
            'created_by'    => $exec3->id,
            'approved_by'   => $admin->id,
            'approved_at'   => now(),
        ]);

        // Assign Memberships to Clubs
        // Club 1 Members
        ClubMember::create([
            'club_id'   => $club1->id,
            'user_id'   => $exec1->id,
            'role'      => 'president',
            'joined_at' => now(),
        ]);

        ClubMember::create([
            'club_id'   => $club1->id,
            'user_id'   => $exec2->id,
            'role'      => 'vice_president',
            'joined_at' => now(),
        ]);

        // Club 2 Members
        ClubMember::create([
            'club_id'   => $club2->id,
            'user_id'   => $exec3->id,
            'role'      => 'president',
            'joined_at' => now(),
        ]);

        ClubMember::create([
            'club_id'   => $club2->id,
            'user_id'   => $normalMember->id,
            'role'      => 'member',
            'joined_at' => now(),
        ]);

        // 3. Create 2 Events for Each Club with Different Settings

        // Club 1 - Event 1: Published, Public, Physical, High Capacity
        Event::create([
            'club_id'        => $club1->id,
            'created_by'     => $exec1->id,
            'title'          => 'Annual Autonomous Robotics Championship 2026',
            'description'    => 'Inter-department bot race and obstacle challenge for autonomous rovers.',
            'status'         => 'published',
            'visibility'     => 'public',
            'location_type'  => 'physical',
            'location_value' => 'Auditorium 1, Academic Building 3',
            'starts_at'      => Carbon::now()->addDays(14)->setHour(10)->setMinute(0),
            'ends_at'        => Carbon::now()->addDays(14)->setHour(17)->setMinute(0),
            'capacity'       => 150,
        ]);

        // Club 1 - Event 2: Draft, Members Only, Online, Low Capacity
        Event::create([
            'club_id'        => $club1->id,
            'created_by'     => $exec2->id,
            'title'          => 'Embedded Firmware & Microcontrollers Workshop',
            'description'    => 'Exclusive hands-on workshop for club members on ESP32 & STM32 development.',
            'status'         => 'draft',
            'visibility'     => 'members_only',
            'location_type'  => 'online',
            'location_value' => 'https://meet.google.com/xyz-robotics-ws',
            'starts_at'      => Carbon::now()->addDays(24)->setHour(18)->setMinute(0),
            'ends_at'        => Carbon::now()->addDays(24)->setHour(20)->setMinute(0),
            'capacity'       => 40,
        ]);

        // Club 2 - Event 1: Ongoing, Public, Physical, Medium Capacity
        Event::create([
            'club_id'        => $club2->id,
            'created_by'     => $exec3->id,
            'title'          => 'National Parliamentary Debate Bootcamp',
            'description'    => 'Intensive motion analysis and debating strategy training open to all university students.',
            'status'         => 'ongoing',
            'visibility'     => 'public',
            'location_type'  => 'physical',
            'location_value' => 'Central Seminar Hall',
            'starts_at'      => Carbon::now()->subHours(2),
            'ends_at'        => Carbon::now()->addHours(6),
            'capacity'       => 80,
        ]);

        // Club 2 - Event 2: Completed, Members Only, Online, Small Capacity
        Event::create([
            'club_id'        => $club2->id,
            'created_by'     => $exec3->id,
            'title'          => 'Internal Sparring Session: World Universities Debating Format',
            'description'    => 'Closed practice debate round for registered debate club members.',
            'status'         => 'completed',
            'visibility'     => 'members_only',
            'location_type'  => 'online',
            'location_value' => 'https://zoom.us/j/9876543210',
            'starts_at'      => Carbon::now()->subDays(10)->setHour(16)->setMinute(0),
            'ends_at'        => Carbon::now()->subDays(10)->setHour(19)->setMinute(0),
            'capacity'       => 24,
        ]);
    }
}
