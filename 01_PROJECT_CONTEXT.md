# ClubHouse — Project Context & System Architecture

> **Authoritative System Reference.** This document details the completed implementation of the **ClubHouse** University Club Management Platform. All 10 core development phases, plus system extensions (Global Search, Club Edit Requests, Audit Logging Observer, targeted announcements, auto-generated certificates, custom registration questions, club advisor management, and banner media support), are fully built and verified across the backend and frontend.

---

## 1. Project Overview & Scope

ClubHouse is a centralized, web-based software solution designed to digitize university club operations. The platform serves platform administrators, club executives, active club members, and general university students.

### Implemented Feature Modules

1. **User Authentication & Profiles**: Registration, login, profile editing, password changes, session targeting, membership history display.
2. **Club Lifecycle & Governance**: Club creation, admin approval workflow, club details edit request system, club suspension, custom position creation, advisor contact management, banner media uploads, and fine-grained position permissions.
3. **Membership Workflows**: Join request submission, executive review (approve/reject), member listing, role assignment, presidency transfer, committee additions, and voluntary leaving/removal.
4. **Events & Attendance**: Event creation (public vs. members-only), registration limits, custom registration fields/answers, cover banners, status tracking (draft/published/cancelled/completed), attendance marking, and CSV export.
5. **Certificates & Verification**: Automatic issue of participation certificates upon attendance verification with direct download capabilities and unique verification tokens.
6. **Announcements**: Targeted multi-audience announcements (all students, club members, executive-only, or custom recipient selection) with pinning/unpinning capabilities, attachment links, and sender role display.
7. **Recruitment Drives**: Custom application forms with flexible extra fields, multi-notice listings with target sessions, application submission with attachment links, and status decisioning (pending/accepted/rejected).
8. **Feedback & Reviews**: Star rating (1-5) and feedback submission restricted to confirmed event attendees.
9. **Notifications & Auditing**: In-app notifications with unread counts and read markers, combined with an automated `AuditObserver` log of critical database actions.
10. **Admin Dashboard & Analytics**: System overview metrics, club performance breakdown reports, user management, club edit request management, and system audit trail viewing.
11. **Global Search Engine**: Unified backend search API endpoint querying across clubs, events, announcements, and recruitment opportunities.

---

## 2. Tech Stack & Environment Specs

| Layer | Technology | Specification / Version |
|---|---|---|
| **Backend Framework** | Laravel | ^12.0 |
| **Backend Language** | PHP | ^8.2 |
| **Authentication** | Laravel Sanctum | ^4.0 (Bearer Token via HTTP header) |
| **Database Engine** | MySQL / SQLite | 50 migration files covering 17 domain tables |
| **Frontend Framework** | React | ^19.2 |
| **Build Tool** | Vite | ^8.1 |
| **Routing** | react-router-dom | ^7.18 |
| **HTTP Client** | Axios | ^1.18 (Configured in `src/services/api.js`) |
| **Styling** | Tailwind CSS | ^3.4 |
| **Linting** | Oxlint | ^1.71 |

---

## 3. Implemented Backend Architecture

### Directory Structure
```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/    # 22 RESTful Controllers
│   │   ├── Middleware/     # IsAdmin Middleware
│   │   └── Requests/       # 18 Form Request Validation Classes
│   ├── Models/             # 17 Eloquent Models
│   ├── Observers/          # AuditObserver (auto-logs model changes)
│   ├── Policies/           # 7 Policy Authorization Classes
│   ├── Providers/          # AppServiceProvider
│   └── Services/           # ClubMembershipService
├── config/                 # Sanctum, CORS, Auth, Database configs
├── database/
│   ├── migrations/         # 50 Migration files
│   ├── factories/          # Model Factories
│   └── seeders/            # Database Seeders
└── routes/
    └── api.php             # Unified RESTful API routes
```

### Core Architectural Decisions

