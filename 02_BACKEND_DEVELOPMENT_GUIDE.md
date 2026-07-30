# ClubHouse — Backend Development Guide (Laravel 12)

> Companion to `01_PROJECT_CONTEXT.md`. Do not touch `AuthController`, `UserController`, `IsAdmin`, the `users` migration, or `routes/api.php`'s existing `/register`, `/login`, `/logout`, `/me`, `/users*` routes. Everything below is additive.

All new files go into the **existing** `backend/` Laravel project (`ClubHouse/backend/app`, `ClubHouse/backend/database/migrations`, `ClubHouse/backend/routes/api.php`). Do not run `laravel new` or scaffold a second project.

---

## 1. Database Design Principles

- 3NF normalized, no denormalized status flags duplicated across tables.
- Every foreign key has an explicit `onDelete` behavior — chosen per-table below, never left to default.
- "Executive" is never a column value — see `club_positions` / `club_member_positions` (§2.2–2.3).
- Enums are implemented as MySQL `enum()` columns via `$table->enum('status', [...])` for fixed, small, rarely-changing value sets (matches how a real Laravel/MySQL app would do it, and keeps invalid states impossible at the DB layer).
- All monetary/attendance/eligibility logic that the SRS's business rules (BRULE-1…10) require is enforced primarily at the **application layer** (Form Requests + policy checks), with DB-level `unique` constraints as a second line of defense wherever a business rule maps directly to a uniqueness constraint.

---

## 2. Migrations (create in this exact order — later tables reference earlier ones)

Naming convention: `database/migrations/{YYYY_MM_DD_HHMMSS}_create_{table}_table.php`, timestamped after the existing Sanctum migration (`2026_07_25_231213_...`) so they run last.

### 2.1 `clubs`
```php
Schema::create('clubs', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('slug')->unique();
    $table->text('description')->nullable();
    $table->string('category')->nullable();
    $table->string('logo_path')->nullable();
    $table->enum('status', ['pending', 'approved', 'rejected', 'suspended'])->default('pending');
    $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
    $table->timestamps();
});
```
- `slug` is generated server-side from `name` on creation (e.g. `Str::slug`), unique, used for clean URLs.
- `status` replaces the SRS's implicit approval flow (FR-05, BR-1). Only `approved` clubs are visible to students in browse/search.

### 2.2 `club_positions`
```php
Schema::create('club_positions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('club_id')->constrained()->cascadeOnDelete();
    $table->string('title');
    $table->boolean('can_manage_members')->default(false);
    $table->boolean('can_manage_events')->default(false);
    $table->boolean('can_manage_announcements')->default(false);
    $table->boolean('can_manage_recruitment')->default(false);
    $table->boolean('can_track_attendance')->default(false);
    $table->boolean('is_default')->default(false);
    $table->timestamps();

    $table->unique(['club_id', 'title']);
});
```
- Each club defines its own position catalogue (President, Treasurer, etc.) — never hardcode position names anywhere in application code.
- `is_default` marks the position auto-assigned to a member on approval (typically a permission-less "Member" position) — see §2.4.
- A user is an **executive of a club** iff they hold ≥1 `club_member_positions` row whose `club_positions` row has any `can_*` flag `true`. Encapsulate this check in `User::hasClubPermission()` (§3.1) — never re-implement the logic ad hoc in controllers.

### 2.3 `club_members`
```php
Schema::create('club_members', function (Blueprint $table) {
    $table->id();
    $table->foreignId('club_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->enum('status', ['active', 'removed'])->default('active');
    $table->timestamp('joined_at')->nullable();
    $table->timestamps();

    $table->unique(['club_id', 'user_id']);
});
```
- Single source of truth for "is user X a member of club Y." Created only when a `membership_requests` row is approved (§2.5), or directly by an executive/admin adding someone.

### 2.4 `club_member_positions`
```php
Schema::create('club_member_positions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('club_member_id')->constrained()->cascadeOnDelete();
    $table->foreignId('club_position_id')->constrained()->cascadeOnDelete();
    $table->timestamp('assigned_at')->useCurrent();
    $table->timestamp('ends_at')->nullable();
    $table->timestamps();

    $table->unique(['club_member_id', 'club_position_id']);
});
```
- Pivot with attributes. A row with `ends_at IS NULL` (or `ends_at` in the future) means the position is currently active.

