# ClubHouse — Backend Development Guide (Laravel 12)

> **Complete Backend Technical Reference.** This guide details the structure, schema, models, controllers, form requests, policies, observers, and API route specifications for the ClubHouse backend built on Laravel 12 and PHP 8.2+.

---

## 1. Database Architecture & Migrations

The database comprises 17 primary domain tables managed through 50 Laravel migrations.

### Table Schema Summary

1. **`users`**: Platform users (students and admins).
   - Columns: `id`, `name`, `student_id`, `email`, `password`, `department`, `phone`, `session`, `is_admin` (boolean), `deleted_at`, `timestamps`.
2. **`clubs`**: University clubs.
   - Columns: `id`, `name`, `slug` (unique), `description`, `category`, `logo_path`, `banner_path`, `advisor_name`, `advisor_email`, `advisor_phone`, `status` (`pending`, `approved`, `rejected`, `suspended`), `permission_doc_path`, `created_by` (FK -> `users`), `timestamps`.
3. **`club_positions`**: Executive & member roles defined per club.
   - Columns: `id`, `club_id` (FK), `title`, `can_manage_members`, `can_manage_events`, `can_manage_announcements`, `can_manage_recruitment`, `can_track_attendance`, `is_default`, `is_executive`, `timestamps`.
4. **`club_members`**: Club membership links.
   - Columns: `id`, `club_id` (FK), `user_id` (FK), `status` (`active`, `inactive`, `removed`), `joined_at`, `timestamps`. Unique `(club_id, user_id)`.
5. **`club_member_positions`**: Assigns club positions to club members.
   - Columns: `id`, `club_member_id` (FK), `club_position_id` (FK), `assigned_at`, `ends_at`, `timestamps`.
6. **`membership_requests`**: Student join requests for clubs.
   - Columns: `id`, `club_id` (FK), `user_id` (FK), `status` (`pending`, `approved`, `rejected`), `message`, `reviewed_by` (FK -> `users`), `reviewed_at`, `timestamps`.
7. **`events`**: Club hosted events.
   - Columns: `id`, `club_id` (FK), `title`, `slug` (unique), `description`, `location`, `start_time`, `end_time`, `capacity`, `is_members_only` (boolean), `status` (`draft`, `published`, `cancelled`, `completed`), `banner_path`, `custom_fields` (JSON), `created_by` (FK -> `users`), `timestamps`.
8. **`event_registrations`**: Student event bookings and attendance records.
   - Columns: `id`, `event_id` (FK), `user_id` (FK), `answers` (JSON), `registered_at`, `attended` (boolean), `attended_at`, `timestamps`. Unique `(event_id, user_id)`.
9. **`certificates`**: Attendance verification certificates.
   - Columns: `id`, `event_registration_id` (FK), `certificate_code` (unique string), `issued_at`, `file_path`, `timestamps`.
10. **`announcements`**: Targeted announcements.
    - Columns: `id`, `club_id` (FK, nullable for global), `title`, `content`, `target_type` (`all`, `club_members`, `executive_only`, `specific_users`), `attachment_path`, `sender_role`, `is_pinned` (boolean), `created_by` (FK -> `users`), `timestamps`.
11. **`recruitment_notices`**: Club recruitment posts.
    - Columns: `id`, `club_id` (FK), `title`, `description`, `session`, `target_sessions` (JSON), `start_date`, `end_date`, `status` (`draft`, `open`, `closed`), `custom_fields` (JSON), `timestamps`.
12. **`recruitment_applications`**: Applications submitted by students.
    - Columns: `id`, `recruitment_notice_id` (FK), `user_id` (FK), `answers` (JSON), `attachment_path`, `status` (`pending`, `accepted`, `rejected`), `notes`, `reviewed_by` (FK -> `users`), `reviewed_at`, `timestamps`.
13. **`event_feedback`**: Student event reviews.
    - Columns: `id`, `event_id` (FK), `user_id` (FK), `rating` (1-5), `comment`, `timestamps`. Unique `(event_id, user_id)`.