- **Single `users` Table**: User roles are unified in the `users` table with an `is_admin` boolean flag for global Platform Administrators.
- **Derived Club Executive Status**: Club executive permissions are never hardcoded on the user. An executive is dynamically derived when a user holds a position (`club_member_positions`) linked to a `club_positions` row where any permission flag (`can_manage_members`, `can_manage_events`, `can_manage_announcements`, `can_manage_recruitment`, `can_track_attendance`) is `true`.
- **Observer-Based Audit Logging**: The `AuditObserver` automatically records `created`, `updated`, and `deleted` actions across domain models into `audit_logs` without cluttering controller logic.
- **Form Request Validation**: Every write operation validates input payloads cleanly via dedicated Form Request classes under `app/Http/Requests`.

---

## 4. Implemented Frontend Architecture

### Directory Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── admin/          # UserManagementSection
│   │   ├── clubs/          # AddCommitteeMemberModal, ClubAuditLogModal, ClubCard, EditAdvisorModal, EditClubModal, MembersDirectory, MembershipRequestList, PositionAssignment, TransferPresidencyModal
│   │   ├── Events/         # AttendanceReportModal, EventModal, MarkAttendanceModal
│   │   ├── layout/         # AppLayout, Navbar, SearchBar
│   │   └── ui/             # Badge, Button, Card, Modal, ErrorBanner, SuccessBanner, LoadingSpinner
│   ├── context/            # AuthContext, ClubPermissionsContext
│   ├── pages/              # 13 Page feature folders (Admin, Announcements, Certificates, Clubs, Dashboard, Events, Login, Notifications, Profile, Recruitment, Register, Search, Users)
│   ├── routes/             # ProtectedRoute, AdminRoute, ClubExecutiveRoute
│   ├── services/           # 11 Axios-based API service files
│   ├── App.jsx             # React Router v7 main routing configuration
│   └── index.css           # Tailwind base styles
```

### Key Frontend Patterns

- **Centralized Service Layer**: Components never call Axios directly. All API communication routes through dedicated files in `src/services/`.
- **Axios Authorization Interceptor**: [api.js](file:///c:/Users/Popular%20Computer/ClubHouse/frontend/src/services/api.js) automatically injects `Bearer <token>` from `localStorage` into every request header and handles 401 unauthenticated redirects globally.
- **Route Protection**: [ProtectedRoute.jsx](file:///c:/Users/Popular%20Computer/ClubHouse/frontend/src/routes/ProtectedRoute.jsx) guards member-only routes, while [AdminRoute.jsx](file:///c:/Users/Popular%20Computer/ClubHouse/frontend/src/routes/AdminRoute.jsx) enforces platform administrator access.

---

## 5. Development Milestones Completed

All 10 original roadmap phases and additional capabilities have been successfully built:

- **Phase 1: Clubs & Membership Core** (`clubs`, `club_positions`, `club_members`, `club_member_positions`, `membership_requests`)
- **Phase 2: Admin Oversight & Approvals** (Club approval, rejection, suspension, club edit request management)
- **Phase 3: Announcements & Targeting** (`announcements`, global & targeted audience options, attachments, sender roles, pin/unpin)
- **Phase 4: Events & Registration** (`events`, `event_registrations`, capacity checks, custom registration fields, schedule view)
- **Phase 5: Attendance & Auto-Certificates** (`certificates`, attendance marking, verification tokens, CSV reporting)
- **Phase 6: Feedback & Ratings** (`event_feedback`, attendance-restricted ratings and reviews)
- **Phase 7: Recruitment Drives** (`recruitment_notices`, `recruitment_applications`, custom field JSON definitions, session targets)
- **Phase 8: Notifications System** (`notifications`, unread badges, mark-as-read API)
- **Phase 9: Analytics & Audit Logs** (`audit_logs`, `ReportController`, overall dashboard statistics)
- **Phase 10: Club Photo Gallery & Search** (`club_galleries`, `SearchController`, unified frontend search)

---

## 6. Coding & Architectural Standards

- **Controllers**: Keep methods lean by offloading validation to Form Requests and policy checks to Policies.
- **API Responses**: Consistently return direct JSON models or standard response arrays (`message`, status codes 200/201/400/401/403/404/422).
- **Styling**: Strictly use Tailwind CSS utility classes; keep components responsive across desktop and mobile breakpoints.