### 2.5 `membership_requests`
```php
Schema::create('membership_requests', function (Blueprint $table) {
    $table->id();
    $table->foreignId('club_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
    $table->text('message')->nullable();
    $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamp('reviewed_at')->nullable();
    $table->timestamps();

    $table->index(['club_id', 'user_id', 'status']);
});
```
- Implements BRULE-3 ("one active request per club"): enforced in `StoreMembershipRequestRequest` / controller by checking for an existing `pending` row for the same `(club_id, user_id)` before insert — MySQL cannot express a partial-unique constraint, so this is application-enforced with the index above supporting a fast lookup.
- Approving a request (BRULE-2, FR-09): create/reactivate the corresponding `club_members` row (status `active`, `joined_at = now()`) and, if the club has a position with `is_default = true`, auto-assign it via `club_member_positions`.

### 2.6 `events`
```php
Schema::create('events', function (Blueprint $table) {
    $table->id();
    $table->foreignId('club_id')->constrained()->cascadeOnDelete();
    $table->string('title');
    $table->text('description')->nullable();
    $table->string('venue')->nullable();
    $table->unsignedInteger('capacity')->nullable();
    $table->dateTime('start_at');
    $table->dateTime('end_at')->nullable();
    $table->dateTime('registration_deadline')->nullable();
    $table->enum('status', ['draft', 'published', 'cancelled', 'completed'])->default('draft');
    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
});
```
- BRULE-4: only users with `can_manage_events` for the event's club may create/update/delete — enforced via `EventPolicy` (§4).

### 2.7 `event_registrations`
```php
Schema::create('event_registrations', function (Blueprint $table) {
    $table->id();
    $table->foreignId('event_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->enum('status', ['registered', 'cancelled'])->default('registered');
    $table->boolean('attended')->default(false);
    $table->timestamp('attended_at')->nullable();
    $table->timestamp('registered_at')->useCurrent();
    $table->timestamps();

    $table->unique(['event_id', 'user_id']);
});
```
- Attendance lives on the registration row (not a separate table) — one registration can have at most one attendance state, matching BRULE-5/6 cleanly and keeping certificate/feedback eligibility a single join away.
- Capacity enforcement (FR-13): controller counts `status = 'registered'` rows against `events.capacity` before inserting; wrap in a DB transaction with a row lock (`lockForUpdate()`) on the event to prevent race conditions at high concurrency (NFR-P2).

### 2.8 `certificates`
```php
Schema::create('certificates', function (Blueprint $table) {
    $table->id();
    $table->foreignId('event_registration_id')->unique()->constrained()->cascadeOnDelete();
    $table->string('certificate_number')->unique();
    $table->string('file_path');
    $table->timestamp('issued_at')->useCurrent();
    $table->timestamps();
});
```
- `event_registration_id` is `unique()` — at most one certificate per registration (BRULE-5).
- Generated automatically (FR-21) the moment `event_registrations.attended` flips to `true` — trigger this from the attendance-marking controller action, not a queued job initially (keep it synchronous and simple; revisit with a queue only if PDF generation becomes a bottleneck).
- `certificate_number` should be a short, unique, human-shareable code (e.g. `CH-{event_id}-{registration_id}-{random}`).

### 2.9 `announcements`
```php
Schema::create('announcements', function (Blueprint $table) {
    $table->id();
    $table->foreignId('club_id')->constrained()->cascadeOnDelete();
    $table->string('title');
    $table->text('body');
    $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
    $table->boolean('is_pinned')->default(false);
    $table->timestamps();
});
```

### 2.10 `recruitment_notices`
```php
Schema::create('recruitment_notices', function (Blueprint $table) {
    $table->id();
    $table->foreignId('club_id')->constrained()->cascadeOnDelete();
    $table->string('title');
    $table->text('description')->nullable();
    $table->text('requirements')->nullable();
    $table->dateTime('opens_at');
    $table->dateTime('closes_at');
    $table->enum('status', ['draft', 'open', 'closed'])->default('draft');
    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
});
```
- BRULE-7 ("recruitment only during active period"): enforced by checking `now()` is between `opens_at`/`closes_at` **and** `status = 'open'` before accepting an application — do both checks, don't rely on the timestamps alone, since an executive may want to manually close early.

### 2.11 `recruitment_applications`
```php
Schema::create('recruitment_applications', function (Blueprint $table) {
    $table->id();
    $table->foreignId('recruitment_notice_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->json('answers')->nullable();
    $table->enum('status', ['pending', 'accepted', 'rejected'])->default('pending');
    $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamp('reviewed_at')->nullable();
    $table->timestamps();

    $table->unique(['recruitment_notice_id', 'user_id']);
});
```
- Accepting an application (FR-19) should create the corresponding `club_members` (+ default position) row exactly like an approved `membership_requests` row does — factor this into a shared internal service method (`ClubMembershipService::admitUser()`) so both flows stay consistent instead of duplicating the logic.

