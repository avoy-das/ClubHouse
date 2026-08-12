# ClubHouse — Project File Structure & Architecture Summary

A complete, production-ready university/organization club management platform built with a **Laravel 12 (PHP 8.2+)** RESTful backend and a **React 19 (Vite + Tailwind CSS)** single-page application frontend.

---

## 1. Backend File Structure (`backend/`)

```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/                  # 21 RESTful Controllers
│   │   │   ├── AnnouncementController.php
│   │   │   ├── AuditLogController.php
│   │   │   ├── AuthController.php
│   │   │   ├── ClubController.php
│   │   │   ├── ClubEditRequestController.php
│   │   │   ├── ClubGalleryController.php
│   │   │   ├── ClubMemberController.php
│   │   │   ├── ClubMemberPositionController.php
│   │   │   ├── ClubPositionController.php
│   │   │   ├── Controller.php           # Base controller
│   │   │   ├── DashboardController.php
│   │   │   ├── EventController.php
│   │   │   ├── EventFeedbackController.php
│   │   │   ├── EventRegistrationController.php
│   │   │   ├── MembershipRequestController.php
│   │   │   ├── NotificationController.php
│   │   │   ├── RecruitmentApplicationController.php
│   │   │   ├── RecruitmentNoticeController.php
│   │   │   ├── ReportController.php
│   │   │   ├── SearchController.php
│   │   │   └── UserController.php
│   │   │
│   │   ├── Middleware/
│   │   │   └── IsAdmin.php               # Admin privilege guard
│   │   │
│   │   └── Requests/                     # 18 Form Request classes
│   │       ├── CreateClubRequest.php
│   │       ├── LoginRequest.php
│   │       ├── MarkAttendanceRequest.php
│   │       ├── RegisterRequest.php
│   │       ├── StoreAnnouncementRequest.php
│   │       ├── StoreClubPositionRequest.php
│   │       ├── StoreClubRequest.php
│   │       ├── StoreEventFeedbackRequest.php
│   │       ├── StoreEventRequest.php
│   │       ├── StoreMembershipRequestRequest.php
│   │       ├── StoreRecruitmentApplicationRequest.php
│   │       ├── StoreRecruitmentNoticeRequest.php
│   │       ├── UpdateAnnouncementRequest.php
│   │       ├── UpdateClubPositionRequest.php
│   │       ├── UpdateClubRequest.php
│   │       ├── UpdateEventRequest.php
│   │       ├── UpdateEventStatusRequest.php
│   │       └── UpdateRecruitmentNoticeRequest.php
│   │
│   ├── Models/                           # 16 Eloquent Domain Models
│   │   ├── Announcement.php
│   │   ├── AuditLog.php
│   │   ├── Club.php
│   │   ├── ClubEditRequest.php
│   │   ├── ClubGallery.php
│   │   ├── ClubMember.php
│   │   ├── ClubMemberPosition.php
│   │   ├── ClubPosition.php
│   │   ├── Event.php
│   │   ├── EventFeedback.php
│   │   ├── EventRegistration.php
│   │   ├── MembershipRequest.php
│   │   ├── Notification.php
│   │   ├── RecruitmentApplication.php
│   │   ├── RecruitmentNotice.php
│   │   └── User.php
│   │
│   ├── Observers/
│   │   └── AuditObserver.php             # Automated model audit logging
│   │
│   ├── Policies/                         # 7 Authorization Policies
│   │   ├── AnnouncementPolicy.php
│   │   ├── ClubPolicy.php
│   │   ├── EventPolicy.php
│   │   ├── EventRegistrationPolicy.php
│   │   ├── MembershipRequestPolicy.php
│   │   ├── RecruitmentApplicationPolicy.php
│   │   └── RecruitmentNoticePolicy.php
│   │
│   ├── Providers/
│   │   └── AppServiceProvider.php
│   │
│   └── Services/
│       └── ClubMembershipService.php     # Membership & permission rules logic
│
├── config/                               # 12 Configuration Files
│   ├── app.php
│   ├── auth.php
│   ├── cache.php
│   ├── cors.php
│   ├── database.php
│   ├── filesystems.php
│   ├── logging.php
│   ├── mail.php
│   ├── queue.php
│   ├── sanctum.php                       # API token authentication setup
│   ├── services.php
│   └── session.php
│
├── database/
│   ├── database.sqlite                   # SQLite development database file
│   ├── factories/                        # Model factories for testing
│   ├── seeders/                          # Database seeders
│   └── migrations/                       # 50 Schema migrations
│
├── routes/
│   ├── api.php                           # Complete API endpoint routes
│   ├── console.php                       # Console command routes
│   └── web.php                           # Base web route
│
├── public/                               # Public assets & index.php entry
├── storage/                              # Uploaded files, logs, and cache
├── tests/                                # Feature and unit test suites
├── bootstrap/                            # Framework bootstrap & middleware configuration
├── composer.json / composer.lock
├── artisan
├── phpunit.xml
└── vite.config.js
```

