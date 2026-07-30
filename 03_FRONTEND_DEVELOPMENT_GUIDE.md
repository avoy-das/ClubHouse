# ClubHouse — Frontend Development Guide (React 19 + Vite)

> Companion to `01_PROJECT_CONTEXT.md` and `02_BACKEND_DEVELOPMENT_GUIDE.md`. Do not touch `AuthContext.jsx`, `ProtectedRoute.jsx`, `AdminROute.jsx`, `services/api.js`, `services/authService.js`, `pages/Login`, or `pages/Register`. Build on top of them.

All new files go into the **existing** `frontend/` Vite project (`ClubHouse/frontend/src`). Do not run `npm create vite` again or introduce a parallel folder structure.

---

## 1. Folder Structure to Extend

```
src/
├── pages/
│   ├── Login/                     (existing — do not touch)
│   ├── Register/                  (existing — do not touch)
│   ├── Dashboard/
│   │   └── Dashboard.jsx          (replace the inline placeholder currently in App.jsx)
│   ├── Clubs/
│   │   ├── ClubList.jsx
│   │   ├── ClubDetail.jsx
│   │   ├── ClubForm.jsx           (create/edit, shared)
│   │   └── ClubMembers.jsx
│   ├── Admin/
│   │   ├── AdminClubs.jsx         (approve/suspend/delete)
│   │   ├── AdminUsers.jsx         (reuses existing /users endpoints)
│   │   ├── AdminReports.jsx
│   │   └── AdminAuditLogs.jsx
│   ├── Events/
│   │   ├── EventList.jsx
│   │   ├── EventDetail.jsx
│   │   ├── EventForm.jsx
│   │   └── EventAttendance.jsx
│   ├── Announcements/
│   │   └── AnnouncementList.jsx
│   ├── Recruitment/
│   │   ├── RecruitmentList.jsx
│   │   ├── RecruitmentDetail.jsx
│   │   └── RecruitmentApplications.jsx
│   ├── Certificates/
│   │   └── MyCertificates.jsx
│   └── Notifications/
│       └── NotificationList.jsx
├── components/
│   ├── layout/
│   │   ├── Navbar.jsx
│   │   └── AppLayout.jsx          (wraps authenticated pages: Navbar + <Outlet/>)
│   ├── ui/
│   │   ├── Card.jsx
│   │   ├── Button.jsx
│   │   ├── ErrorBanner.jsx        (extract the red-100/red-700 pattern from Login/Register)
│   │   ├── LoadingSpinner.jsx
│   │   ├── Modal.jsx
│   │   └── Badge.jsx              (status pills: pending/approved/rejected etc.)
│   └── clubs/
│       ├── ClubCard.jsx
│       ├── MembershipRequestList.jsx
│       └── PositionAssignment.jsx
├── context/
│   ├── AuthContext.jsx            (existing — do not touch)
│   └── ClubPermissionsContext.jsx (new — see §3)
├── routes/
│   ├── ProtectedRoute.jsx         (existing — do not touch)
│   ├── AdminROute.jsx             (existing — do not touch)
│   └── ClubExecutiveRoute.jsx     (new — see §4)
└── services/
    ├── api.js                     (existing — do not touch)
    ├── authService.js             (existing — do not touch)
    ├── clubService.js
    ├── membershipService.js
    ├── eventService.js
    ├── announcementService.js
    ├── recruitmentService.js
    ├── certificateService.js
    └── notificationService.js
```

---

## 2. Service Layer — one file per backend resource, mirroring `authService.js`

Every function returns `response.data` (never the raw axios response), matching the existing pattern. Example, `src/services/clubService.js`:

```js
import api from './api';

const clubService = {
    list: async (params = {}) => (await api.get('/clubs', { params })).data,
    get: async (clubId) => (await api.get(`/clubs/${clubId}`)).data,
    create: async (data) => (await api.post('/clubs', data)).data,
    update: async (clubId, data) => (await api.put(`/clubs/${clubId}`, data)).data,
    remove: async (clubId) => (await api.delete(`/clubs/${clubId}`)).data,
    approve: async (clubId) => (await api.post(`/clubs/${clubId}/approve`)).data,
    suspend: async (clubId) => (await api.post(`/clubs/${clubId}/suspend`)).data,

    listPositions: async (clubId) => (await api.get(`/clubs/${clubId}/positions`)).data,
    createPosition: async (clubId, data) => (await api.post(`/clubs/${clubId}/positions`, data)).data,
    updatePosition: async (positionId, data) => (await api.put(`/positions/${positionId}`, data)).data,
    removePosition: async (positionId) => (await api.delete(`/positions/${positionId}`)).data,

    listMembers: async (clubId) => (await api.get(`/clubs/${clubId}/members`)).data,
    removeMember: async (clubId, memberId) => (await api.delete(`/clubs/${clubId}/members/${memberId}`)).data,
    assignPosition: async (memberId, positionId) =>
        (await api.post(`/club-members/${memberId}/positions`, { position_id: positionId })).data,
    revokePosition: async (memberId, positionId) =>
        (await api.delete(`/club-members/${memberId}/positions/${positionId}`)).data,
};

export default clubService;
```

