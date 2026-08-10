# ClubHouse Frontend SPA (React 19 + Vite + Tailwind CSS)

The Single-Page Application (SPA) frontend for the **ClubHouse** University Club Management Platform. Built on [React 19](https://react.dev), [Vite](https://vitejs.dev), [React Router v7](https://reactrouter.com), and [Tailwind CSS](https://tailwindcss.com).

---

## Features & Capabilities

- **Authentication Context**: Reactive auth state management via `AuthContext` with automatic Sanctum token persistence in `localStorage`.
- **Dynamic Club Executive Permissions**: `ClubPermissionsContext` evaluates user role position flags (`can_manage_members`, `can_manage_events`, etc.) dynamically per club.
- **Route Protection Guards**:
  - `ProtectedRoute`: Access restriction for unauthenticated visitors.
  - `AdminRoute`: Access restriction for non-administrator users.
  - `ClubExecutiveRoute`: Access restriction for non-executive club users.
- **Responsive UI Components**: Built using modular Tailwind CSS classes with custom badges, modals, status banners, loading spinners, and layout components.
- **Service Layer Pattern**: 11 dedicated service modules encapsulating API communication via Axios with global Bearer token interceptors and 401 redirect handling.

---

## Prerequisites

- Node.js >= 18.0
- npm >= 9.0

---

## Installation & Local Development

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node packages**:
   ```bash
   npm install
   ```

3. **Start local development server**:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173`.

---

## Production Build

To compile static assets for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## Key Directory Layout

- `src/components/` — Subdirectories for layout shells (`AppLayout`, `Navbar`, `SearchBar`), UI primitives (`Badge`, `Modal`, `Button`, `Card`, `ErrorBanner`, `SuccessBanner`, `LoadingSpinner`), club components (`ClubCard`, `EditClubModal`, `MembersDirectory`, `PositionAssignment`, `TransferPresidencyModal`), event components (`EventModal`, `MarkAttendanceModal`), and admin components (`UserManagementSection`).
- `src/context/` — React Context providers (`AuthContext`, `ClubPermissionsContext`).
- `src/pages/` — 13 Feature page modules (Admin, Announcements, Certificates, Clubs, Dashboard, Events, Login, Notifications, Profile, Recruitment, Register, Search, Users).
- `src/routes/` — Route guards (`ProtectedRoute`, `AdminRoute`, `ClubExecutiveRoute`).
- `src/services/` — 11 Axios-based API service files.
- `src/App.jsx` — React Router v7 routes map.
