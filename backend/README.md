# ClubHouse Backend API (Laravel 12)

The RESTful API backend for the **ClubHouse** University Club Management Platform. Built on [Laravel 12](https://laravel.com) and PHP 8.2+ with token-based authentication via [Laravel Sanctum](https://laravel.com/docs/sanctum).

---

## 🛠 Features & Capabilities

- **Sanctum Bearer Token Auth**: Registration, login, profile management, password updates, and token revocation.
- **Dynamic Club Executive Authorization**: Flexible, club-defined positions with granular permission flags (`can_manage_members`, `can_manage_events`, `can_manage_announcements`, `can_manage_recruitment`, `can_track_attendance`).
- **Membership Lifecycle**: Join requests, executive review workflows, active member rosters, and position assignments.
- **Events & Attendance**: Event publishing, registration capacity enforcement, attendance marking, CSV exports, and event feedback collection.
- **Certificates**: Automated certificate generation for verified attendees with direct download links and verification codes.
- **Targeted Announcements**: Audience targeting (all, club members, executive-only, or specific user lists) with pinning/unpinning.
- **Recruitment Management**: Multi-notice recruitment listing, custom JSON fields for applications, attachment links, and status decisioning.
- **Audit Logging**: Observer-based logging (`AuditObserver`) of critical model modifications into system audit logs.
- **Admin Oversight**: Dedicated administrative endpoints for club approval/rejection/suspension, club edit request management, system user controls, and analytics reporting.
- **Global Search API**: Fast multi-entity search endpoint across clubs, events, announcements, and recruitment.

---

## 📋 Prerequisites

- PHP >= 8.2 (extensions: `pdo`, `sqlite` or `pdo_mysql`, `mbstring`, `openssl`, `bcmath`, `curl`)
- Composer >= 2.0

---

## 🚀 Installation & Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install PHP dependencies**:
   ```bash
   composer install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

4. **Run migrations and seeders**:
   ```bash
   # Default dev database is SQLite (database/database.sqlite)
   touch database/database.sqlite
   php artisan migrate --seed
   ```

5. **Start local development server**:
   ```bash
   php artisan serve
   ```
   The API will be live at `http://localhost:8000/api`.

---

## 🧪 Testing

Run PHPUnit tests using Artisan:
```bash
php artisan test
```

---

## 📂 Key Directory Layout

- `app/Http/Controllers/` — 22 RESTful API controllers
- `app/Http/Requests/` — 18 Form Request validation classes
- `app/Models/` — 17 Eloquent domain models
- `app/Observers/` — `AuditObserver.php` for action logging
- `app/Policies/` — 7 Laravel policy authorization classes
- `app/Services/` — Encapsulated membership business logic
- `database/migrations/` — 50 Schema migration files
- `routes/api.php` — Primary RESTful API route definitions
