<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Club;
use App\Models\Event;

$targetEmails = [
    'admin2@clubhouse.edu',
    'rahim.robotics@nstu.edu.bd',
    'nusrat.robotics@nstu.edu.bd',
    'tanvir.debate@nstu.edu.bd',
    'sultana.member@nstu.edu.bd'
];

echo "=== CREATED USERS ===" . PHP_EOL;
foreach (User::whereIn('email', $targetEmails)->get() as $u) {
    echo "- Name: {$u->name} | Email: {$u->email} | Admin: " . ($u->is_admin ? 'YES' : 'NO') . " | Student ID: {$u->student_id}" . PHP_EOL;
}

echo PHP_EOL . "=== CREATED CLUBS & MEMBERSHIPS ===" . PHP_EOL;
foreach (Club::whereIn('name', ['Robotics & Automation Society', 'NSTU Debate Club'])->with('members.user')->get() as $c) {
    echo "Club: {$c->name} [Category: {$c->category}, Status: {$c->status}]" . PHP_EOL;
    foreach ($c->members as $m) {
        echo "  - {$m->user->name} ({$m->user->email}) -> Role: {$m->role}" . PHP_EOL;
    }
}

echo PHP_EOL . "=== CREATED EVENTS ===" . PHP_EOL;
foreach (Event::with('club')->whereIn('club_id', Club::whereIn('name', ['Robotics & Automation Society', 'NSTU Debate Club'])->pluck('id'))->get() as $e) {
    echo "- Event: {$e->title}" . PHP_EOL;
    echo "  Club: {$e->club->name} | Status: {$e->status} | Visibility: {$e->visibility} | Type: {$e->location_type} | Location: {$e->location_value} | Capacity: {$e->capacity}" . PHP_EOL;
}
