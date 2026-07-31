<?php

namespace Database\Seeders;

use App\Models\Club;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class EventSeeder extends Seeder
{
    /**
     * Seed 5 events with 5 different settings into the database.
     */
    public function run(): void
    {
        // 1. Ensure at least one admin/user and club exist
        $admin = User::firstOrCreate(
            ['email' => 'admin@clubhouse.edu'],
            [
                'name'        => 'Clubhouse Admin',
                'student_id'  => 'ASH190001M',
                'department'  => 'CSTE',
                'password'    => bcrypt('password'),
                'is_admin'    => true,
            ]
        );

        $club = Club::firstOrCreate(
            ['name' => 'Computer Club'],
            [
                'description'   => 'Empowering students through tech & innovation.',
                'category'      => 'Technology',
                'department'    => 'CSTE',
                'contact_email' => 'computerclub@nstu.edu.bd',
                'reason'        => 'Promoting computer science education',
                'status'        => 'approved',
                'created_by'    => $admin->id,
            ]
        );

        // Create sample users for registrations
        $users = [];
        for ($i = 1; $i <= 5; $i++) {
            $users[] = User::firstOrCreate(
                ['email' => "student{$i}@nstu.edu.bd"],
                [
                    'name'       => "Student {$i}",
                    'student_id' => "ASH19000" . ($i + 1) . "M",
                    'department' => 'CSTE',
                    'password'   => bcrypt('password'),
                ]
            );
        }

        // --- Event 1: Upcoming Event with Available Capacity ---
        $event1 = Event::updateOrCreate(
            ['title' => 'AI & Machine Learning Bootcamp 2026'],
            [
                'club_id'        => $club->id,
                'created_by'     => $admin->id,
                'description'    => 'Hands-on bootcamp covering Python, PyTorch, and LLM deployment.',
                'status'         => 'published',
                'visibility'     => 'public',
                'location_type'  => 'physical',
                'location_value' => 'Auditorium B',
                'starts_at'      => now()->addDays(3)->setHour(10)->setMinute(0),
                'ends_at'        => now()->addDays(3)->setHour(14)->setMinute(0),
                'capacity'       => 20,
            ]
        );
        // Register 2 users so 18 spots remain
        EventRegistration::firstOrCreate(['event_id' => $event1->id, 'user_id' => $users[0]->id]);
        EventRegistration::firstOrCreate(['event_id' => $event1->id, 'user_id' => $users[1]->id]);

        // --- Event 2: Fully Booked Event ---
        $event2 = Event::updateOrCreate(
            ['title' => 'Exclusive Cybersecurity Masterclass'],
            [
                'club_id'        => $club->id,
                'created_by'     => $admin->id,
                'description'    => 'Advanced penetration testing and ethical hacking lab session.',
                'status'         => 'published',
                'visibility'     => 'public',
                'location_type'  => 'physical',
                'location_value' => 'Network Security Lab 301',
                'starts_at'      => now()->addDays(5)->setHour(14)->setMinute(0),
                'ends_at'        => now()->addDays(5)->setHour(17)->setMinute(0),
                'capacity'       => 2, // Capacity set to 2
            ]
        );
        // Register exactly 2 users so capacity is 100% full
        EventRegistration::firstOrCreate(['event_id' => $event2->id, 'user_id' => $users[0]->id]);
        EventRegistration::firstOrCreate(['event_id' => $event2->id, 'user_id' => $users[1]->id]);

        // --- Event 3: Unlimited Capacity Event ---
        $event3 = Event::updateOrCreate(
            ['title' => 'Annual Tech Fest Keynote Speech'],
            [
                'club_id'        => $club->id,
                'created_by'     => $admin->id,
                'description'    => 'Keynote presentation by industry tech leads. Open to all students.',
                'status'         => 'published',
                'visibility'     => 'public',
                'location_type'  => 'online',
                'location_value' => 'https://meet.google.com/tech-fest-2026',
                'starts_at'      => now()->addDays(10)->setHour(16)->setMinute(0),
                'ends_at'        => now()->addDays(10)->setHour(18)->setMinute(0),
                'capacity'       => null, // Unlimited capacity
            ]
        );
        EventRegistration::firstOrCreate(['event_id' => $event3->id, 'user_id' => $users[2]->id]);

        // --- Event 4: Ongoing Event ---
        $event4 = Event::updateOrCreate(
            ['title' => 'Live Hackathon 2026'],
            [
                'club_id'        => $club->id,
                'created_by'     => $admin->id,
                'description'    => '24-hour non-stop hackathon building real-world solutions.',
                'status'         => 'ongoing',
                'visibility'     => 'public',
                'location_type'  => 'physical',
                'location_value' => 'Student Center Main Hall',
                'starts_at'      => now()->subHours(2),
                'ends_at'        => now()->addHours(10),
                'capacity'       => 50,
            ]
        );
        EventRegistration::firstOrCreate(['event_id' => $event4->id, 'user_id' => $users[3]->id]);

        // --- Event 5: Completed / Past Event ---
        $event5 = Event::updateOrCreate(
            ['title' => 'Web Development Starter Workshop'],
            [
                'club_id'        => $club->id,
                'created_by'     => $admin->id,
                'description'    => 'Introductory session on HTML5, CSS3, and JavaScript basics.',
                'status'         => 'completed',
                'visibility'     => 'public',
                'location_type'  => 'physical',
                'location_value' => 'Seminar Room 1',
                'starts_at'      => now()->subDays(7)->setHour(10)->setMinute(0),
                'ends_at'        => now()->subDays(7)->setHour(13)->setMinute(0),
                'capacity'       => 30,
            ]
        );
        EventRegistration::firstOrCreate(['event_id' => $event5->id, 'user_id' => $users[4]->id]);
    }
}
