# ClubHouse — Frontend Development Guide (React 19 + Vite)

> **Complete Frontend Technical Reference.** This guide details the structure, services, state context providers, route protection guards, components, and page modules for the ClubHouse React application.

---

## 1. Directory Structure

```
frontend/src/
├── components/
│   ├── admin/
│   │   └── UserManagementSection.jsx
│   ├── clubs/                         # Specialized club components
│   │   ├── AddCommitteeMemberModal.jsx
│   │   ├── ClubAuditLogModal.jsx
│   │   ├── ClubCard.jsx
│   │   ├── EditAdvisorModal.jsx
│   │   ├── EditClubModal.jsx
│   │   ├── MembersDirectory.jsx
│   │   ├── MembershipRequestList.jsx
│   │   ├── PositionAssignment.jsx
│   │   └── TransferPresidencyModal.jsx
│   ├── Events/                        # Event management components
│   │   ├── AttendanceReportModal.jsx
│   │   ├── EventModal.jsx
│   │   └── MarkAttendanceModal.jsx
│   ├── layout/
│   │   ├── AppLayout.jsx              # Main shell container
│   │   ├── Navbar.jsx                 # Header bar with unread counter & profile menu
│   │   └── SearchBar.jsx              # Search input component
│   └── ui/                            # Reusable UI primitives
│       ├── Badge.jsx                  # Status pill badge (pending/approved/rejected/etc.)
│       ├── Button.jsx                 # Custom styled button variants
│       ├── Card.jsx                   # Container card component
│       ├── ErrorBanner.jsx            # Error feedback banner
│       ├── LoadingSpinner.jsx         # Animated loading spinner
│       ├── Modal.jsx                  # Accessible popup dialog modal
│       └── SuccessBanner.jsx          # Success feedback banner
│
├── context/
│   ├── AuthContext.jsx                # User state, token management, login/logout
│   └── ClubPermissionsContext.jsx     # Club-level executive permission resolver
│
├── pages/                             # 13 Feature Page Modules
│   ├── Admin/                         # Admin portal (AdminClubList, AdminClubs, AdminUsers, AdminAuditLogs, AdminReports)
│   ├── Announcements/                 # Announcement feeds and creation forms
│   ├── Certificates/                  # MyCertificates list and download buttons
│   ├── Clubs/                         # ClubList, ClubDetail, CreateClub, ClubForm, ClubMembers
│   ├── Dashboard/                     # Personalized dashboard (Student/Executive/Admin views)
│   ├── Events/                        # EventsPage, EventDetailPage, EventDetail, EventAttendance, EventForm, EventList
│   ├── Login/                         # Login form page
│   ├── Notifications/                 # Notification center
│   ├── Profile/                       # Profile page & password change
│   ├── Recruitment/                   # RecruitmentList, RecruitmentDetail, RecruitmentApplications
│   ├── Register/                      # Registration form page
│   ├── Search/                        # Global search results page
│   └── Users/                         # User administration table
│
├── routes/                            # Route Protection Guards
│   ├── ProtectedRoute.jsx             # Requires authenticated user
│   ├── AdminRoute.jsx                 # Requires global platform administrator
│   └── ClubExecutiveRoute.jsx         # Requires club executive privilege
│
├── services/                          # 11 Service Modules (Axios API wrappers)
│   ├── adminService.js
│   ├── announcementService.js
│   ├── api.js                         # Shared Axios instance with Bearer token interceptor
│   ├── authService.js
│   ├── certificateService.js
│   ├── clubService.js
│   ├── eventService.js
│   ├── membershipService.js
│   ├── notificationService.js
│   ├── recruitmentService.js
│   └── searchService.js
│
├── App.jsx                            # Main routing map & provider configuration
├── main.jsx                           # Application entry point
└── index.css                          # Tailwind CSS imports & base theme styles
```

---

## 2. API Service Layer (`src/services/`)