### 2.12 `event_feedback`
```php
Schema::create('event_feedback', function (Blueprint $table) {
    $table->id();
    $table->foreignId('event_registration_id')->unique()->constrained()->cascadeOnDelete();
    $table->unsignedTinyInteger('rating');
    $table->text('comments')->nullable();
    $table->timestamp('submitted_at')->useCurrent();
    $table->timestamps();
});
```
- `unique()` on `event_registration_id` = at most one feedback per registration.
- Eligibility (BRULE-6, FR-20): controller must verify the caller's own `event_registrations` row has `attended = true` before allowing insert. Add a `rating` range check (`1–5`) in the Form Request.

### 2.13 `notifications`
```php
Schema::create('notifications', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('type');
    $table->string('title')->nullable();
    $table->text('message');
    $table->string('related_type')->nullable();
    $table->unsignedBigInteger('related_id')->nullable();
    $table->boolean('is_read')->default(false);
    $table->timestamp('read_at')->nullable();
    $table->timestamps();

    $table->index(['user_id', 'is_read']);
});
```
> **Naming note:** `User` already uses Laravel's `Notifiable` trait, but this project does **not** use Laravel's built-in notification channels/database driver. This is a plain custom `App\Models\Notification` model backed by this table — a simple polymorphic-by-convention (`related_type` + `related_id`, not a true Eloquent `morphTo`, to keep querying simple) record created directly by controllers (FR-25), not through `Notifiable::notify()`. Do not run `php artisan notifications:table` — that would create a conflicting table.

### 2.14 `audit_logs`
```php
Schema::create('audit_logs', function (Blueprint $table) {
    $table->id();
    $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
    $table->string('action');
    $table->string('subject_type')->nullable();
    $table->unsignedBigInteger('subject_id')->nullable();
    $table->json('meta')->nullable();
    $table->timestamps();
});
```
- Written by admin-facing mutating actions (approve/suspend/delete club, deactivate user, etc.) per FR-31. Keep it simple: a static helper `AuditLog::record($actor, $action, $subject, $meta = [])` called explicitly from controllers — do not build a generic model-observer-based auto-logger for the initial version.

### 2.15 (Optional / Phase 10) `club_galleries`
```php
Schema::create('club_galleries', function (Blueprint $table) {
    $table->id();
    $table->foreignId('club_id')->constrained()->cascadeOnDelete();
    $table->string('image_path');
    $table->string('caption')->nullable();
    $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
});
```

---

## 3. Models (`app/Models/`)

Create one model per table above, all in the flat `App\Models` namespace (matching `User.php`). For each: set `$fillable` to the insertable columns (exclude `id`, timestamps, and anything computed), add relationships, and add `casts()` for booleans/dates/json/enums.

### 3.1 `Club.php`
```php
class Club extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'category', 'logo_path', 'status', 'created_by'];

    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function positions(): HasMany { return $this->hasMany(ClubPosition::class); }
    public function members(): HasMany { return $this->hasMany(ClubMember::class); }
    public function events(): HasMany { return $this->hasMany(Event::class); }
    public function announcements(): HasMany { return $this->hasMany(Announcement::class); }
    public function membershipRequests(): HasMany { return $this->hasMany(MembershipRequest::class); }
    public function recruitmentNotices(): HasMany { return $this->hasMany(RecruitmentNotice::class); }
}
```

### 3.2 `ClubPosition.php`
```php
class ClubPosition extends Model
{
    protected $fillable = ['club_id', 'title', 'can_manage_members', 'can_manage_events',
        'can_manage_announcements', 'can_manage_recruitment', 'can_track_attendance', 'is_default'];
    protected function casts(): array {
        return ['can_manage_members' => 'boolean', 'can_manage_events' => 'boolean',
            'can_manage_announcements' => 'boolean', 'can_manage_recruitment' => 'boolean',
            'can_track_attendance' => 'boolean', 'is_default' => 'boolean'];
    }
    public function club(): BelongsTo { return $this->belongsTo(Club::class); }
}
```

