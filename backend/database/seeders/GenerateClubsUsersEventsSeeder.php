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
        // 1. GENERATE 15 NEW USERS
        // -------------------------------------------------------------
        $userData = [
            [
                'name'       => 'Abrar Fahad',
                'student_id' => 'ASH260101M',
                'email'      => 'abrar.fahad@nstu.edu.bd',
                'department' => 'Software Engineering',
                'session'    => 26,
                'phone'      => '01711000101',
            ],
            [
                'name'       => 'Mahmood Hassan',
                'student_id' => 'ASH260102M',
                'email'      => 'mahmood.hassan@nstu.edu.bd',
                'department' => 'CSTE',
                'session'    => 26,
                'phone'      => '01711000102',
            ],
            [
                'name'       => 'Sadia Afroze',
                'student_id' => 'ASH260103M',
                'email'      => 'sadia.afroze@nstu.edu.bd',
                'department' => 'EEE',
                'session'    => 26,
                'phone'      => '01711000103',
            ],
            [
                'name'       => 'Tariqul Islam',
                'student_id' => 'ASH260104M',
                'email'      => 'tariqul.islam@nstu.edu.bd',
                'department' => 'Management',
                'session'    => 26,
                'phone'      => '01711000104',
            ],
            [
                'name'       => 'Farhana Rahman',
                'student_id' => 'ASH260105M',
                'email'      => 'farhana.rahman@nstu.edu.bd',
                'department' => 'Economics',
                'session'    => 26,
                'phone'      => '01711000105',
            ],
            [
                'name'       => 'Kamrul Hasan',
                'student_id' => 'ASH260106M',
                'email'      => 'kamrul.hasan@nstu.edu.bd',
                'department' => 'ICE',
                'session'    => 26,
                'phone'      => '01711000106',
            ],
            [
                'name'       => 'Mehedi Hasan',
                'student_id' => 'ASH260107M',
                'email'      => 'mehedi.hasan@nstu.edu.bd',
                'department' => 'English',
                'session'    => 26,
                'phone'      => '01711000107',
            ],
            [
                'name'       => 'Nayla Chowdhury',
                'student_id' => 'ASH260108M',
                'email'      => 'nayla.chowdhury@nstu.edu.bd',
                'department' => 'Physics',
                'session'    => 26,
                'phone'      => '01711000108',
            ],
            [
                'name'       => 'Shahriar Ahmed',
                'student_id' => 'ASH260109M',
                'email'      => 'shahriar.ahmed@nstu.edu.bd',
                'department' => 'Chemistry',
                'session'    => 26,
                'phone'      => '01711000109',
            ],
            [
                'name'       => 'Zarin Subah',
                'student_id' => 'ASH260110M',
                'email'      => 'zarin.subah@nstu.edu.bd',
                'department' => 'Environmental Science',
                'session'    => 26,
                'phone'      => '01711000110',
            ],
            [
                'name'       => 'Adnan Samir',
                'student_id' => 'ASH260111M',
                'email'      => 'adnan.samir@nstu.edu.bd',
                'department' => 'Biotechnology',
                'session'    => 26,
                'phone'      => '01711000111',
            ],
            [
                'name'       => 'Bishwajit Roy',
                'student_id' => 'ASH260112M',
                'email'      => 'bishwajit.roy@nstu.edu.bd',
                'department' => 'Statistics',
                'session'    => 26,
                'phone'      => '01711000112',
            ],
            [
                'name'       => 'Fahmida Yasmin',
                'student_id' => 'ASH260113M',
                'email'      => 'fahmida.yasmin@nstu.edu.bd',
                'department' => 'Public Health',
                'session'    => 26,
                'phone'      => '01711000113',
            ],
            [
                'name'       => 'Imtiaz Hossain',
                'student_id' => 'ASH260114M',
                'email'      => 'imtiaz.hossain@nstu.edu.bd',
                'department' => 'Pharmacy',
                'session'    => 26,
                'phone'      => '01711000114',
            ],
            [
                'name'       => 'Tasnim Fatima',
                'student_id' => 'ASH260115M',
                'email'      => 'tasnim.fatima@nstu.edu.bd',
                'department' => 'Mathematics',
                'session'    => 26,
                'phone'      => '01711000115',
            ],
        ];

        $users = [];
        foreach ($userData as $data) {
            $users[] = User::create([
                'name'       => $data['name'],
                'student_id' => $data['student_id'],
                'email'      => $data['email'],
                'password'   => $hashedPassword,
                'department' => $data['department'],
                'session'    => $data['session'],
                'phone'      => $data['phone'],
                'is_admin'   => false,
            ]);
        }

        // -------------------------------------------------------------
        // 2. GENERATE 5 NEW CLUBS
        // -------------------------------------------------------------
        $clubsData = [
            [
                'name'          => 'NSTU Software Engineering Society',
                'category'      => 'Technology',
                'description'   => 'Fostering excellence in modern software design, open-source development, systems architecture, and cloud computing.',
                'department'    => 'Software Engineering',
                'contact_email' => 'sesociety@nstu.edu.bd',
                'contact_phone' => '01811000001',
                'reason'        => 'Established to bridge academic computer science education with industry-grade software engineering practices.',
                'creator_idx'   => 0, // User 1
                'advisor'       => [
                    'name'        => 'Dr. Mohammad Ali',
                    'designation' => 'Associate Professor',
                    'department'  => 'Software Engineering',
                    'email'       => 'mali@nstu.edu.bd',
                    'phone'       => '01899000001',
                ],
                'has_recruitment' => true,
            ],
            [
                'name'          => 'NSTU Innovation & Entrepreneurship Club',
                'category'      => 'Business & Entrepreneurship',
                'description'   => 'Empowering students to launch startups, pitch innovative business solutions, and scale high-growth technology ventures.',
                'department'    => 'Management',
                'contact_email' => 'iec@nstu.edu.bd',
                'contact_phone' => '01811000002',
                'reason'        => 'Created to inspire an entrepreneurial mindset and support student-led business initiatives across campus.',
                'creator_idx'   => 3, // User 4
                'advisor'       => [
                    'name'        => 'Prof. Syeda Naznin',
                    'designation' => 'Professor',
                    'department'  => 'Management',
                    'email'       => 'snaznin@nstu.edu.bd',
                    'phone'       => '01899000002',
                ],
                'has_recruitment' => true,
            ],
            [
                'name'          => 'NSTU Photography & Media Association',
                'category'      => 'Arts & Media',
                'description'   => 'Capturing moments, training digital visual arts, filmmaking, graphic design, photojournalism, and visual storytelling.',
                'department'    => 'English',
                'contact_email' => 'photo.media@nstu.edu.bd',
                'contact_phone' => '01811000003',
                'reason'        => 'Formed to promote creative photography, documentary filmmaking, and media coverage for university events.',
                'creator_idx'   => 6, // User 7
                'advisor'       => [
                    'name'        => 'Dr. Kamrul Islam',
                    'designation' => 'Assistant Professor',
                    'department'  => 'English',
                    'email'       => 'kislam@nstu.edu.bd',
                    'phone'       => '01899000003',
                ],
                'has_recruitment' => false,
            ],
            [
                'name'          => 'NSTU Green & Eco Warriors',
                'category'      => 'Environment',
                'description'   => 'Dedicated to environmental conservation, campus tree plantation, waste recycling, and active climate conservation.',
                'department'    => 'Environmental Science',
                'contact_email' => 'ecowarriors@nstu.edu.bd',
                'contact_phone' => '01811000004',
                'reason'        => 'Launched to raise climate awareness, lead sustainability drives, and maintain a green university environment.',
                'creator_idx'   => 9, // User 10
                'advisor'       => [
                    'name'        => 'Dr. Shamsul Hoque',
                    'designation' => 'Professor',
                    'department'  => 'Environmental Science',
                    'email'       => 'shoque@nstu.edu.bd',
                    'phone'       => '01899000004',
                ],
                'has_recruitment' => false,
            ],
            [
                'name'          => 'NSTU Badminton & Indoor Games Club',
                'category'      => 'Sports',
                'description'   => 'Organizing intra-university badminton tournaments, table tennis leagues, and promoting athletic fitness.',
                'department'    => 'Public Health',
                'contact_email' => 'badminton.club@nstu.edu.bd',
                'contact_phone' => '01811000005',
                'reason'        => 'Promoting physical fitness, sportsmanship, and competitive indoor sports among university students.',
                'creator_idx'   => 12, // User 13
                'advisor'       => [
                    'name'        => 'Dr. Rafiqul Bari',
                    'designation' => 'Associate Professor',
                    'department'  => 'Public Health',
                    'email'       => 'rbari@nstu.edu.bd',
                    'phone'       => '01899000005',
                ],
                'has_recruitment' => false,
            ],
        ];

        $clubs = [];
        foreach ($clubsData as $idx => $cData) {
            $creator = $users[$cData['creator_idx']];
            
            $club = Club::create([
                'name'          => $cData['name'],
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
            ]);
            $clubs[] = $club;

            // Assign 3 members per club from the 15 users
            $u1 = $users[$idx * 3];
            $u2 = $users[$idx * 3 + 1];
            $u3 = $users[$idx * 3 + 2];

            ClubMember::create([
                'club_id'   => $club->id,
                'user_id'   => $u1->id,
                'role'      => 'president',
                'status'    => 'active',
                'joined_at' => now(),
            ]);

            ClubMember::create([
                'club_id'   => $club->id,
                'user_id'   => $u2->id,
                'role'      => 'vice_president',
                'status'    => 'active',
                'joined_at' => now(),
            ]);

            ClubMember::create([
                'club_id'   => $club->id,
                'user_id'   => $u3->id,
                'role'      => 'secretary',
                'status'    => 'active',
                'joined_at' => now(),
            ]);
        }

        // -------------------------------------------------------------
        // 3. GENERATE ONE EVENT FOR EACH OF THE 5 CLUBS
        // -------------------------------------------------------------
        $eventsData = [
            [
                'club_idx'       => 0,
                'title'          => 'National Hackathon 2026: Code for Impact',
                'description'    => 'A 36-hour continuous hackathon bringing together software engineers to solve real-world problems in healthcare, finance, and climate change.',
                'status'         => 'published',
                'visibility'     => 'public',
                'location_type'  => 'physical',
                'location_value' => 'CSTE Software Engineering Lab, Academic Building 2',
                'starts_at'      => Carbon::now()->addDays(15)->setHour(9)->setMinute(0),
                'ends_at'        => Carbon::now()->addDays(16)->setHour(21)->setMinute(0),
                'capacity'       => 120,
                'custom_fields'  => [
                    ['name' => 'GitHub Profile URL', 'type' => 'text', 'required' => true],
                    ['name' => 'Years of Coding Experience', 'type' => 'number', 'required' => true],
                ],
            ],
            [
                'club_idx'       => 1,
                'title'          => 'Campus Venture Pitch Summit 2026',
                'description'    => 'Pitch your startup idea to top venture capitalists and industry mentors for seed funding, incubator space, and executive mentorship.',
                'status'         => 'published',
                'visibility'     => 'public',
                'location_type'  => 'physical',
                'location_value' => 'Central Business Auditorium, NSTU Main Campus',
                'starts_at'      => Carbon::now()->addDays(20)->setHour(10)->setMinute(0),
                'ends_at'        => Carbon::now()->addDays(20)->setHour(17)->setMinute(0),
                'capacity'       => 200,
                'custom_fields'  => [
                    ['name' => 'Startup Concept Title', 'type' => 'text', 'required' => true],
                    ['name' => 'Pitch Deck Google Drive Link', 'type' => 'text', 'required' => true],
                ],
            ],
            [
                'club_idx'       => 2,
                'title'          => 'Masterclass in Architectural & Street Photography',
                'description'    => 'Interactive online workshop featuring guest celebrity photographer discussing lighting, composition, and post-processing in Lightroom.',
                'status'         => 'published',
                'visibility'     => 'public',
                'location_type'  => 'online',
                'location_value' => 'https://meet.google.com/nstu-photo-masterclass-2026',
                'starts_at'      => Carbon::now()->addDays(10)->setHour(19)->setMinute(0),
                'ends_at'        => Carbon::now()->addDays(10)->setHour(21)->setMinute(0),
                'capacity'       => 150,
                'custom_fields'  => [
                    ['name' => 'Camera Model / Gear', 'type' => 'text', 'required' => false],
                ],
            ],
            [
                'club_idx'       => 3,
                'title'          => 'Annual Campus Cleanliness & Tree Plantation Drive',
                'description'    => 'Join us as we plant 500 indigenous tree saplings across campus grounds and lead a zero-single-use-plastic awareness rally.',
                'status'         => 'published',
                'visibility'     => 'public',
                'location_type'  => 'physical',
                'location_value' => 'Main Campus Library Plaza',
                'starts_at'      => Carbon::now()->addDays(7)->setHour(8)->setMinute(30),
                'ends_at'        => Carbon::now()->addDays(7)->setHour(13)->setMinute(0),
                'capacity'       => 300,
                'custom_fields'  => [
                    ['name' => 'Volunteer T-Shirt Size', 'type' => 'text', 'required' => true],
                ],
            ],
            [
                'club_idx'       => 4,
                'title'          => 'Inter-Department Badminton Championship 2026',
                'description'    => 'Singles and doubles badminton tournament open to all registered undergraduate and postgraduate students of the university.',
                'status'         => 'published',
                'visibility'     => 'public',
                'location_type'  => 'physical',
                'location_value' => 'University Indoor Gymnasium Complex',
                'starts_at'      => Carbon::now()->addDays(25)->setHour(15)->setMinute(0),
                'ends_at'        => Carbon::now()->addDays(28)->setHour(20)->setMinute(0),
                'capacity'       => 64,
                'custom_fields'  => [
                    ['name' => 'Category (Singles/Doubles)', 'type' => 'text', 'required' => true],
                    ['name' => 'Partner Name (if Doubles)', 'type' => 'text', 'required' => false],
                ],
            ],
        ];

        foreach ($eventsData as $eData) {
            $club = $clubs[$eData['club_idx']];
            $creator = $users[$clubsData[$eData['club_idx']]['creator_idx']];

            Event::create([
                'club_id'        => $club->id,
                'created_by'     => $creator->id,
                'title'          => $eData['title'],
                'description'    => $eData['description'],
                'status'         => $eData['status'],
                'visibility'     => $eData['visibility'],
                'location_type'  => $eData['location_type'],
                'location_value' => $eData['location_value'],
                'starts_at'      => $eData['starts_at'],
                'ends_at'        => $eData['ends_at'],
                'capacity'       => $eData['capacity'],
                'custom_fields'  => $eData['custom_fields'],
            ]);
        }

        // -------------------------------------------------------------
        // 4. GENERATE RECRUITMENT NOTICES (2 CLUBS WITH RECRUITMENT OPEN)
        // -------------------------------------------------------------

        // Club 0 (NSTU Software Engineering Society)
        RecruitmentNotice::create([
            'club_id'         => $clubs[0]->id,
            'created_by'      => $users[0]->id,
            'title'           => 'Software Engineering Society Executive & Member Recruitment 2026',
            'session'         => '26',
            'target_sessions' => [24, 25, 26],
            'description'     => 'We are seeking passionate software developers, UI/UX designers, and competitive programmers to join our core technical wings.',
            'requirements'    => 'Basic understanding of programming fundamentals (Python, C++, or JavaScript), willingness to collaborate on open-source projects, and attendance at weekly tech workshops.',
            'custom_fields'   => [
                ['name' => 'Preferred Technical Wing', 'type' => 'text', 'required' => true],
                ['name' => 'GitHub or Portfolio URL', 'type' => 'text', 'required' => true],
                ['name' => 'Why do you wish to join SES?', 'type' => 'text', 'required' => true],
            ],
            'opens_at'        => Carbon::now()->subDays(3),
            'closes_at'       => Carbon::now()->addDays(14),
            'status'          => 'open',
        ]);

        // Club 1 (NSTU Innovation & Entrepreneurship Club)
        RecruitmentNotice::create([
            'club_id'         => $clubs[1]->id,
            'created_by'      => $users[3]->id,
            'title'           => 'Innovation & Entrepreneurship Club Team Recruitment 2026',
            'session'         => '26',
            'target_sessions' => [23, 24, 25, 26],
            'description'     => 'Join the team driving startup culture and business innovation on campus! Positions available in Event Management, Corporate Relations, Public Relations, and Graphic Design.',
            'requirements'    => 'Strong leadership capability, excellent communication skills, initiative to organize large-scale summits, and passion for startup ecosystems.',
            'custom_fields'   => [
                ['name' => 'Preferred Executive Role', 'type' => 'text', 'required' => true],
                ['name' => 'Relevant Prior Experience', 'type' => 'text', 'required' => true],
            ],
            'opens_at'        => Carbon::now()->subDays(2),
            'closes_at'       => Carbon::now()->addDays(18),
            'status'          => 'open',
        ]);
    }
}
