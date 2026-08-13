<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClubController;
use App\Http\Controllers\ClubEditRequestController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ClubGalleryController;
use App\Http\Controllers\ClubMemberController;
use App\Http\Controllers\ClubMemberPositionController;
use App\Http\Controllers\ClubPositionController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\EventFeedbackController;
use App\Http\Controllers\EventRegistrationController;
use App\Http\Controllers\MembershipRequestController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\RecruitmentApplicationController;
use App\Http\Controllers\RecruitmentNoticeController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\SearchController;

// Public
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register');
Route::post('/login',    [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware('throttle:60,1')->group(function () {
    Route::get('/clubs',        [ClubController::class, 'index']);
    Route::get('/clubs/{club}', [ClubController::class, 'show'])->where('club', '[0-9]+');
});

// Authenticated
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout',               [AuthController::class, 'logout']);
    Route::post('/logout-all',           [AuthController::class, 'logoutAll']);
    Route::get('/me',                    [AuthController::class, 'me']);
    Route::put('/me',                    [AuthController::class, 'updateProfile']);
    Route::post('/me/change-password',   [AuthController::class, 'changePassword'])->middleware('throttle:change-password');
    Route::get('/me/memberships',        [AuthController::class, 'myMemberships']);
    Route::get('/dashboard',             [DashboardController::class, 'index']);
    Route::get('/search',                SearchController::class);

    // Clubs — authenticated user & executive actions
    Route::get('/clubs/executive',                   [ClubController::class, 'executiveClubs']);
    Route::get('/clubs/{club}/members',               [ClubController::class, 'members']);
    Route::post('/clubs',                            [ClubController::class, 'store']);
    Route::put('/clubs/{club}',                       [ClubController::class, 'update']);
    Route::post('/clubs/{club}',                      [ClubController::class, 'update']); // Support multipart formdata update
    Route::delete('/clubs/{club}/leave',             [ClubController::class, 'leave']);
    Route::put('/clubs/{club}/advisor',               [ClubController::class, 'updateAdvisor']);
    Route::post('/clubs/{club}/transfer-presidency',  [ClubController::class, 'transferPresidency']);
    Route::patch('/clubs/{club}/members/{user}/role', [ClubController::class, 'updateMemberRole']);
    Route::delete('/clubs/{club}/members/{user}',    [ClubController::class, 'removeMember']);
    Route::get('/clubs/{club}/audit-logs',           [ClubController::class, 'auditLogs']);

    // Events — any authenticated user (visibility filtered in controller)
    Route::get('/events',                  [EventController::class, 'index']);
    Route::get('/events/schedule',         [EventController::class, 'schedule']);
    Route::get('/events/{event}',          [EventController::class, 'show']);
    Route::post('/events',                 [EventController::class, 'store']);
    Route::put('/events/{event}',          [EventController::class, 'update']);
    Route::patch('/events/{event}/status', [EventController::class, 'updateStatus']);
    Route::delete('/events/{event}',       [EventController::class, 'destroy']);

    // Event Registrations & Attendance
    Route::get('/events/{event}/registrations',                          [EventRegistrationController::class, 'index']);
    Route::post('/events/{event}/register',                              [EventRegistrationController::class, 'register']);
    Route::delete('/events/{event}/register',                            [EventRegistrationController::class, 'cancel']);
    Route::patch('/events/{event}/registrations/{user}/attendance',      [EventRegistrationController::class, 'updateAttendance']);
    Route::get('/events/{event}/attendance-report',                      [EventRegistrationController::class, 'attendanceReport']);
    Route::delete('/events/{event}/registrations/{user}/cancel',         [EventRegistrationController::class, 'execCancel']);
    Route::get('/events/{event}/blocks',                                 [EventRegistrationController::class, 'blocks']);
    Route::post('/events/{event}/blocks',                                [EventRegistrationController::class, 'block']);
    Route::delete('/events/{event}/blocks/{user}',                       [EventRegistrationController::class, 'unblock']);

    // Club Edit Requests
    Route::post('/clubs/{club}/edit-requests',              [ClubEditRequestController::class, 'store']);
    Route::get('/clubs/{club}/edit-requests/pending',      [ClubEditRequestController::class, 'pendingForClub']);

    // Admin only
    Route::middleware('is_admin')->group(function () {

        Route::get('/users',           [UserController::class, 'index']);
        Route::get('/users/{user}',    [UserController::class, 'show']);
        Route::put('/users/{user}',    [UserController::class, 'update']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);

        Route::get('/admin/clubs',                 [ClubController::class, 'adminIndex']);
        Route::put('/admin/clubs/{club}',          [ClubController::class, 'update']);
        Route::delete('/admin/clubs/{club}',       [ClubController::class, 'destroyAdmin']);
        Route::post('/admin/clubs/{club}/approve', [ClubController::class, 'approve']);
        Route::post('/admin/clubs/{club}/reject',  [ClubController::class, 'reject']);
        Route::post('/admin/clubs/{club}/suspend', [ClubController::class, 'suspend']);
        Route::post('/admin/clubs/{club}/activate', [ClubController::class, 'activate']);

        // Legacy / non-prefixed admin club action aliases
        Route::post('/clubs/{club}/approve', [ClubController::class, 'approve']);
        Route::post('/clubs/{club}/reject',  [ClubController::class, 'reject']);
        Route::post('/clubs/{club}/suspend', [ClubController::class, 'suspend']);
        Route::post('/clubs/{club}/activate', [ClubController::class, 'activate']);

        Route::get('/admin/club-edit-requests',                            [ClubEditRequestController::class, 'indexAdmin']);
        Route::post('/admin/club-edit-requests/{clubEditRequest}/approve', [ClubEditRequestController::class, 'approve']);
        Route::post('/admin/club-edit-requests/{clubEditRequest}/reject',  [ClubEditRequestController::class, 'reject']);

        Route::get('/admin/reports/clubs/{club}', [ReportController::class, 'clubReport']);

    });

    // Club positions (executive role catalogue per club)
    Route::apiResource('clubs.positions', ClubPositionController::class)->shallow();

    // Membership requests
    Route::post('/clubs/{club}/membership-requests', [MembershipRequestController::class, 'store']);
    Route::get('/clubs/{club}/membership-requests', [MembershipRequestController::class, 'index']);
    Route::patch('/membership-requests/{membershipRequest}', [MembershipRequestController::class, 'review']);

    // Club members & position assignment
    Route::delete('/clubs/{club}/members/{member}', [ClubMemberController::class, 'destroy']);
    Route::post('/club-members/{member}/positions', [ClubMemberPositionController::class, 'store']);
    Route::post('/clubs/{club}/committee-members', [ClubMemberPositionController::class, 'storeByEmail']);
    Route::delete('/club-members/{member}/positions/{position}', [ClubMemberPositionController::class, 'destroy']);

    // Announcements
    Route::get('/announcements', [AnnouncementController::class, 'allAnnouncements']);
    Route::get('/announcements/creation-context', [AnnouncementController::class, 'creationContext']);
    Route::post('/announcements', [AnnouncementController::class, 'store']);
    Route::post('/announcements/{announcement}/unpin', [AnnouncementController::class, 'unpin']);
    Route::get('/clubs/{club}/announcement-members', [AnnouncementController::class, 'clubMembers']);
    Route::apiResource('clubs.announcements', AnnouncementController::class)->shallow();

    // Events
    Route::apiResource('clubs.events', EventController::class)->shallow();

    // Feedback
    Route::get('/events/{event}/feedback/summary', [EventFeedbackController::class, 'summary']);
    Route::get('/events/{event}/feedback', [EventFeedbackController::class, 'index']);
    Route::post('/events/{event}/feedback', [EventFeedbackController::class, 'store']);
    Route::put('/events/{event}/feedback', [EventFeedbackController::class, 'update']);
    Route::delete('/events/{event}/feedback', [EventFeedbackController::class, 'destroy']);

    // Recruitment
    Route::get('/recruitment-notices', [RecruitmentNoticeController::class, 'index']);
    Route::apiResource('clubs.recruitment-notices', RecruitmentNoticeController::class)->shallow();
    Route::post('/recruitment-notices/{recruitmentNotice}/apply', [RecruitmentApplicationController::class, 'store']);
    Route::get('/recruitment-notices/{recruitmentNotice}/applications', [RecruitmentApplicationController::class, 'index']);
    Route::patch('/recruitment-applications/{application}', [RecruitmentApplicationController::class, 'review']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllRead']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead']);

    // Club Gallery
    Route::get('/clubs/{club}/galleries', [ClubGalleryController::class, 'index']);
    Route::post('/clubs/{club}/galleries', [ClubGalleryController::class, 'store']);
    Route::delete('/galleries/{gallery}', [ClubGalleryController::class, 'destroy']);

    // Admin oversight reports & audit logs
    Route::middleware('is_admin')->group(function () {
        Route::get('/admin/reports/overview', [ReportController::class, 'overview']);
        Route::get('/admin/audit-logs/export', [AuditLogController::class, 'export']);
        Route::get('/admin/audit-logs', [AuditLogController::class, 'index']);
    });
});