---

## 2. Frontend File Structure (`frontend/`)

```
frontend/
├── src/
│   ├── App.jsx                           # Main application router with route protection
│   ├── main.jsx                          # React application entry point
│   ├── index.css                         # Tailwind CSS base directive imports
│   │
│   ├── components/                       # Shared UI & layout components
│   │   ├── admin/
│   │   │   └── UserManagementSection.jsx
│   │   ├── clubs/                        # Club specific components
│   │   │   ├── AddCommitteeMemberModal.jsx
│   │   │   ├── ClubAuditLogModal.jsx
│   │   │   ├── ClubCard.jsx
│   │   │   ├── EditAdvisorModal.jsx
│   │   │   ├── EditClubModal.jsx
│   │   │   ├── MembersDirectory.jsx
│   │   │   ├── MembershipRequestList.jsx
│   │   │   ├── PositionAssignment.jsx
│   │   │   └── TransferPresidencyModal.jsx
│   │   ├── Events/                       # Event specific components
│   │   │   ├── AttendanceReportModal.jsx
│   │   │   ├── EventModal.jsx
│   │   │   └── MarkAttendanceModal.jsx
│   │   ├── layout/
│   │   │   ├── AppLayout.jsx             # Main layout shell
│   │   │   ├── Navbar.jsx                # Header bar with unread badge & profile menu
│   │   │   └── SearchBar.jsx             # Topbar search component
│   │   └── ui/                           # Reusable UI primitives
│   │       ├── Badge.jsx
│   │       ├── Button.jsx
│   │       ├── Card.jsx
│   │       ├── ErrorBanner.jsx
│   │       ├── LoadingSpinner.jsx
│   │       ├── Modal.jsx
│   │       └── SuccessBanner.jsx
│   │
│   ├── context/                          # React Context Providers
│   │   ├── AuthContext.jsx               # Auth state, login, logout, user profile
│   │   └── ClubPermissionsContext.jsx    # Club-level executive permission resolver
│   │
│   ├── pages/                            # 12 Page Feature Folders
│   │   ├── Admin/                        # AdminClubList, AdminClubs, AdminUsers, AdminAuditLogs, AdminReports
│   │   ├── Announcements/                # AnnouncementList
│   │   ├── Clubs/                        # ClubList, ClubDetail, CreateClub, ClubForm, ClubMembers
│   │   ├── Dashboard/                    # Dashboard (Student, Executive, and Admin views)
│   │   ├── Events/                       # EventsPage, EventDetailPage, EventDetail, EventAttendance, EventForm, EventList
│   │   ├── Login/                        # Login
│   │   ├── Notifications/                # NotificationList
│   │   ├── Profile/                      # ProfilePage
│   │   ├── Recruitment/                  # RecruitmentList, RecruitmentDetail, RecruitmentApplications
│   │   ├── Register/                     # Register
│   │   ├── Search/                       # SearchPage
│   │   └── Users/                        # User administration
│   │
│   ├── routes/                           # Route Protection Guards
│   │   ├── ProtectedRoute.jsx            # Authentication guard
│   │   ├── AdminRoute.jsx                # Platform Admin guard
│   │   └── ClubExecutiveRoute.jsx        # Club Executive guard
│   │
│   └── services/                         # 10 Service Layer Modules
│       ├── adminService.js
│       ├── announcementService.js
│       ├── api.js                        # Axios instance with Bearer token interceptor
│       ├── authService.js
│       ├── clubService.js
│       ├── eventService.js
│       ├── membershipService.js
│       ├── notificationService.js
│       ├── recruitmentService.js
│       └── searchService.js
│
├── public/                               # Static public assets
├── package.json / package-lock.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
└── .oxlintrc.json
```

---

## 3. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    User ||--o{ ClubMember : "joins"
    User ||--o{ MembershipRequest : "submits"
    User ||--o{ EventRegistration : "registers"
    User ||--o{ RecruitmentApplication : "applies"
    User ||--o{ AuditLog : "triggers"
    User ||--o{ Notification : "receives"
    User ||--o{ ClubEditRequest : "requests"
    
    Club ||--o{ ClubMember : "has"
    Club ||--o{ ClubPosition : "defines"
    Club ||--o{ Event : "hosts"
    Club ||--o{ Announcement : "publishes"
    Club ||--o{ RecruitmentNotice : "posts"
    Club ||--o{ ClubGallery : "contains"
    Club ||--o{ ClubEditRequest : "receives_edits"

    ClubMember ||--o{ ClubMemberPosition : "holds"
    ClubPosition ||--o{ ClubMemberPosition : "assigned_to"

    Event ||--o{ EventRegistration : "tracks"
    Event ||--o{ EventFeedback : "receives"

    RecruitmentNotice ||--o{ RecruitmentApplication : "collects"
```
