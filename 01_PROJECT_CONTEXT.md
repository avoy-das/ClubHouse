# ClubHouse — Project Context & Roadmap

> **Read this file first.** It describes what already exists in the repository, what conventions are already established, and what needs to be built next. The other two files (`02_BACKEND_DEVELOPMENT_GUIDE.md` and `03_FRONTEND_DEVELOPMENT_GUIDE.md`) contain the detailed technical specification for the remaining work. This document was produced by analyzing the actual project ZIP (not assumptions) — every convention described below is taken directly from existing code.

---

## 1. What ClubHouse Is

ClubHouse is a centralized web platform for managing university club activities: club discovery and membership, event creation and registration, attendance and certificates, announcements, recruitment, feedback, and admin oversight.

An SRS document was used for requirements gathering only. **Its ER diagram is outdated and must not be used.** The database design in `02_BACKEND_DEVELOPMENT_GUIDE.md` is the authoritative, normalized schema for this project and supersedes the SRS's data model entirely. The SRS's functional requirements, use cases, and business rules are still valid as *behavioral* references.

---

## 2. Tech Stack (confirmed from the repository)

| Layer | Technology | Version |
|---|---|---|
| Backend framework | Laravel | ^12.0 |
| Backend language | PHP | ^8.2 |
| Auth | Laravel Sanctum (token-based, `Bearer` header) | ^4.0 |
| Database | MySQL | — |
| Frontend framework | React | ^19.2 |
| Build tool | Vite | ^8.1 |
| Routing | react-router-dom | ^7.18 |
| HTTP client | axios | ^1.18 |
| Styling | Tailwind CSS | ^3.4 |
| Forms library (installed, currently unused) | react-hook-form | ^7.83 |
| Linting | oxlint | ^1.71 |

Repository layout:
```
ClubHouse/
├── backend/     (Laravel app, standard structure, no sub-namespacing)
└── frontend/    (Vite React app)
```

---

## 3. What Is Already Implemented — DO NOT MODIFY unless explicitly asked

### Backend
- `app/Models/User.php` — fillable: `name, student_id, email, password, department, phone, is_admin`. Casts `is_admin` to boolean, `password` to hashed.
- `app/Http/Controllers/AuthController.php` — `register`, `login`, `logout`, `me`.
- `app/Http/Controllers/UserController.php` — `index`, `show`, `update` (admin-only).
- `app/Http/Requests/RegisterRequest.php`, `LoginRequest.php` (note: `LoginRequest::rules()` is currently empty — validation happens implicitly via `Auth::attempt`; leave as-is unless asked to harden it).
- `app/Http/Middleware/IsAdmin.php` — registered as alias `is_admin` in `bootstrap/app.php`.
- `routes/api.php` — public `/register`, `/login`; `auth:sanctum` group with `/logout`, `/me`; nested `is_admin` group with `/users*`.
- Migration: `0001_01_01_000000_create_users_table.php` (already includes `student_id`, `department`, `phone`, `is_admin` — this was customized from the Laravel default).
- Sanctum personal access tokens table is present.