All HTTP communication is routed through service modules built on top of [api.js](file:///c:/Users/Popular%20Computer/ClubHouse/frontend/src/services/api.js).

### Service Responsibilities

1. **`authService.js`**: `login`, `register`, `logout`, `me`, `updateProfile`, `changePassword`, `myMemberships`.
2. **`clubService.js`**: `list`, `get`, `create`, `update`, `requestEdit`, `listEditRequests`, `approveEditRequest`, `rejectEditRequest`, `listPositions`, `createPosition`, `updatePosition`, `removePosition`, `listMembers`, `assignPosition`, `removeMember`, `leaveClub`.
3. **`eventService.js`**: `list`, `get`, `create`, `update`, `updateStatus`, `register`, `cancelRegistration`, `listRegistrations`, `updateAttendance`, `getAttendanceReport`, `submitFeedback`.
4. **`membershipService.js`**: `submitRequest`, `listRequests`, `reviewRequest`.
5. **`announcementService.js`**: `list`, `getCreationContext`, `create`, `createGlobal`, `unpin`, `listClubMembers`.
6. **`recruitmentService.js`**: `list`, `get`, `create`, `update`, `delete`, `apply`, `listApplications`, `reviewApplication`.
7. **`certificateService.js`**: `myCertificates`, `downloadCertificate`.
8. **`notificationService.js`**: `list`, `getUnreadCount`, `markRead`, `markAllRead`.
9. **`adminService.js`**: `listClubs`, `approveClub`, `rejectClub`, `suspendClub`, `deleteClub`, `listUsers`, `updateUser`, `deleteUser`, `getOverview`, `getClubReport`, `getAuditLogs`.
10. **`searchService.js`**: `query` (Searches clubs, events, announcements, and recruitment).

---

## 3. State Management & Context Providers

### `AuthContext.jsx`
Exposes global authentication state to the entire app:
- `user`: Currently authenticated user object (or `null`).
- `loading`: Initial authentication check state.
- `login(credentials)`: Calls `authService.login`, stores token in `localStorage`, and updates `user`.
- `logout()`: Clears `localStorage` token and resets `user`.
- `isAdmin()`: Returns boolean indicating if `user.is_admin === true`.

### `ClubPermissionsContext.jsx`
Provides dynamic per-club permissions for executive operations:
- `getUserPermissions(clubId)`: Evaluates user's positions within a specific club and returns an object of active permissions:
  `{ canManageMembers, canManageEvents, canManageAnnouncements, canManageRecruitment, canTrackAttendance, isExecutive }`.

---

## 4. Route Protection

- **[ProtectedRoute.jsx](file:///c:/Users/Popular%20Computer/ClubHouse/frontend/src/routes/ProtectedRoute.jsx)**: Wraps authenticated routes. If `loading` is false and `user` is null, redirects to `/login`.
- **[AdminRoute.jsx](file:///c:/Users/Popular%20Computer/ClubHouse/frontend/src/routes/AdminRoute.jsx)**: Wraps admin routes. If `user.is_admin` is false, redirects to `/dashboard`.
- **[ClubExecutiveRoute.jsx](file:///c:/Users/Popular%20Computer/ClubHouse/frontend/src/routes/ClubExecutiveRoute.jsx)**: Checks if user possesses executive permissions for the target club prior to rendering executive management panels.

---

## 5. UI Design & Styling Rules

- **Palette**: Clean slate background (`bg-slate-50` / `bg-gray-100`), crisp white card containers (`bg-white rounded-lg border border-slate-200 shadow-sm`), vibrant blue primary action elements (`bg-blue-600 hover:bg-blue-700 text-white`).
- **Form Controls**: Uniform styling across inputs (`w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm`).
- **Badges**: Standardized status pills (e.g. green for `approved`/`completed`, yellow for `pending`/`open`, red for `rejected`/`cancelled`/`suspended`, purple for `executive`).