14. **`notifications`**: System notifications for users.
    - Columns: `id`, `user_id` (FK), `title`, `message`, `type`, `data` (JSON), `read_at`, `timestamps`.
15. **`audit_logs`**: System audit trail.
    - Columns: `id`, `user_id` (FK, nullable), `club_id` (FK, nullable), `action`, `model_type`, `model_id`, `payload` (JSON), `ip_address`, `timestamps`.
16. **`club_galleries`**: Photo and image media uploaded for a club.
    - Columns: `id`, `club_id` (FK), `image_path`, `caption`, `uploaded_by` (FK -> `users`), `timestamps`.
17. **`club_edit_requests`**: Proposed updates submitted by club executives requiring admin review.
    - Columns: `id`, `club_id` (FK), `requested_by` (FK -> `users`), `proposed_data` (JSON), `status` (`pending`, `approved`, `rejected`), `admin_notes`, `timestamps`.

---

## 2. Controllers & Business Logic (22 Controllers)

| Controller | Primary Actions |
|---|---|
| [AuthController](file:///c:/Users/Popular%20Computer/ClubHouse/backend/app/Http/Controllers/AuthController.php) | `register`, `login`, `logout`, `me`, `updateProfile`, `changePassword`, `myMemberships` |
| [ClubController](file:///c:/Users/Popular%20Computer/ClubHouse/backend/app/Http/Controllers/ClubController.php) | `index`, `show`, `store`, `update`, `executiveClubs`, `members`, `leave`, `approve`, `reject`, `suspend`, `adminIndex`, `destroyAdmin` |
| [ClubPositionController](file:///c:/Users/Popular%20Computer/ClubHouse/backend/app/Http/Controllers/ClubPositionController.php) | `index`, `store`, `show`, `update`, `destroy` |
| [ClubMemberController](file:///c:/Users/Popular%20Computer/ClubHouse/backend/app/Http/Controllers/ClubMemberController.php) | `index`, `destroy` |
| [ClubMemberPositionController](file:///c:/Users/Popular%20Computer/ClubHouse/backend/app/Http/Controllers/ClubMemberPositionController.php) | `store`, `destroy` |
| [MembershipRequestController](file:///c:/Users/Popular%20Computer/ClubHouse/backend/app/Http/Controllers/MembershipRequestController.php) | `index`, `store`, `review` |
| [EventController](file:///c:/Users/Popular%20Computer/ClubHouse/backend/app/Http/Controllers/EventController.php) | `index`, `show`, `store`, `update`, `updateStatus`, `destroy`, `schedule` |
| [EventRegistrationController](file:///c:/Users/Popular%20Computer/ClubHouse/backend/app/Http/Controllers/EventRegistrationController.php) | `index`, `register`, `cancel`, `updateAttendance`, `attendanceReport` |
| [CertificateController](file:///c:/Users/Popular%20Computer/ClubHouse/backend/app/Http/Controllers/CertificateController.php) | `index`, `download` |
| [AnnouncementController](file:///c:/Users/Popular%20Computer/ClubHouse/backend/app/Http/Controllers/AnnouncementController.php) | `index`, `store`, `storeGlobal`, `unpin`, `allAnnouncements`, `creationContext`, `clubMembers` |
| [RecruitmentNoticeController](file:///c:/Users/Popular%20Computer/ClubHouse/backend/app/Http/Controllers/RecruitmentNoticeController.php) | `index`, `show`, `store`, `update`, `destroy` |
| [RecruitmentApplicationController](file:///c:/Users/Popular%20Computer/ClubHouse/backend/app/Http/Controllers/RecruitmentApplicationController.php) | `index`, `store`, `review` |
| [EventFeedbackController](file:///c:/Users/Popular%20Computer/ClubHouse/backend/app/Http/Controllers/EventFeedbackController.php) | `store` |
| [NotificationController](file:///c:/Users/Popular%20Computer/ClubHouse/backend/app/Http/Controllers/NotificationController.php) | `index`, `unreadCount`, `markRead`, `markAllRead` |
| [AuditLogController](file:///c:/Users/Popular%20Computer/ClubHouse/backend/app/Http/Controllers/AuditLogController.php) | `index` |
| [ClubGalleryController](file:///c:/Users/Popular%20Computer/ClubHouse/backend/app/Http/Controllers/ClubGalleryController.php) | `index`, `store`, `destroy` |
| [ClubEditRequestController](file:///c:/Users/Popular%20Computer/ClubHouse/backend/app/Http/Controllers/ClubEditRequestController.php) | `store`, `pendingForClub`, `indexAdmin`, `approve`, `reject` |
| [DashboardController](file:///c:/Users/Popular%20Computer/ClubHouse/backend/app/Http/Controllers/DashboardController.php) | `index` (Aggregate dashboard metrics for student/executive/admin) |
| [ReportController](file:///c:/Users/Popular%20Computer/ClubHouse/backend/app/Http/Controllers/ReportController.php) | `overview`, `clubReport` |
| [SearchController](file:///c:/Users/Popular%20Computer/ClubHouse/backend/app/Http/Controllers/SearchController.php) | Single action search handler for clubs, events, announcements & recruitments |
| [UserController](file:///c:/Users/Popular%20Computer/ClubHouse/backend/app/Http/Controllers/UserController.php) | `index`, `show`, `update`, `destroy` (Admin user oversight) |
| [Controller](file:///c:/Users/Popular%20Computer/ClubHouse/backend/app/Http/Controllers/Controller.php) | Base Laravel controller |

---

## 3. Request Validation (18 Form Requests)

All incoming mutation requests are validated via classes under `app/Http/Requests`:
- `RegisterRequest`, `LoginRequest`
- `CreateClubRequest`, `StoreClubRequest`, `UpdateClubRequest`
- `StoreClubPositionRequest`, `UpdateClubPositionRequest`
- `StoreEventRequest`, `UpdateEventRequest`, `UpdateEventStatusRequest`
- `StoreEventFeedbackRequest`, `MarkAttendanceRequest`
- `StoreAnnouncementRequest`, `UpdateAnnouncementRequest`
- `StoreMembershipRequestRequest`
- `StoreRecruitmentNoticeRequest`, `UpdateRecruitmentNoticeRequest`
- `StoreRecruitmentApplicationRequest`

---

## 4. Policy Authorization (7 Policies)

Authorization logic is decoupled into Laravel Policy classes under `app/Policies`:
- `ClubPolicy`, `EventPolicy`, `EventRegistrationPolicy`
- `AnnouncementPolicy`, `MembershipRequestPolicy`
- `RecruitmentNoticePolicy`, `RecruitmentApplicationPolicy`

---

## 5. Automated Audit Observer

The [AuditObserver](file:///c:/Users/Popular%20Computer/ClubHouse/backend/app/Observers/AuditObserver.php) registers event listeners on key models (`Club`, `Event`, `MembershipRequest`, `RecruitmentNotice`, etc.). When a record is created, updated, or deleted, `AuditObserver` logs the user ID, action name, model class, affected ID, and modified payload into the `audit_logs` table.

---

## 6. Service Layer

The [ClubMembershipService](file:///c:/Users/Popular%20Computer/ClubHouse/backend/app/Services/ClubMembershipService.php) handles encapsulated membership business logic, such as evaluating executive permission flags, handling automatic position default assignments upon request approval, and sending system notifications.

---

## 7. Middleware Registration

Global and aliased middleware are configured in [bootstrap/app.php](file:///c:/Users/Popular%20Computer/ClubHouse/backend/bootstrap/app.php):
- `auth:sanctum`: Enforces Bearer token verification.
- `is_admin`: Enforces global admin privilege check (`IsAdmin` middleware class).

