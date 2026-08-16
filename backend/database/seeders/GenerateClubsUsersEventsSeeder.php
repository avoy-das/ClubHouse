<?php

namespace Database\Seeders;

use App\Models\Club;
use App\Models\ClubMember;
use App\Models\Event;
use App\Models\RecruitmentNotice;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class GenerateClubsUsersEventsSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('is_admin', true)->first();
        $adminId = $admin ? $admin->id : 1;
        $hashedPassword = Hash::make('password123');

        // -------------------------------------------------------------
        // 1. GENERATE 25 STUDENTS (Original 15 + 10 New Students)
        // -------------------------------------------------------------
        $userData = [
            [
                'name'       => 'Abrar Fahad',
                'student_id' => 'ASH260101M',
                'email'      => 'abrar.fahad@student.nstu.edu.bd',
                'department' => 'Software Engineering',
                'session'    => 26,
                'phone'      => '01711000101',
            ],
            [
                'name'       => 'Mahmood Hassan',
                'student_id' => 'ASH260102M',
                'email'      => 'mahmood.hassan@student.nstu.edu.bd',
                'department' => 'CSTE',
                'session'    => 26,
                'phone'      => '01711000102',
            ],
            [
                'name'       => 'Sadia Afroze',
                'student_id' => 'ASH260103M',
                'email'      => 'sadia.afroze@student.nstu.edu.bd',
                'department' => 'EEE',
                'session'    => 26,
                'phone'      => '01711000103',
            ],
            [
                'name'       => 'Tariqul Islam',
                'student_id' => 'ASH260104M',
                'email'      => 'tariqul.islam@student.nstu.edu.bd',
                'department' => 'Management',
                'session'    => 26,
                'phone'      => '01711000104',
            ],
            [
                'name'       => 'Farhana Rahman',
                'student_id' => 'ASH260105M',
                'email'      => 'farhana.rahman@student.nstu.edu.bd',
                'department' => 'Economics',
                'session'    => 26,
                'phone'      => '01711000105',
            ],
            [
                'name'       => 'Kamrul Hasan',
                'student_id' => 'ASH260106M',
                'email'      => 'kamrul.hasan@student.nstu.edu.bd',
                'department' => 'ICE',
                'session'    => 26,
                'phone'      => '01711000106',
            ],
            [
                'name'       => 'Mehedi Hasan',
                'student_id' => 'ASH260107M',
                'email'      => 'mehedi.hasan@student.nstu.edu.bd',
                'department' => 'English',
                'session'    => 26,
                'phone'      => '01711000107',
            ],
            [
                'name'       => 'Nayla Chowdhury',
                'student_id' => 'ASH260108M',
                'email'      => 'nayla.chowdhury@student.nstu.edu.bd',
                'department' => 'Physics',
                'session'    => 26,
                'phone'      => '01711000108',
            ],
            [
                'name'       => 'Shahriar Ahmed',
                'student_id' => 'ASH260109M',
                'email'      => 'shahriar.ahmed@student.nstu.edu.bd',
                'department' => 'Chemistry',
                'session'    => 26,
                'phone'      => '01711000109',
            ],
            [
                'name'       => 'Zarin Subah',
                'student_id' => 'ASH260110M',
                'email'      => 'zarin.subah@student.nstu.edu.bd',
                'department' => 'Environmental Science',
                'session'    => 26,
                'phone'      => '01711000110',
            ],
            [
                'name'       => 'Adnan Samir',
                'student_id' => 'ASH260111M',
                'email'      => 'adnan.samir@student.nstu.edu.bd',
                'department' => 'Biotechnology',
                'session'    => 26,
                'phone'      => '01711000111',
            ],
            [
                'name'       => 'Bishwajit Roy',
                'student_id' => 'ASH260112M',
                'email'      => 'bishwajit.roy@student.nstu.edu.bd',
                'department' => 'Statistics',
                'session'    => 26,
                'phone'      => '01711000112',
            ],
            [
                'name'       => 'Fahmida Yasmin',
                'student_id' => 'ASH260113M',
                'email'      => 'fahmida.yasmin@student.nstu.edu.bd',
                'department' => 'Public Health',
                'session'    => 26,
                'phone'      => '01711000113',
            ],
            [
                'name'       => 'Imtiaz Hossain',
                'student_id' => 'ASH260114M',
                'email'      => 'imtiaz.hossain@student.nstu.edu.bd',
                'department' => 'Pharmacy',
                'session'    => 26,
                'phone'      => '01711000114',
            ],
            [
                'name'       => 'Tasnim Fatima',
                'student_id' => 'ASH260115M',
                'email'      => 'tasnim.fatima@student.nstu.edu.bd',
                'department' => 'Mathematics',
                'session'    => 26,
                'phone'      => '01711000115',
            ],
            // 10 NEW STUDENTS
            [
                'name'       => 'Tanvir Rahman',
                'student_id' => 'ASH260116M',
                'email'      => 'tanvir.rahman@student.nstu.edu.bd',
                'department' => 'Software Engineering',
                'session'    => 26,
                'phone'      => '01711000116',
            ],
            [
                'name'       => 'Naimur Reza',
                'student_id' => 'ASH260117M',
                'email'      => 'naimur.reza@student.nstu.edu.bd',
                'department' => 'CSTE',
                'session'    => 26,
                'phone'      => '01711000117',
            ],
            [
                'name'       => 'Mahfuza Akter',
                'student_id' => 'ASH260118M',
                'email'      => 'mahfuza.akter@student.nstu.edu.bd',
                'department' => 'Economics',
                'session'    => 26,
                'phone'      => '01711000118',
            ],
            [
                'name'       => 'Sajid Hasan',
                'student_id' => 'ASH260119M',
                'email'      => 'sajid.hasan@student.nstu.edu.bd',
                'department' => 'EEE',
                'session'    => 26,
                'phone'      => '01711000119',
            ],
            [
                'name'       => 'Ayesha Siddiqua',
                'student_id' => 'ASH260120M',
                'email'      => 'ayesha.siddiqua@student.nstu.edu.bd',
                'department' => 'ICE',
                'session'    => 26,
                'phone'      => '01711000120',
            ],
            [
                'name'       => 'Rifat Hossain',
                'student_id' => 'ASH260121M',
                'email'      => 'rifat.hossain@student.nstu.edu.bd',
                'department' => 'English',
                'session'    => 26,
                'phone'      => '01711000121',
            ],
            [
                'name'       => 'Mehnaz Parveen',
                'student_id' => 'ASH260122M',
                'email'      => 'mehnaz.parveen@student.nstu.edu.bd',
                'department' => 'Pharmacy',
                'session'    => 26,
                'phone'      => '01711000122',
            ],
            [
                'name'       => 'Kazi Anik',
                'student_id' => 'ASH260123M',
                'email'      => 'kazi.anik@student.nstu.edu.bd',
                'department' => 'Biotechnology',
                'session'    => 26,
                'phone'      => '01711000123',
            ],
            [
                'name'       => 'Sabrina Yeasmin',
                'student_id' => 'ASH260124M',
                'email'      => 'sabrina.yeasmin@student.nstu.edu.bd',
                'department' => 'Physics',
                'session'    => 26,
                'phone'      => '01711000124',
            ],
            [
                'name'       => 'Zubayer Ahmed',
                'student_id' => 'ASH260125M',
                'email'      => 'zubayer.ahmed@student.nstu.edu.bd',
                'department' => 'Chemistry',
                'session'    => 26,
                'phone'      => '01711000125',
            ],
        ];

        $users = [];
        foreach ($userData as $data) {
            $users[] = User::firstOrCreate(
                ['email' => $data['email']],
                [
                    'name'       => $data['name'],
                    'student_id' => $data['student_id'],
                    'email'      => $data['email'],
                    'password'   => $hashedPassword,
                    'department' => $data['department'],
                    'session'    => $data['session'],
                    'phone'      => $data['phone'],
                    'is_admin'   => false,
                ]
            );
        }

        // -------------------------------------------------------------
        // 2. GENERATE CLUBS
        // -------------------------------------------------------------
        $clubsData = [
            [
                'name'          => 'IT Club',
                'category'      => 'Technology',
                'description'   => 'Fostering excellence in modern software design, open-source development, systems architecture, and cloud computing.',
                'department'    => 'Software Engineering',
                'contact_email' => 'it-club@nstu.edu.bd',
                'contact_phone' => '01811000001',
                'reason'        => 'Established to bridge academic computer science education with industry-grade software engineering practices.',
                'creator_idx'   => 0,
                'advisor'       => [
                    'name'        => 'Dr. Mohammad Ali',
                    'designation' => 'Associate Professor',
                    'department'  => 'Software Engineering',
                    'email'       => 'mali@nstu.edu.bd',
                    'phone'       => '01899000001',
                ],
            ],
            [
                'name'          => 'Royel Economics Club, NSTU',
                'category'      => 'Business & Entrepreneurship',
                'description'   => 'Empowering students to launch startups, pitch innovative business solutions, and scale high-growth technology ventures.',
                'department'    => 'Economics',
                'contact_email' => 'royel.econ.club@nstu.edu.bd',
                'contact_phone' => '01811000002',
                'reason'        => 'Created to inspire an entrepreneurial mindset and support student-led business initiatives across campus.',
                'creator_idx'   => 3,
                'advisor'       => [
                    'name'        => 'Prof. Syeda Naznin',
                    'designation' => 'Professor',
                    'department'  => 'Economics',
                    'email'       => 'snaznin@nstu.edu.bd',
                    'phone'       => '01899000002',
                ],
            ],
            [
                'name'          => 'NSTU Photography Club',
                'category'      => 'Arts & Media',
                'description'   => 'Capturing moments, training digital visual arts, filmmaking, graphic design, photojournalism, and visual storytelling.',
                'department'    => 'English',
                'contact_email' => 'photography.club@nstu.edu.bd',
                'contact_phone' => '01811000003',
                'reason'        => 'Formed to promote creative photography, documentary filmmaking, and media coverage for university events.',
                'creator_idx'   => 6,
                'advisor'       => [
                    'name'        => 'Dr. Kamrul Islam',
                    'designation' => 'Assistant Professor',
                    'department'  => 'English',
                    'email'       => 'kislam@nstu.edu.bd',
                    'phone'       => '01899000003',
                ],
            ],
            [
                'name'          => 'NSTU Green & Eco Warriors',
                'category'      => 'Environment',
                'description'   => 'Dedicated to environmental conservation, campus tree plantation, waste recycling, and active climate conservation.',
                'department'    => 'Environmental Science',
                'contact_email' => 'ecowarriors@nstu.edu.bd',
                'contact_phone' => '01811000004',
                'reason'        => 'Launched to raise climate awareness, lead sustainability drives, and maintain a green university environment.',
                'creator_idx'   => 9,
                'advisor'       => [
                    'name'        => 'Dr. Shamsul Hoque',
                    'designation' => 'Professor',
                    'department'  => 'Environmental Science',
                    'email'       => 'shoque@nstu.edu.bd',
                    'phone'       => '01899000004',
                ],
            ],
            // 5 NEW CLUBS
            [
                'name'          => 'NSTU Science Club',
                'category'      => 'Academic',
                'description'   => 'Fostering scientific research, robotics experiments, innovation exhibitions, and interdisciplinary STEM projects.',
                'department'    => 'Physics',
                'contact_email' => 'science.club@nstu.edu.bd',
                'contact_phone' => '01811000021',
                'reason'        => 'Promoting basic and applied scientific research culture among university students.',
                'creator_idx'   => 15,
                'advisor'       => [
                    'name'        => 'Dr. Rafiqul Islam',
                    'designation' => 'Professor',
                    'department'  => 'Physics',
                    'email'       => 'rafiqul.physics@nstu.edu.bd',
                    'phone'       => '01899000021',
                ],
            ],
            [
                'name'          => 'NSTU Adventure Club',
                'category'      => 'Sports',
                'description'   => 'Organizing mountain trekking, wilderness camping, survival workshops, and environmental exploration trips.',
                'department'    => 'Physical Education',
                'contact_email' => 'adventure.club@nstu.edu.bd',
                'contact_phone' => '01811000022',
                'reason'        => 'Building youth endurance, mental resilience, teamwork, and passion for nature exploration.',
                'creator_idx'   => 16,
                'advisor'       => [
                    'name'        => 'Dr. Selim Reza',
                    'designation' => 'Associate Professor',
                    'department'  => 'Environmental Science',
                    'email'       => 'selim.reza@nstu.edu.bd',
                    'phone'       => '01899000022',
                ],
            ],
            [
                'name'          => 'NSTU Dance Club',
                'category'      => 'Cultural',
                'description'   => 'Promoting traditional Bangladeshi folk dance, classical dance forms, modern choreography, and stage performances.',
                'department'    => 'Bangla',
                'contact_email' => 'dance.club@nstu.edu.bd',
                'contact_phone' => '01811000023',
                'reason'        => 'Expressing cultural artistic expressions and representing NSTU in national youth dance festivals.',
                'creator_idx'   => 17,
                'advisor'       => [
                    'name'        => 'Prof. Anwara Begum',
                    'designation' => 'Professor',
                    'department'  => 'Bangla',
                    'email'       => 'anwara.begum@nstu.edu.bd',
                    'phone'       => '01899000023',
                ],
            ],
            [
                'name'          => 'NSTU Model United Nations Association (NSTUMUNA)',
                'category'      => 'Academic',
                'description'   => 'Training student diplomats in international relations, multilateral diplomacy, policy resolution drafting, and Model UN conferences.',
                'department'    => 'Economics',
                'contact_email' => 'nstumuna@nstu.edu.bd',
                'contact_phone' => '01811000024',
                'reason'        => 'Empowering students with global diplomatic awareness, negotiation tactics, and international law understanding.',
                'creator_idx'   => 18,
                'advisor'       => [
                    'name'        => 'Dr. Mahfuzur Rahman',
                    'designation' => 'Associate Professor',
                    'department'  => 'Economics',
                    'email'       => 'mahfuzur.rahman@nstu.edu.bd',
                    'phone'       => '01899000024',
                ],
            ],
            [
                'name'          => 'Dhrupod Music Club',
                'category'      => 'Cultural',
                'description'   => 'Nurturing vocal artists, instrumental musicians, classical ragas, band music, and hosting annual university music concerts.',
                'department'    => 'English',
                'contact_email' => 'dhrupod.music@nstu.edu.bd',
                'contact_phone' => '01811000025',
                'reason'        => 'Cultivating musical talent and celebrating acoustic, classical, and modern music traditions.',
                'creator_idx'   => 19,
                'advisor'       => [
                    'name'        => 'Dr. Nazrul Islam',
                    'designation' => 'Assistant Professor',
                    'department'  => 'English',
                    'email'       => 'nazrul.islam@nstu.edu.bd',
                    'phone'       => '01899000025',
                ],
            ],
        ];

        $clubs = [];
        $totalStudents = count($users);

        foreach ($clubsData as $idx => $cData) {
            $creator = $users[$cData['creator_idx'] % $totalStudents];
            
            $club = Club::firstOrCreate(
                ['name' => $cData['name']],
                [
                    'category'      => $cData['category'],
                    'description'   => $cData['description'],
                    'department'    => $cData['department'],
                    'contact_email' => $cData['contact_email'],
                    'contact_phone' => $cData['contact_phone'],
                    'reason'        => $cData['reason'],
                    'status'        => 'approved',
                    'created_by'    => $creator->id,
                    'approved_by'   => $adminId,
                    'approved_at'   => now(),
                    'advisor'       => $cData['advisor'],
                ]
            );
            $clubs[] = $club;

            // Assign 3 Executives & 5 Members to each club
            $exec0 = $users[($idx * 8 + 0) % $totalStudents];
            $exec1 = $users[($idx * 8 + 1) % $totalStudents];
            $exec2 = $users[($idx * 8 + 2) % $totalStudents];

            ClubMember::updateOrCreate(
                ['club_id' => $club->id, 'user_id' => $exec0->id],
                ['role' => 'president', 'status' => 'active', 'joined_at' => now()]
            );

            ClubMember::updateOrCreate(
                ['club_id' => $club->id, 'user_id' => $exec1->id],
                ['role' => 'vice_president', 'status' => 'active', 'joined_at' => now()]
            );

            ClubMember::updateOrCreate(
                ['club_id' => $club->id, 'user_id' => $exec2->id],
                ['role' => 'secretary', 'status' => 'active', 'joined_at' => now()]
            );

            $execIds = [$exec0->id, $exec1->id, $exec2->id];
            for ($j = 0; $j < 5; $j++) {
                $mUser = $users[($idx * 8 + 3 + $j) % $totalStudents];
                if (in_array($mUser->id, $execIds)) continue;
                ClubMember::updateOrCreate(
                    ['club_id' => $club->id, 'user_id' => $mUser->id],
                    ['role' => 'member', 'status' => 'active', 'joined_at' => now()]
                );
            }
        }
    }
}