### 3.3 `ClubMember.php`
```php
class ClubMember extends Model
{
    protected $fillable = ['club_id', 'user_id', 'status', 'joined_at'];
    protected function casts(): array { return ['joined_at' => 'datetime']; }
    public function club(): BelongsTo { return $this->belongsTo(Club::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function positions(): HasMany { return $this->hasMany(ClubMemberPosition::class); }
}
```

### 3.4 `ClubMemberPosition.php`
```php
class ClubMemberPosition extends Model
{
    protected $fillable = ['club_member_id', 'club_position_id', 'assigned_at', 'ends_at'];
    protected function casts(): array { return ['assigned_at' => 'datetime', 'ends_at' => 'datetime']; }
    public function clubMember(): BelongsTo { return $this->belongsTo(ClubMember::class); }
    public function position(): BelongsTo { return $this->belongsTo(ClubPosition::class, 'club_position_id'); }
}
```

### 3.5 `MembershipRequest.php`
Fillable: `club_id, user_id, status, message, reviewed_by, reviewed_at`. `belongsTo(Club::class)`, `belongsTo(User::class)`, `belongsTo(User::class, 'reviewed_by')` (name this relation `reviewer()`).

### 3.6 `Event.php`
Fillable: `club_id, title, description, venue, capacity, start_at, end_at, registration_deadline, status, created_by`. Casts: `start_at`, `end_at`, `registration_deadline` → `datetime`. `belongsTo(Club::class)`, `hasMany(EventRegistration::class)`.

### 3.7 `EventRegistration.php`
Fillable: `event_id, user_id, status, attended, attended_at, registered_at`. Casts: `attended` → boolean, `attended_at`/`registered_at` → datetime. `belongsTo(Event::class)`, `belongsTo(User::class)`, `hasOne(Certificate::class)`, `hasOne(EventFeedback::class)`.

### 3.8 `Certificate.php`
Fillable: `event_registration_id, certificate_number, file_path, issued_at`. `belongsTo(EventRegistration::class)`.

### 3.9 `Announcement.php`
Fillable: `club_id, title, body, posted_by, is_pinned`. Casts: `is_pinned` → boolean. `belongsTo(Club::class)`, `belongsTo(User::class, 'posted_by')`.

### 3.10 `RecruitmentNotice.php`
Fillable: `club_id, title, description, requirements, opens_at, closes_at, status, created_by`. Casts: `opens_at`/`closes_at` → datetime. `belongsTo(Club::class)`, `hasMany(RecruitmentApplication::class)`.

### 3.11 `RecruitmentApplication.php`
Fillable: `recruitment_notice_id, user_id, answers, status, reviewed_by, reviewed_at`. Casts: `answers` → `array`. `belongsTo(RecruitmentNotice::class)`, `belongsTo(User::class)`.

### 3.12 `EventFeedback.php`
Fillable: `event_registration_id, rating, comments, submitted_at`. `belongsTo(EventRegistration::class)`.

### 3.13 `Notification.php`
Fillable: `user_id, type, title, message, related_type, related_id, is_read, read_at`. Casts: `is_read` → boolean. `belongsTo(User::class)`.

### 3.14 `AuditLog.php`
Fillable: `actor_id, action, subject_type, subject_id, meta`. Casts: `meta` → `array`. Add a static helper:
```php
public static function record(?User $actor, string $action, ?Model $subject = null, array $meta = []): void
{
    static::create([
        'actor_id'     => $actor?->id,
        'action'       => $action,
        'subject_type' => $subject ? get_class($subject) : null,
        'subject_id'   => $subject?->id,
        'meta'         => $meta,
    ]);
}
```

### 3.15 Update `User.php`
Add relationships and the central permission-check helper (append, do not restructure the existing class):
```php
public function clubMemberships(): HasMany { return $this->hasMany(ClubMember::class); }
public function membershipRequests(): HasMany { return $this->hasMany(MembershipRequest::class); }
public function eventRegistrations(): HasMany { return $this->hasMany(EventRegistration::class); }
public function notifications(): HasMany { return $this->hasMany(Notification::class); }

/**
 * True if the user holds a position with the given permission flag
 * in an active membership of the given club.
 */
public function hasClubPermission(int|Club $club, string $permission): bool
{
    $clubId = $club instanceof Club ? $club->id : $club;

    return $this->clubMemberships()
        ->where('club_id', $clubId)
        ->where('status', 'active')
        ->whereHas('positions', function ($q) use ($permission) {
            $q->where(function ($q2) {
                $q2->whereNull('ends_at')->orWhere('ends_at', '>', now());
            })->whereHas('position', fn ($q3) => $q3->where($permission, true));
        })
        ->exists();
}

public function isMemberOf(int|Club $club): bool
{
    $clubId = $club instanceof Club ? $club->id : $club;
    return $this->clubMemberships()->where('club_id', $clubId)->where('status', 'active')->exists();
}
```
This single helper (`hasClubPermission`) is the **only** place executive-permission logic should ever be checked from. Every policy in §4 calls it — never re-derive "is this user an executive" by any other means.