### Frontend
- `src/context/AuthContext.jsx` — exposes `user`, `loading`, `login(credentials)`, `logout()`, `isAdmin()`. Wraps the whole app in `App.jsx`.
- `src/routes/ProtectedRoute.jsx` — redirects to `/login` if no `user`.
- `src/routes/AdminROute.jsx` — **note the exact filename typo `AdminROute.jsx`** — redirects non-admins to `/dashboard`. Keep this filename as-is for consistency; do not silently rename it (renaming breaks nothing functionally in imports as long as it's done everywhere consistently, but there is no need to touch it).
- `src/services/api.js` — axios instance, `baseURL: 'http://localhost:8000/api'`, attaches `Authorization: Bearer <token>` from `localStorage.getItem('token')`, and force-redirects to `/login` on any global 401.
- `src/services/authService.js` — `register`, `login` (stores token), `logout`, `me`, `getToken`, `isLoggedIn`.
- `src/pages/Login/Login.jsx`, `src/pages/Register/Register.jsx` — plain HTML forms with manual `useState` error/loading handling (no react-hook-form used yet, no external validation library, no toast library). Styling: white card on `bg-gray-100`, Tailwind utility classes, blue-600 primary buttons, `rounded`, `shadow-md`.
- `App.jsx` — currently has a hard-coded placeholder `Dashboard` component and only `/login`, `/register`, `/dashboard` routes.

**Rule: authentication is complete and frozen.** Every new feature must plug into this existing `AuthContext` / `api.js` / `ProtectedRoute` / `AdminRoute` infrastructure — do not create a second auth system, a second axios instance, or a second token storage mechanism.

---

## 4. Domain Model Decision — Executives Are Not a Separate User Type

This is the single most important architectural decision for this project, and it deliberately diverges from the SRS's actor model:

- There is **one** `users` table (already built). A user is a Student, and may *additionally* be a Club Member of zero or more clubs, and may *additionally* hold one or more Positions within those memberships (President, Treasurer, etc.).
- `is_admin` on `users` is the **only** global role flag, reserved for Platform Administrators (SRS §2.1.3).
- "Club Executive" is never a value stored on the `users` table. It is a **derived** status: a user is an executive of a club if they have an active `club_member_positions` row (via their `club_members` row) linking to a `club_positions` row with any permission flag set to `true`.
- Each club can define its own set of positions (a club is not forced into a fixed President/VP/Secretary/Treasurer structure). This directly satisfies SRS UR-E1–E6 without hardcoding role names anywhere in code.

See `02_BACKEND_DEVELOPMENT_GUIDE.md §2` for the full schema and `03_FRONTEND_DEVELOPMENT_GUIDE.md §3` for how the frontend should query and render "is this user an executive of club X, and what can they do."

---

## 5. Global Conventions to Follow

### Backend
- Flat controller namespace: `App\Http\Controllers\{Name}Controller` — no sub-folders like `Api/` or `V1/`. This matches `AuthController` / `UserController`.
- Validation via Form Requests in `App\Http\Requests`, one per action where the action has a meaningful body (`StoreXRequest`, `UpdateXRequest`), matching `RegisterRequest` naming style (not `Store...`/`Update...` in the existing 2 files because auth only has one shape each — but for CRUD resources, use `Store{Model}Request` / `Update{Model}Request`).
- JSON responses only, via `response()->json(...)`. Success payloads return the resource/collection directly (see `AuthController::me`, `UserController::index`) — do not introduce a `{ data: ... }` wrapper unless explicitly asked, to stay consistent with existing responses.
- Errors: `response()->json(['message' => '...'], <status>)`, matching `AuthController::login`'s 401 and `IsAdmin`'s 403.
- Route model binding is used for simple resources (`UserController::show(User $user)`) — use the same pattern for new controllers (`EventController::show(Event $event)`, etc.), scoped through nested route parameters where a resource logically belongs to a club (e.g., `clubs/{club}/events/{event}`).
- Middleware aliases go in `bootstrap/app.php`'s `->withMiddleware()` block, exactly like `is_admin` was added. New authorization middleware/policies should follow this same registration pattern.
- All new tables use Laravel's default `id()` (`bigIncrements`) primary keys and `timestamps()`, matching the existing `users` migration style.

### Frontend
- Page components live under `src/pages/{Feature}/{PageName}.jsx` (PascalCase folder and file), matching `pages/Login/Login.jsx` and `pages/Register/Register.jsx`.
- One service file per backend resource area under `src/services/{name}Service.js`, all built on top of the shared `api.js` instance, matching `authService.js`. Never call `axios` directly from a component — always go through a service function.
- Route guards (`ProtectedRoute`, `AdminRoute`) wrap route elements in `App.jsx`; new role-scoped routes (e.g., "executive-only") should follow the same wrapper-component pattern rather than inline conditional logic scattered across pages.
- Tailwind utility-class styling matching the existing look: white cards (`bg-white rounded shadow-md`), gray page background (`bg-gray-100`), blue-600 primary actions, red-100/red-700 error banners, consistent `px-3 py-2 text-sm` form field sizing.
- No component library is installed (no MUI/shadcn/etc.) — keep building with raw Tailwind utility classes for consistency, unless the user explicitly asks to add one.

---

## 6. Build Order / Roadmap

Build in this order — each phase is usable/demoable on its own and later phases depend on earlier ones:

1. **Clubs & Membership core** — `clubs`, `club_positions`, `club_members`, `club_member_positions`, `membership_requests`. Enables: browse clubs, create club (admin-approved), join/leave, executive position assignment, membership approval.
2. **Admin club oversight** — approve/suspend/delete clubs (extends admin surface already scaffolded by `is_admin` middleware).
3. **Announcements** — `announcements` (simplest new module, good for validating the permission-check pattern end-to-end before tackling events).
4. **Events & Registration** — `events`, `event_registrations`. Enables: create/update/delete events, browse/register/cancel.
5. **Attendance & Certificates** — attendance fields on `event_registrations`, `certificates`. Enables: attendance tracking, auto-generated certificates, download.
6. **Feedback** — `event_feedback`, gated on confirmed attendance.
7. **Recruitment** — `recruitment_notices`, `recruitment_applications`.
8. **Notifications** — `notifications` table + triggers from the above modules (membership approval, event updates, announcements, recruitment decisions).
9. **Admin reporting & audit** — `audit_logs`, admin dashboard aggregates/exports.
10. **(Optional/stretch)** Club photo gallery — `club_galleries` (referenced only in the SRS use-case diagram, not detailed in functional requirements; build last if time permits).

Each phase's exact tables, models, controllers, routes, and frontend pages are fully specified in files 02 and 03 — build strictly one phase at a time and keep the app runnable after each phase.
