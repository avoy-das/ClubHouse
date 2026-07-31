<?php

use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CertificateController;
use App\Http\Controllers\ClubController;
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
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);
Route::get('/clubs',     [ClubController::class, 'index']);
Route::get('/clubs/{club}', [ClubController::class, 'show']);

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);

    // Admin user management (existing)
    Route::middleware('is_admin')->group(function () {
        Route::get('/users',        [UserController::class, 'index']);
        Route::get('/users/{user}', [UserController::class, 'show']);
        Route::put('/users/{user}', [UserController::class, 'update']);
    });

    // Clubs
    Route::apiResource('clubs', ClubController::class)->except(['index', 'show']);
    Route::post('/clubs/{club}/approve', [ClubController::class, 'approve'])->middleware('is_admin');
    Route::post('/clubs/{club}/reject',  [ClubController::class, 'reject'])->middleware('is_admin');
    Route::post('/clubs/{club}/suspend', [ClubController::class, 'suspend'])->middleware('is_admin');

    // Club positions (executive role catalogue per club)
    Route::apiResource('clubs.positions', ClubPositionController::class)->shallow();

    // Membership requests
    Route::post('/clubs/{club}/membership-requests', [MembershipRequestController::class, 'store']);
    Route::get('/clubs/{club}/membership-requests', [MembershipRequestController::class, 'index']);
    Route::patch('/membership-requests/{membershipRequest}', [MembershipRequestController::class, 'review']);

    // Club members & position assignment
    Route::get('/clubs/{club}/members', [ClubMemberController::class, 'index']);
    Route::delete('/clubs/{club}/members/{member}', [ClubMemberController::class, 'destroy']);
    Route::post('/club-members/{member}/positions', [ClubMemberPositionController::class, 'store']);
    Route::delete('/club-members/{member}/positions/{position}', [ClubMemberPositionController::class, 'destroy']);

    // Announcements
    Route::apiResource('clubs.announcements', AnnouncementController::class)->shallow();

    // Events
    Route::get('/events', [EventController::class, 'index']);
    Route::apiResource('clubs.events', EventController::class)->shallow();

    // Event registration & attendance
    Route::post('/events/{event}/register', [EventRegistrationController::class, 'store']);
    Route::delete('/events/{event}/register', [EventRegistrationController::class, 'destroy']);
    Route::get('/events/{event}/registrations', [EventRegistrationController::class, 'index']);
    Route::patch('/events/{event}/registrations/{registration}/attendance', [EventRegistrationController::class, 'markAttendance']);

    // Certificates
    Route::get('/certificates', [CertificateController::class, 'index']);
    Route::get('/certificates/{certificate}/download', [CertificateController::class, 'download']);

    // Feedback
    Route::post('/events/{event}/feedback', [EventFeedbackController::class, 'store']);

    // Recruitment
    Route::apiResource('clubs.recruitment-notices', RecruitmentNoticeController::class)->shallow();
    Route::post('/recruitment-notices/{recruitmentNotice}/apply', [RecruitmentApplicationController::class, 'store']);
    Route::get('/recruitment-notices/{recruitmentNotice}/applications', [RecruitmentApplicationController::class, 'index']);
    Route::patch('/recruitment-applications/{application}', [RecruitmentApplicationController::class, 'review']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead']);

    // Club Gallery
    Route::get('/clubs/{club}/galleries', [ClubGalleryController::class, 'index']);
    Route::post('/clubs/{club}/galleries', [ClubGalleryController::class, 'store']);
    Route::delete('/galleries/{gallery}', [ClubGalleryController::class, 'destroy']);

    // Admin oversight reports & audit logs
    Route::middleware('is_admin')->group(function () {
        Route::get('/admin/reports/overview', [ReportController::class, 'overview']);
        Route::get('/admin/audit-logs', [AuditLogController::class, 'index']);
    });
});