---

## 4. Authorization (Laravel Policies)

Register policies in `AppServiceProvider::boot()` (or via auto-discovery if the Laravel version supports it — Laravel 12 auto-discovers policies named `{Model}Policy` in `app/Policies` for models in `app/Models`, so explicit registration is optional but fine to be explicit).

Create `app/Policies/`:

- **`ClubPolicy`**: `update`/`delete` → `$user->hasClubPermission($club, 'can_manage_members')` (club-level settings) or `$user->is_admin`. `create` (new club) → any authenticated user may propose a club (goes to `pending` status); only an admin can `approve`/`suspend`.
- **`EventPolicy`**: `create`/`update`/`delete` → `$user->hasClubPermission($event->club, 'can_manage_events')`.
- **`AnnouncementPolicy`**: `create`/`update`/`delete` → `$user->hasClubPermission($announcement->club, 'can_manage_announcements')`.
- **`MembershipRequestPolicy`**: `review` (approve/reject) → `$user->hasClubPermission($request->club, 'can_manage_members')`.
- **`RecruitmentNoticePolicy`**: `create`/`update`/`delete` → `$user->hasClubPermission($notice->club, 'can_manage_recruitment')`.
- **`RecruitmentApplicationPolicy`**: `review` → `$user->hasClubPermission($application->recruitmentNotice->club, 'can_manage_recruitment')`.
- **`EventRegistrationPolicy`**: `markAttendance` → `$user->hasClubPermission($registration->event->club, 'can_track_attendance')`.

In controllers, call `$this->authorize('update', $event);` etc. (standard Laravel `AuthorizesRequests` trait — already available via base `Controller`, but confirm the abstract `Controller` class uses the trait; if not, add `use AuthorizesRequests;` to `app/Http/Controllers/Controller.php`).

For admin-only actions that don't fit a model policy (approve club, deactivate user, view audit logs), keep using the existing `is_admin` route middleware — do not build a redundant policy for pure admin gates.

---

## 5. Controllers & Routes

Flat namespace `App\Http\Controllers`, matching existing style. All routes below are added inside `routes/api.php`, nested under the existing `auth:sanctum` group (append to it — do not create a second sanctum group). Use `Route::apiResource` where the full CRUD set applies, explicit `Route::{verb}` for custom actions.

```php
Route::middleware('auth:sanctum')->group(function () {
    // ... existing /logout, /me, is_admin group stay untouched ...

    // Clubs
    Route::apiResource('clubs', ClubController::class);
    Route::post('/clubs/{club}/approve', [ClubController::class, 'approve'])->middleware('is_admin');
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

    // Admin
    Route::middleware('is_admin')->group(function () {
        Route::get('/admin/reports/overview', [ReportController::class, 'overview']);
        Route::get('/admin/audit-logs', [AuditLogController::class, 'index']);
    });
});
```

### Controller responsibilities (one bullet = one method to implement)

