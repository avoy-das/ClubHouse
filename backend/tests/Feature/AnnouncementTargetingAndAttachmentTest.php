<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Club;
use App\Models\ClubMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AnnouncementTargetingAndAttachmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_post_announcement_with_attachment_and_admin_sender_role()
    {
        Storage::fake('public');

        $admin = User::factory()->create(['is_admin' => true]);
        $file = UploadedFile::fake()->create('event_details.pdf', 1024, 'application/pdf');

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/announcements', [
                'title'       => 'Platform Infrastructure Upgrade',
                'body'        => 'Maintenance scheduled for midnight.',
                'from_type'   => 'admin',
                'target_type' => 'all_users',
                'attachment'  => $file,
            ]);

        $response->assertStatus(201);
        $announcementId = $response->json('id');

        $this->assertDatabaseHas('announcements', [
            'id'                => $announcementId,
            'title'             => 'Platform Infrastructure Upgrade',
            'sender_type'       => 'admin',
            'sender_role_label' => 'Administrator',
            'attachment_name'   => 'event_details.pdf',
        ]);

        $announcement = Announcement::find($announcementId);
        Storage::disk('public')->assertExists($announcement->attachment_path);
    }

    public function test_club_executive_can_post_public_announcement_from_club()
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $execUser = User::factory()->create(['is_admin' => false]);

        $club = Club::create([
            'name'          => 'Robotics Club',
            'category'      => 'Science',
            'description'   => 'Robotics club description',
            'reason'        => 'Reason',
            'status'        => 'approved',
            'created_by'    => $admin->id,
            'contact_email' => 'robotics@clubhouse.ac.bd',
        ]);

        ClubMember::create([
            'club_id'   => $club->id,
            'user_id'   => $execUser->id,
            'role'      => 'president',
            'joined_at' => now(),
            'status'    => 'active',
        ]);

        $response = $this->actingAs($execUser, 'sanctum')
            ->postJson("/api/clubs/{$club->id}/announcements", [
                'title'        => 'Annual Tech Fest Open to All Visitors',
                'body'         => 'Everyone is invited to visit our exhibition!',
                'from_type'    => 'club',
                'from_club_id' => $club->id,
                'target_type'  => 'public',
            ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('announcements', [
            'title'             => 'Annual Tech Fest Open to All Visitors',
            'sender_type'       => 'club',
            'sender_role_label' => 'President of Robotics Club',
            'target_type'       => 'public',
        ]);
    }

    public function test_generic_all_user_announcement_is_hidden_from_club_announcement_list()
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $member = User::factory()->create(['is_admin' => false]);

        $club = Club::create([
            'name'          => 'Music Club',
            'category'      => 'Arts',
            'description'   => 'Music club',
            'reason'        => 'Reason',
            'status'        => 'approved',
            'created_by'    => $admin->id,
            'contact_email' => 'music@clubhouse.ac.bd',
        ]);

        ClubMember::create([
            'club_id'   => $club->id,
            'user_id'   => $member->id,
            'role'      => 'member',
            'joined_at' => now(),
            'status'    => 'active',
        ]);

        // 1. Generic platform-wide announcement from Admin
        $adminAnn = Announcement::create([
            'title'             => 'Platform Server Maintenance',
            'body'              => 'General notice for all users',
            'posted_by'         => $admin->id,
            'sender_type'       => 'admin',
            'sender_role_label' => 'Administrator',
            'target_type'       => 'all_users',
        ]);

        // 2. Club X Public Announcement
        $clubAnn = Announcement::create([
            'club_id'           => $club->id,
            'target_club_id'    => $club->id,
            'title'             => 'Music Club Jam Session',
            'body'              => 'Join us in room 302',
            'posted_by'         => $admin->id,
            'sender_type'       => 'club',
            'sender_role_label' => 'President of Music Club',
            'target_type'       => 'public',
        ]);

        // Call club announcements endpoint
        $res = $this->actingAs($member, 'sanctum')->getJson("/api/clubs/{$club->id}/announcements");
        $res->assertStatus(200);

        $returnedIds = collect($res->json())->pluck('id')->toArray();

        // Must contain club announcement
        $this->assertContains($clubAnn->id, $returnedIds);
        // Must NOT contain generic platform all_users announcement
        $this->assertNotContains($adminAnn->id, $returnedIds);
    }

    public function test_standalone_announcements_feed_contains_both_without_duplicates()
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $member = User::factory()->create(['is_admin' => false]);

        $club = Club::create([
            'name'          => 'Debate Club',
            'category'      => 'Arts',
            'description'   => 'Debate club',
            'reason'        => 'Reason',
            'status'        => 'approved',
            'created_by'    => $admin->id,
            'contact_email' => 'debate@clubhouse.ac.bd',
        ]);

        ClubMember::create([
            'club_id'   => $club->id,
            'user_id'   => $member->id,
            'role'      => 'member',
            'joined_at' => now(),
            'status'    => 'active',
        ]);

        // Generic platform announcement
        $adminAnn = Announcement::create([
            'title'       => 'System Wide Announcement',
            'body'        => 'Body',
            'posted_by'   => $admin->id,
            'target_type' => 'all_users',
        ]);

        // Club member announcement
        $clubAnn = Announcement::create([
            'club_id'        => $club->id,
            'target_club_id' => $club->id,
            'title'          => 'Debate Club Internal Notice',
            'body'           => 'Body',
            'posted_by'      => $admin->id,
            'target_type'    => 'club_members',
        ]);

        $res = $this->actingAs($member, 'sanctum')->getJson('/api/announcements');
        $res->assertStatus(200);

        $returnedIds = collect($res->json())->pluck('id')->toArray();

        $this->assertContains($adminAnn->id, $returnedIds);
        $this->assertContains($clubAnn->id, $returnedIds);
        $this->assertEquals(count($returnedIds), count(array_unique($returnedIds)));
    }

    public function test_public_club_announcement_is_hidden_from_standalone_announcements_feed()
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $user = User::factory()->create(['is_admin' => false]);

        $club = Club::create([
            'name'          => 'Astronomy Club',
            'category'      => 'Science',
            'description'   => 'Astronomy club',
            'reason'        => 'Reason',
            'status'        => 'approved',
            'created_by'    => $admin->id,
            'contact_email' => 'astronomy@clubhouse.ac.bd',
        ]);

        $publicAnn = Announcement::create([
            'club_id'        => $club->id,
            'target_club_id' => $club->id,
            'title'          => 'Public Stargazing Event for Visitors',
            'body'           => 'Join us on campus lawn',
            'posted_by'      => $admin->id,
            'target_type'    => 'public',
        ]);

        // Main standalone announcement feed must NOT contain public club announcements
        $res = $this->actingAs($user, 'sanctum')->getJson('/api/announcements');
        $res->assertStatus(200);

        $returnedIds = collect($res->json())->pluck('id')->toArray();
        $this->assertNotContains($publicAnn->id, $returnedIds);

        // But club page announcement list MUST contain it for visitors and members
        $clubRes = $this->getJson("/api/clubs/{$club->id}/announcements");
        $clubRes->assertStatus(200);
        $clubReturnedIds = collect($clubRes->json())->pluck('id')->toArray();
        $this->assertContains($publicAnn->id, $clubReturnedIds);
    }

    public function test_admin_who_is_not_club_executive_cannot_send_as_club_executive()
    {
        $adminNotExec = User::factory()->create(['is_admin' => true]);

        $club = Club::create([
            'name'          => 'Chess Club',
            'category'      => 'Games',
            'description'   => 'Chess club',
            'reason'        => 'Reason',
            'status'        => 'approved',
            'created_by'    => $adminNotExec->id,
            'contact_email' => 'chess@clubhouse.ac.bd',
        ]);

        // Attempting to post as club executive when admin is not an executive of Chess Club -> 403
        $response = $this->actingAs($adminNotExec, 'sanctum')
            ->postJson('/api/announcements', [
                'title'        => 'Unauthorized Club Post',
                'body'         => 'Test body',
                'from_identity'=> "club_{$club->id}",
                'target_type'  => 'club_members',
            ]);

        $response->assertStatus(403)
            ->assertJsonFragment(['message' => 'Unauthorized. You are not an executive of the selected club.']);
    }

    public function test_announcements_are_sorted_by_pinned_status_then_newest_first()
    {
        $admin = User::factory()->create(['is_admin' => true]);

        // Create older unpinned announcement
        $oldUnpinned = Announcement::create([
            'title'       => 'Old Unpinned',
            'body'        => 'Body',
            'posted_by'   => $admin->id,
            'is_pinned'   => false,
            'target_type' => 'all_users',
        ]);
        $oldUnpinned->created_at = now()->subDays(5);
        $oldUnpinned->save();

        // Create newer unpinned announcement
        $newUnpinned = Announcement::create([
            'title'       => 'New Unpinned',
            'body'        => 'Body',
            'posted_by'   => $admin->id,
            'is_pinned'   => false,
            'target_type' => 'all_users',
        ]);
        $newUnpinned->created_at = now()->subDays(1);
        $newUnpinned->save();

        // Create older pinned announcement
        $oldPinned = Announcement::create([
            'title'       => 'Old Pinned',
            'body'        => 'Body',
            'posted_by'   => $admin->id,
            'is_pinned'   => true,
            'target_type' => 'all_users',
        ]);
        $oldPinned->created_at = now()->subDays(4);
        $oldPinned->save();

        // Create newer pinned announcement
        $newPinned = Announcement::create([
            'title'       => 'New Pinned',
            'body'        => 'Body',
            'posted_by'   => $admin->id,
            'is_pinned'   => true,
            'target_type' => 'all_users',
        ]);
        $newPinned->created_at = now()->subDays(2);
        $newPinned->save();

        $res = $this->actingAs($admin, 'sanctum')->getJson('/api/announcements');
        $res->assertStatus(200);

        $returnedIds = collect($res->json())->pluck('id')->toArray();

        // Pinned announcements must come first, sorted newest to oldest
        // Pinned order: newPinned ($newPinned->id), oldPinned ($oldPinned->id)
        // Followed by unpinned order: newUnpinned ($newUnpinned->id), oldUnpinned ($oldUnpinned->id)
        $this->assertEquals([$newPinned->id, $oldPinned->id, $newUnpinned->id, $oldUnpinned->id], $returnedIds);
    }
}
