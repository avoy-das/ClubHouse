# ClubHouse — University Club Management Platform

[![Backend - Laravel 12](https://img.shields.io/badge/Backend-Laravel%2012-red.svg)](https://laravel.com)
[![Frontend - React 19](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-blue.svg)](https://react.dev)
[![Styling - Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38bdf8.svg)](https://tailwindcss.com)
[![Auth - Laravel Sanctum](https://img.shields.io/badge/Auth-Laravel%20Sanctum-orange.svg)](https://laravel.com/docs/sanctum)

**ClubHouse** is a comprehensive, centralized web platform for managing university club activities. It streamlines club discovery and membership management, event creation and registration, attendance tracking, auto-generated certificates, announcements, recruitment drives, feedback collection, global search, and university administration oversight.

---

## 🏛 System Architecture Overview

ClubHouse is built as a decoupled single-page application (SPA) with a RESTful Laravel API backend and a React (Vite) frontend.

```
ClubHouse/
├── backend/     # Laravel 12 API (PHP 8.2+, Sanctum Auth, MySQL/SQLite)
├── frontend/    # React 19 SPA (Vite, React Router v7, Tailwind CSS)
└── docs/        # Architectural guides and technical documentation
```

### Key Modules & Capabilities

1. **Authentication & User Management**: Token-based Sanctum authentication with role-based access (`is_admin` global platform administrators vs. general student users).
2. **Club Management & Custom Positions**: Full club lifecycle (creation requests, admin approval, suspension, edit requests), with customizable executive positions and dynamic permission flags (`can_manage_members`, `can_manage_events`, `can_manage_announcements`, `can_manage_recruitment`, `can_track_attendance`).
3. **Membership Requests & Roster**: Student membership applications, executive review workflows, active member rosters, and position assignments.
4. **Events & Registration**: Public and members-only events, seat limits, registration cancellation, attendance tracking, and CSV attendance reporting.
5. **Certificates & Verification**: Automatic certificate generation upon verified event attendance with download links and verification codes.
6. **Announcements**: Targeted global, club-wide, or member-specific announcements with unpin capabilities and notification delivery.
7. **Recruitment Drives**: Custom multi-field recruitment notices, application submission with attachment links, and executive application reviews.
8. **Feedback & Ratings**: Event rating and review collection restricted to confirmed attendees.
9. **Notifications & Audit Logging**: Real-time unread notification counters, mark-as-read controls, and system-wide action audit trail logging via Eloquent observers.
10. **Admin Oversight & Analytics**: Dedicated administrative control panel for approving/suspending clubs, reviewing edit requests, generating club analytics reports, and auditing system logs.
11. **Global Search**: Instant cross-entity search for clubs, events, announcements, and recruitment drives.

---

## 🛠 Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Backend Framework** | [Laravel](https://laravel.com) | ^12.0 | RESTful API, Eloquent ORM, Policies, Form Requests |
| **Backend Language** | PHP | ^8.2 | Application runtime |
| **API Auth** | Laravel Sanctum | ^4.0 | Bearer token authentication |
| **Database** | MySQL / SQLite | — | Relational database (SQLite default for dev) |
| **Frontend Framework** | [React](https://react.dev) | ^19.2 | Single-page application UI |
| **Build Tool** | [Vite](https://vitejs.dev) | ^8.1 | Hot Module Replacement (HMR) & bundling |
| **Routing** | React Router | ^7.18 | SPA routing & route protection guards |
| **HTTP Client** | Axios | ^1.18 | Configured API instance with interceptors |
| **Styling** | Tailwind CSS | ^3.4 | Utility-first CSS styling & responsive layout |
| **Linting** | Oxlint | ^1.71 | High-performance JS/JSX linting |

---

## 🚀 Quick Start Guide

### Prerequisites
- PHP >= 8.2 with PDO, SQLite/MySQL extensions
- Composer >= 2.0
- Node.js >= 18.0 & npm >= 9.0

---

### 1. Setting Up the Backend

```bash
# Navigate to backend directory
cd backend

# Install PHP dependencies
composer install

# Environment configuration
cp .env.example .env

# Generate application key
php artisan key:generate

# Run database migrations and seeders
php artisan migrate --seed

# Start the Laravel development server (runs on http://localhost:8000)
php artisan serve
```

---

### 2. Setting Up the Frontend

```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite dev server (runs on http://localhost:5173)
npm run dev
```

Open your browser and navigate to `http://localhost:5173` to access the ClubHouse application.

---

## 📚 Documentation Index

For detailed architectural specifications and development guidelines:

- 📑 **[01_PROJECT_CONTEXT.md](file:///c:/Users/Popular%20Computer/ClubHouse/01_PROJECT_CONTEXT.md)** — Project roadmap, domain models, permissions architecture, and business rules.
- ⚙️ **[02_BACKEND_DEVELOPMENT_GUIDE.md](file:///c:/Users/Popular%20Computer/ClubHouse/02_BACKEND_DEVELOPMENT_GUIDE.md)** — Detailed Laravel backend guide, schema, models, controllers, requests, policies, and API endpoints.
- 🎨 **[03_FRONTEND_DEVELOPMENT_GUIDE.md](file:///c:/Users/Popular%20Computer/ClubHouse/03_FRONTEND_DEVELOPMENT_GUIDE.md)** — React frontend guide, page components, service layer, context state management, and routing.
- 📂 **[project_structure.md](file:///c:/Users/Popular%20Computer/ClubHouse/project_structure.md)** — Complete file layout, file counts, and Mermaid domain ER diagrams.
- 🔧 **[backend/README.md](file:///c:/Users/Popular%20Computer/ClubHouse/backend/README.md)** — Backend setup and environment configuration.
- 💻 **[frontend/README.md](file:///c:/Users/Popular%20Computer/ClubHouse/frontend/README.md)** — Frontend setup, environment variables, and build scripts.

---

## 🔐 System Roles & Authorization

- **Platform Admin (`is_admin = true`)**: Full access to admin dashboard (`/admin/clubs`, `/admin/users`, `/admin/audit-logs`, `/admin/reports`), club approval/suspension, club edit request approvals, global announcements, user role updates, and system report generation.
- **Club Executive**: Derived dynamically per club based on assigned `club_positions` with active permission flags (`can_manage_members`, `can_manage_events`, `can_manage_announcements`, `can_manage_recruitment`, `can_track_attendance`).
- **Club Member**: Student with an approved membership (`status = active`). Can view members-only events, post feedback, view targeted announcements, and receive certificates.
- **Student User**: Registered platform user. Can browse clubs, request membership, register for public events, view recruitment notices, apply for club recruitment, search the platform, and manage profile settings.

---

## 📜 License

This project is proprietary academic/university software developed for university club management.