- **`ClubController`**: `index` (approved clubs, filter by `category`/search `name`), `store` (any authenticated user, status forced to `pending`), `show`, `update` (policy-gated), `destroy` (admin only), `approve`, `suspend`.
- **`ClubPositionController`**: `index`, `store`, `update`, `destroy` — gated by `hasClubPermission($club, 'can_manage_members')`.
- **`MembershipRequestController`**: `store` (BRULE-3 duplicate check), `index` (pending list for executives), `review` (approve → call `ClubMembershipService::admitUser()`; reject → set status).
- **`ClubMemberController`**: `index` (member list with their positions eager-loaded), `destroy` (remove member — cascades their position rows via FK).
- **`ClubMemberPositionController`**: `store` (assign position), `destroy` (revoke — set `ends_at = now()` rather than hard delete, to preserve history).
- **`AnnouncementController`**: full CRUD, `index` scoped to the club's members (or public if you decide announcements are club-public — default to: visible to members + admins).
- **`EventController`**: full CRUD; `index` supports filtering by club/date/status; only `published` events are visible to students, executives see all statuses for their own club.
- **`EventRegistrationController`**: `store` (capacity check under `lockForUpdate()`, duplicate check via the unique index, deadline check against `registration_deadline`), `destroy` (cancel — only before `start_at`), `index` (participant list for executives), `markAttendance` (sets `attended`/`attended_at`, then synchronously creates the `Certificate` row).
- **`CertificateController`**: `index` (current user's own certificates), `download` (stream the file — verify the requester owns the underlying registration or is an admin).
- **`EventFeedbackController`**: `store` — verify `EventRegistration::where('event_id', $event->id)->where('user_id', auth()->id())->where('attended', true)->exists()` before allowing.
- **`RecruitmentNoticeController`**: full CRUD, gated by `can_manage_recruitment`.
- **`RecruitmentApplicationController`**: `store` (BRULE-7 active-period check), `index` (for executives), `review` (accept → `ClubMembershipService::admitUser()`; reject → set status).
- **`NotificationController`**: `index` (current user's notifications, newest first), `markRead`.
- **`ReportController`**: `overview` — counts of clubs/events/members/registrations for the admin dashboard (FR-27).
- **`AuditLogController`**: `index` — paginated, admin only (FR-31).

### `ClubMembershipService` (new: `app/Services/ClubMembershipService.php`)
Shared logic used by both `MembershipRequestController::review` and `RecruitmentApplicationController::review`:
```php
class ClubMembershipService
{
    public function admitUser(Club $club, User $user): ClubMember
    {
        $member = ClubMember::firstOrCreate(
            ['club_id' => $club->id, 'user_id' => $user->id],
            ['status' => 'active', 'joined_at' => now()]
        );

        if ($member->wasRecentlyCreated) {
            $default = $club->positions()->where('is_default', true)->first();
            if ($default) {
                ClubMemberPosition::create([
                    'club_member_id'   => $member->id,
                    'club_position_id' => $default->id,
                    'assigned_at'      => now(),
                ]);
            }
        }

        return $member;
    }
}
```

---

## 6. Form Requests (`app/Http/Requests/`)

One per mutating endpoint, matching the `RegisterRequest`/`LoginRequest` style (`authorize(): bool` + `rules(): array`). At minimum:

- `StoreClubRequest` / `UpdateClubRequest` — `name` required/string/max:255, `description` nullable/string, `category` nullable/string, `logo_path` nullable/string.
- `StoreClubPositionRequest` / `UpdateClubPositionRequest` — `title` required, `can_*` booleans, unique title per club (validate against `club_positions` scoped by route's `club`).
- `StoreMembershipRequestRequest` — `message` nullable/string/max:1000.
- `StoreEventRequest` / `UpdateEventRequest` — `title` required, `start_at` required/date, `end_at` nullable/date/after:start_at, `registration_deadline` nullable/date/before:start_at, `capacity` nullable/integer/min:1.
- `MarkAttendanceRequest` — `attended` required/boolean.
- `StoreAnnouncementRequest` / `UpdateAnnouncementRequest` — `title` required, `body` required, `is_pinned` boolean.
- `StoreRecruitmentNoticeRequest` / `UpdateRecruitmentNoticeRequest` — `opens_at`/`closes_at` required/date, `closes_at` after `opens_at`.
- `StoreRecruitmentApplicationRequest` — `answers` nullable/array.
- `StoreEventFeedbackRequest` — `rating` required/integer/between:1,5, `comments` nullable/string/max:2000.

---

## 7. Seeders

Extend `DatabaseSeeder.php` (append, keep the existing `User::factory()->create([...])` line) with a `ClubSeeder` that creates 2–3 sample approved clubs, each with a default `Member` position (`is_default = true`, all `can_*` false) and one elevated position (e.g. `President`, all `can_*` true), for local development/testing of the permission system end to end.

---

## 8. Response & Status Code Conventions (keep consistent with `AuthController`)

| Situation | Status | Body |
|---|---|---|
| Resource created | 201 | the created resource (or `{resource, message}` if useful context needed) |
| Success (read/update) | 200 | the resource/collection |
| Successful deletion | 200 | `{'message': '...'}` |
| Validation failure | 422 (default Laravel FormRequest behavior) | Laravel's default `{message, errors}` |
| Authorization failure | 403 | `{'message': '...'}` |
| Not found | 404 | Laravel's default route-model-binding 404 |
| Business rule violation (e.g. duplicate request, capacity full, closed recruitment) | 422 or 409 — prefer 422 with a clear `message` for consistency with validation errors | `{'message': '...'}` |