Build the remaining service files the same way, one function per backend route from `02_BACKEND_DEVELOPMENT_GUIDE.md §5`:

- **`membershipService.js`**: `request(clubId, message)`, `listForClub(clubId)`, `review(requestId, status)`.
- **`eventService.js`**: `listForClub(clubId, params)`, `get(eventId)`, `create(clubId, data)`, `update(eventId, data)`, `remove(eventId)`, `register(eventId)`, `cancelRegistration(eventId)`, `listRegistrations(eventId)`, `markAttendance(eventId, registrationId, attended)`.
- **`announcementService.js`**: `listForClub(clubId)`, `create(clubId, data)`, `update(id, data)`, `remove(id)`.
- **`recruitmentService.js`**: `listForClub(clubId)`, `get(noticeId)`, `create(clubId, data)`, `update(noticeId, data)`, `remove(noticeId)`, `apply(noticeId, answers)`, `listApplications(noticeId)`, `review(applicationId, status)`.
- **`certificateService.js`**: `listMine()`, `downloadUrl(certificateId)` (return the endpoint URL for an `<a href>`/`window.open`, since it's a file download — attach the auth token via a signed short-lived approach if needed, otherwise open through an authenticated fetch and blob-download).
- **`eventFeedbackService.js`** (or fold into `eventService.js`): `submit(eventId, {rating, comments})`.
- **`notificationService.js`**: `list()`, `markRead(id)`.

---

## 3. Permissions on the Frontend — `ClubPermissionsContext.jsx`

The backend is the source of truth for authorization (§4 of the backend guide) — the frontend only uses permission data to decide what UI to show, never as a security boundary.

Rather than re-deriving "is executive" logic in every component, fetch the current user's membership + position data once per club page and expose it via a small context, mirroring how `AuthContext` exposes `isAdmin()`:

```jsx
// src/context/ClubPermissionsContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import clubService from '../services/clubService';

const ClubPermissionsContext = createContext(null);

export const ClubPermissionsProvider = ({ clubId, children }) => {
    const [membership, setMembership] = useState(null); // { status, positions: [{title, can_manage_events, ...}] }
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        setLoading(true);
        clubService.get(clubId)
            .then((club) => { if (active) setMembership(club.my_membership ?? null); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [clubId]);

    const can = (permission) =>
        !!membership?.positions?.some((p) => p[permission] === true);

    const isExecutive = () =>
        !!membership?.positions?.some((p) =>
            ['can_manage_members', 'can_manage_events', 'can_manage_announcements',
             'can_manage_recruitment', 'can_track_attendance'].some((f) => p[f]));

    return (
        <ClubPermissionsContext.Provider value={{ membership, loading, can, isExecutive }}>
            {children}
        </ClubPermissionsContext.Provider>
    );
};

export const useClubPermissions = () => useContext(ClubPermissionsContext);
```

> **Backend note to pair with this:** have `ClubController::show` optionally eager-load and attach the requesting user's own `club_members` row (with its active `positions`) as `my_membership` on the response payload, so the frontend doesn't need a second round-trip per club page.

Use `<ClubPermissionsProvider clubId={id}>` around a club's detail/events/members/announcements pages, and `useClubPermissions().can('can_manage_events')` to conditionally show "Create Event" / "Edit" / "Delete" buttons.

---

## 4. Route Guards

`src/routes/ClubExecutiveRoute.jsx` (new, same pattern as `AdminROute.jsx`):
```jsx
import { Navigate } from 'react-router-dom';
import { useClubPermissions } from '../context/ClubPermissionsContext';

const ClubExecutiveRoute = ({ permission, children }) => {
    const ctx = useClubPermissions();
    if (!ctx || ctx.loading) return null; // or a spinner
    if (!ctx.can(permission)) return <Navigate to=".." replace />;
    return children;
};

export default ClubExecutiveRoute;
```

Wire new routes into `App.jsx` (extend the existing `<Routes>` tree — replace the current inline `Dashboard` placeholder with `pages/Dashboard/Dashboard.jsx`, keep `/login` and `/register` exactly as-is):

```jsx
<Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
<Route path="/clubs" element={<ProtectedRoute><ClubList /></ProtectedRoute>} />
<Route path="/clubs/:clubId" element={<ProtectedRoute><ClubDetail /></ProtectedRoute>} />
<Route path="/clubs/:clubId/events" element={<ProtectedRoute><EventList /></ProtectedRoute>} />
<Route path="/clubs/:clubId/events/:eventId" element={<ProtectedRoute><EventDetail /></ProtectedRoute>} />
<Route path="/clubs/:clubId/members" element={<ProtectedRoute><ClubMembers /></ProtectedRoute>} />
<Route path="/clubs/:clubId/announcements" element={<ProtectedRoute><AnnouncementList /></ProtectedRoute>} />
<Route path="/clubs/:clubId/recruitment" element={<ProtectedRoute><RecruitmentList /></ProtectedRoute>} />
<Route path="/certificates" element={<ProtectedRoute><MyCertificates /></ProtectedRoute>} />
<Route path="/notifications" element={<ProtectedRoute><NotificationList /></ProtectedRoute>} />

<Route path="/admin/clubs" element={<AdminRoute><AdminClubs /></AdminRoute>} />
<Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
<Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
<Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogs /></AdminRoute>} />
```
(Import `AdminRoute` from `../routes/AdminROute` — keep the existing filename.)

---

## 5. UI Conventions — extend, don't reinvent

Match `Login.jsx`/`Register.jsx` exactly:
- Page wrapper: `min-h-screen bg-gray-100` for full pages; for pages inside `AppLayout` (post-login, with a navbar), use `bg-gray-100 min-h-[calc(100vh-<navbar-height>)] p-6` instead of re-centering everything.
- Content card: `bg-white p-8 rounded shadow-md` (use `p-6` for list/table pages, `p-8` for forms, to keep density reasonable).
- Primary button: `bg-blue-600 text-white py-2 px-4 rounded font-medium hover:bg-blue-700 disabled:opacity-50`.
- Secondary/neutral button: `bg-gray-200 text-gray-800 py-2 px-4 rounded font-medium hover:bg-gray-300`.
- Destructive button: `bg-red-600 text-white py-2 px-4 rounded font-medium hover:bg-red-700`.
- Error banner: extract into `components/ui/ErrorBanner.jsx` — `bg-red-100 text-red-700 px-4 py-2 rounded mb-4 text-sm`.
- Success banner: same shape with `bg-green-100 text-green-700`.
- Status badges (club/request/application status): `components/ui/Badge.jsx`, a small pill (`text-xs px-2 py-1 rounded-full font-medium`) with color mapping: `pending`→yellow-100/yellow-800, `approved`/`accepted`/`active`/`published`→green-100/green-800, `rejected`/`cancelled`/`suspended`→red-100/red-700, `draft`/`removed`→gray-100/gray-700.
- Form fields: `w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`, always paired with `<label className="block text-sm font-medium mb-1">`.

For forms with more than ~3 fields or conditional/validated fields (event forms, club position forms), it's reasonable to start using **react-hook-form** (already installed, currently unused) instead of manual `useState`/`e.target.x.value` — this keeps growing forms maintainable without diverging wildly from the existing simple-form style used on 2-field/short forms like Login.

---

## 6. Page-by-Page Build Notes (build in the same phase order as the backend guide §"Roadmap")

1. **`Dashboard.jsx`** — replace the placeholder in `App.jsx`. Show: clubs the user belongs to, upcoming registered events, unread notification count, and (if `isAdmin()`) a link to `/admin/clubs`.
2. **`ClubList.jsx`** — grid of `ClubCard`s from `clubService.list()`, search box, category filter, "Create Club" button (any authenticated user → opens `ClubForm`, submits as `pending`).
3. **`ClubDetail.jsx`** — club info, membership status/"Join Club" button (calls `membershipService.request`), tabs/links to Members/Events/Announcements/Recruitment for that club, wrapped in `ClubPermissionsProvider`.
4. **`ClubMembers.jsx`** — member list with position badges; if `can('can_manage_members')`: pending-request review UI (`MembershipRequestList`) and `PositionAssignment` controls.
5. **`AdminClubs.jsx`** — table of all clubs regardless of status, Approve/Suspend/Delete actions.
6. **`AnnouncementList.jsx`** — list (pinned first), create/edit form gated by `can('can_manage_announcements')`.
7. **`EventList.jsx` / `EventDetail.jsx` / `EventForm.jsx`** — browse/create/edit events; `EventDetail` shows Register/Cancel button (disabled if capacity full or past deadline, both derived from fields the backend returns — don't compute capacity client-side from a separate registrations call).
8. **`EventAttendance.jsx`** — executive-only (`can('can_track_attendance')`), participant list with present/absent toggle calling `eventService.markAttendance`.
9. **`MyCertificates.jsx`** — list current user's certificates, download links.
10. **Feedback** — a small form embedded in `EventDetail.jsx` (shown only if the current user's own registration has `attended: true`, per data returned from `eventService.get`/`listRegistrations`), not a separate page.
11. **`RecruitmentList.jsx` / `RecruitmentDetail.jsx`** — browse notices, "Apply" form when open; `RecruitmentApplications.jsx` (executive-only) to review submissions.
12. **`NotificationList.jsx`** — list with unread styling, mark-as-read on click; surface an unread badge in `Navbar.jsx`.
13. **`AdminReports.jsx` / `AdminAuditLogs.jsx`** — simple tables/stat cards from the corresponding admin endpoints.

Build `components/layout/Navbar.jsx` + `AppLayout.jsx` early (right after Dashboard) since every subsequent authenticated page benefits from consistent navigation — link to Dashboard, Clubs, Notifications (with unread count), Certificates, and (conditionally) Admin, plus a Logout button calling `useAuth().logout()`.
