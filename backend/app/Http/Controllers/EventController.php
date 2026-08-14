<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEventRequest;
use App\Http\Requests\UpdateEventRequest;
use App\Http\Requests\UpdateEventStatusRequest;
use App\Models\Club;
use App\Models\Event;
use App\Services\AuditService;
use App\Services\CacheInvalidationService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class EventController extends Controller
{
    // -------------------------------------------------------
    // GET /api/events
    // GET /api/clubs/{club}/events
    //
    // Public events visible to all authenticated users.
    // members_only events visible only to club members.
    // -------------------------------------------------------
    public function index(Request $request): JsonResponse
    {
        self::syncEventStatuses();

        $user       = Auth::user();
        $clubId     = $request->query('club_id');
        $status     = strtolower($request->query('status', ''));
        $search     = $request->query('search');
        $datePreset = strtolower($request->query('date_preset', $request->query('date', '')));

        $query = Event::with(['club:id,name', 'creator:id,name'])
            ->withCount(['registrations' => function ($query) {
                $query->where('status', 'registered');
            }]);

        // Text search by title
        if ($search) {
            $escaped = '%' . addcslashes($search, '%_\\') . '%';
            $query->where('title', 'like', $escaped);
        }

        // Scope to specific club if requested
        if ($clubId) {
            $query->where('club_id', $clubId);
        }

        // Cancelled events and events from suspended clubs should not appear in the main events section
        $query->where('status', '!=', 'cancelled')
              ->whereHas('club', function ($clubQuery) {
                  $clubQuery->where('status', '!=', 'suspended');
              });

        // Draft event visibility: drafted events aren't shown to members (only seen by club execs & admins)
        if (!$user->is_admin) {
            $isExecOfClub = $clubId ? $this->isExec($user->id, (int)$clubId) : false;
            if (!$isExecOfClub) {
                $query->where('status', '!=', 'draft');
            }
        }

        // Scope by status
        if ($status) {
            if ($status === 'upcoming') {
                $query->where('starts_at', '>=', now())
                      ->whereNotIn('status', ['draft', 'cancelled', 'completed']);
            } elseif ($status === 'ongoing') {
                $query->where(function ($q) {
                    $q->where('status', 'ongoing')
                      ->orWhere(function ($sub) {
                          $sub->where('starts_at', '<=', now())
                              ->where('ends_at', '>=', now());
                      });
                })->whereNotIn('status', ['draft', 'cancelled']);
            } elseif ($status === 'completed') {
                $query->where(function ($q) {
                    $q->where('status', 'completed')
                      ->orWhere('ends_at', '<', now());
                });
            } else {
                $query->where('status', $status);
            }
        }

        // Scope by date preset
        if ($datePreset) {
            if ($datePreset === 'upcoming') {
                $query->where('starts_at', '>=', now());
            } elseif ($datePreset === 'this_week') {
                $query->whereBetween('starts_at', [now(), now()->endOfWeek()]);
            } elseif ($datePreset === 'this_month') {
                $query->whereBetween('starts_at', [now(), now()->endOfMonth()]);
            } elseif ($datePreset === 'past') {
                $query->where('starts_at', '<', now());
            }
        }

        // Filter by current user registration
        if ($request->boolean('registered') || $request->query('registered') === 'true' || $request->query('registered') === '1') {
            $query->whereHas('registrations', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            });
        }

        // Visibility check: non-admins only see public events or events in clubs they are members of
        if (!$user->is_admin) {
            $query->where(function ($q) use ($user) {
                $q->where('visibility', 'public')
                  ->orWhereHas('club', function ($clubQuery) use ($user) {
                      $clubQuery->whereHas('members', function ($memberQuery) use ($user) {
                          $memberQuery->where('user_id', $user->id);
                      });
                  });
            });
        }

        $events = $query->orderBy('created_at', 'desc')->paginate(12)->appends($request->query());

        return response()->json($events);
    }

    // -------------------------------------------------------
    // GET /api/events/schedule
    //
    // Returns read-only list of ongoing and upcoming active events
    // for conflict checking.
    // -------------------------------------------------------
    public function schedule(Request $request): JsonResponse
    {
        self::syncEventStatuses();

        $user = Auth::user();
        $cacheKey = 'clubhouse:events:schedule:' . ($user->is_admin ? 'admin' : $user->id);

        $events = Cache::remember($cacheKey, 120, function () use ($user) {
            $query = Event::with('club:id,name')
                ->whereIn('status', ['published', 'upcoming', 'ongoing'])
                ->whereHas('club', function ($clubQuery) {
                    $clubQuery->where('status', '!=', 'suspended');
                })
                ->where(function ($q) {
                    $q->where('ends_at', '>=', now())
                      ->orWhere('starts_at', '>=', now());
                });

            if (!$user->is_admin) {
                $query->where(function ($q) use ($user) {
                    $q->where('visibility', 'public')
                      ->orWhereHas('club', function ($clubQuery) use ($user) {
                          $clubQuery->whereHas('members', function ($memberQuery) use ($user) {
                              $memberQuery->where('user_id', $user->id);
                          });
                      });
                });
            }

            return $query->orderBy('starts_at', 'asc')->get();
        });

        return response()->json($events);
    }

    // -------------------------------------------------------
    // POST /api/events
    //
    // Exec-only. Creates event in draft status by default.
    // Runs venue conflict check before saving/publishing.
    // -------------------------------------------------------
    public function store(StoreEventRequest $request): JsonResponse
    {
        self::syncEventStatuses();

        $user = Auth::user();
        $data = $request->validated();

        // Must be exec of the target club
        if (!$this->isClubExec($user->id, (int)$data['club_id'])) {
            return response()->json([
                'message' => 'Only club executives can create events.',
            ], 403);
        }

        $targetClub = Club::find($data['club_id']);
        if (!$targetClub || $targetClub->status === 'suspended') {
            return response()->json([
                'message' => 'Cannot create events for a suspended club.',
            ], 422);
        }

        $targetStatus = $data['status'] ?? 'draft';

        if ($targetStatus === 'published') {
            $venueConflict = $this->checkVenueConflict($data['location_value'] ?? null, $data['starts_at'], $data['ends_at']);
            if ($venueConflict) {
                return response()->json([
                    'message' => "Venue conflict: Cannot publish event. Another event ('{$venueConflict->title}') is already published at '{$data['location_value']}' during this time window.",
                ], 422);
            }
        }

        // Conflict warning: check for overlapping events in the same club
        $conflicts = $this->getConflicts(
            $data['club_id'],
            $data['starts_at'],
            $data['ends_at']
        );

        if (isset($data['custom_fields']) && is_string($data['custom_fields'])) {
            $data['custom_fields'] = json_decode($data['custom_fields'], true) ?? [];
        }

        if ($request->hasFile('banner')) {
            $path = $request->file('banner')->store('events/banners', 'public');
            $optimized = \App\Services\ImageOptimizerService::optimizeAndThumbnail($path);
            $data['banner_path'] = $optimized['path'];
            $data['banner_thumbnail_path'] = $optimized['thumbnail_path'];
        }
        unset($data['banner']);

        $event = Event::create([
            ...$data,
            'created_by' => $user->id,
            'status'     => $targetStatus,
        ]);

        AuditService::log('event.created', $event, [
            'title'    => $event->title,
            'club_id'  => $event->club_id,
            'starts_at'=> $event->starts_at,
        ]);

        CacheInvalidationService::event($event->club_id);

        if ($targetStatus === 'published') {
            $this->sendEventNotification($event, 'published', $user->id);
        } else {
            NotificationService::notifyClubMembers(
                $event->club_id,
                'event_created',
                'New Event Created',
                "A new event '{$event->title}' was created in your club.",
                Event::class,
                $event->id,
                $user->id
            );
        }

        if (!$user->is_admin) {
            NotificationService::notifyAdmins(
                'event_created',
                'New Event Created',
                "New event '{$event->title}' created for club ID {$event->club_id}.",
                Event::class,
                $event->id,
                $user->id
            );
        }

        $response = ['event' => $event->load(['club:id,name', 'creator:id,name'])];

        // Attach warning if overlapping events exist — not a block
        if ($conflicts->isNotEmpty()) {
            $response['warning'] = 'This event overlaps with ' . $conflicts->count()
                . ' other event(s) in this club.';
            $response['conflicts'] = $conflicts->map(fn($e) => [
                'id'        => $e->id,
                'title'     => $e->title,
                'starts_at' => $e->starts_at,
                'ends_at'   => $e->ends_at,
            ]);
        }

        return response()->json($response, 201);
    }

    // -------------------------------------------------------
    // GET /api/events/{event}
    // -------------------------------------------------------
    public function show(Event $event): JsonResponse
    {
        self::syncEventStatuses();

        $user = Auth::user();

        if ($event->status === 'draft') {
            if (!$user->is_admin && !$this->isExec($user->id, $event->club_id)) {
                return response()->json(['message' => 'Drafted events can only be viewed by club executives.'], 403);
            }
        }

        if (!$this->canView($user, $event)) {
            return response()->json(['message' => 'This event is members only.'], 403);
        }

        $event->load(['club:id,name', 'creator:id,name'])
              ->loadCount(['registrations' => function ($query) {
                  $query->whereIn('status', ['registered', 'approved']);
              }]);

        $userRegistration = \App\Models\EventRegistration::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->first();
        $isRegistered = (bool)$userRegistration;

        $canManage = $event->created_by === $user->id || $this->isExec($user->id, $event->club_id);

        return response()->json([
            'event'             => $event,
            'spots_remaining'   => $event->spotsRemaining(),
            'is_registered'     => $isRegistered,
            'user_registration' => $userRegistration,
            'can_manage'        => $canManage,
        ]);
    }

    // -------------------------------------------------------
    // PUT /api/events/{event}
    //
    // Exec-only. Cannot edit cancelled or completed events.
    // Re-runs conflict check if times changed.
    // -------------------------------------------------------
    public function update(UpdateEventRequest $request, Event $event): JsonResponse
    {
        self::syncEventStatuses();

        $user = Auth::user();

        if (!$user->is_admin && !$this->isExec($user->id, $event->club_id)) {
            return response()->json([
                'message' => 'Only club executives can edit events.',
            ], 403);
        }

        if (in_array($event->status, ['completed', 'cancelled']) || ($event->ends_at && $event->ends_at->isPast())) {
            return response()->json([
                'message' => 'Cannot edit a completed or cancelled event.',
            ], 422);
        }

        $data = $request->validated();

        $targetStatus  = $data['status'] ?? $event->status;
        $locationValue = $data['location_value'] ?? $event->location_value;
        $startsAt      = $data['starts_at'] ?? $event->starts_at;
        $endsAt        = $data['ends_at']   ?? $event->ends_at;

        if ($targetStatus === 'published' || ($event->status === 'published' && (isset($data['location_value']) || isset($data['starts_at']) || isset($data['ends_at'])))) {
            $venueConflict = $this->checkVenueConflict($locationValue, $startsAt, $endsAt, $event->id);
            if ($venueConflict) {
                return response()->json([
                    'message' => "Venue conflict: Cannot publish event. Another event ('{$venueConflict->title}') is already published at '{$locationValue}' during this time window.",
                ], 422);
            }
        }

        // Re-run conflict check if either time field changed
        $response = [];

        if (isset($data['starts_at']) || isset($data['ends_at'])) {
            $conflicts = $this->getConflicts(
                $event->club_id,
                $startsAt,
                $endsAt,
                $event->id // exclude self
            );

            if ($conflicts->isNotEmpty()) {
                $response['warning'] = 'Updated times overlap with ' . $conflicts->count()
                    . ' other event(s) in this club.';
                $response['conflicts'] = $conflicts->map(fn($e) => [
                    'id'        => $e->id,
                    'title'     => $e->title,
                    'starts_at' => $e->starts_at,
                    'ends_at'   => $e->ends_at,
                ]);
            }
        }

        if (isset($data['custom_fields']) && is_string($data['custom_fields'])) {
            $data['custom_fields'] = json_decode($data['custom_fields'], true) ?? [];
        }

        if ($request->hasFile('banner')) {
            if ($event->banner_path) {
                Storage::disk('public')->delete($event->banner_path);
            }
            if ($event->banner_thumbnail_path) {
                Storage::disk('public')->delete($event->banner_thumbnail_path);
            }
            $path = $request->file('banner')->store('events/banners', 'public');
            $optimized = \App\Services\ImageOptimizerService::optimizeAndThumbnail($path);
            $data['banner_path'] = $optimized['path'];
            $data['banner_thumbnail_path'] = $optimized['thumbnail_path'];
        }
        unset($data['banner']);

        $event->update($data);

        CacheInvalidationService::event($event->club_id);

        AuditService::log('event.updated', $event, ['changed_fields' => array_keys($data)]);

        $updatedEvent = $event->fresh()->load(['club:id,name', 'creator:id,name']);

        if ($updatedEvent->status !== 'draft') {
            $this->sendEventNotification($updatedEvent, 'updated', $user->id);
        }

        NotificationService::notifyEventAttendees(
            $event->id,
            'event_updated',
            'Event Details Updated',
            "The details for event '{$event->title}' have been updated.",
            Event::class,
            $event->id,
            $user->id
        );

        if ($user->is_admin && $event->created_by !== $user->id) {
            NotificationService::notifyUser(
                $event->created_by,
                'event_updated',
                'Event Modified by Admin',
                "An admin has updated your event '{$event->title}'.",
                Event::class,
                $event->id
            );
        }

        $response['event'] = $updatedEvent;

        return response()->json($response);
    }

    // -------------------------------------------------------
    // PATCH /api/events/{event}/status
    //
    // Exec-only. Enforces valid transition sequence.
    // -------------------------------------------------------
    public function updateStatus(UpdateEventStatusRequest $request, Event $event): JsonResponse
    {
        self::syncEventStatuses();

        $user      = Auth::user();
        $newStatus = $request->validated()['status'];

        if (!$user->is_admin && !$this->isExec($user->id, $event->club_id)) {
            return response()->json([
                'message' => 'Only club executives can change event status.',
            ], 403);
        }

        if (!$this->isValidTransition($event->status, $newStatus)) {
            return response()->json([
                'message'     => "Cannot transition from '{$event->status}' to '{$newStatus}'.",
                'valid_transitions' => $this->validTransitionsFrom($event->status),
            ], 422);
        }

        if ($newStatus === 'published') {
            $venueConflict = $this->checkVenueConflict($event->location_value, $event->starts_at, $event->ends_at, $event->id);
            if ($venueConflict) {
                return response()->json([
                    'message' => "Venue conflict: Cannot publish event. Another event ('{$venueConflict->title}') is already published at '{$event->location_value}' during this time window.",
                ], 422);
            }
        }

        $oldStatus = $event->status;
        $event->update(['status' => $newStatus]);

        CacheInvalidationService::event($event->club_id);

        AuditService::log('event.status_changed', $event, [
            'previous_status' => $oldStatus,
            'status'          => $newStatus,
            'previous'        => ['status' => $oldStatus],
            'changed'         => ['status' => $newStatus],
        ]);

        if ($newStatus === 'cancelled') {
            // Notify registered members/attendees
            NotificationService::notifyEventAttendees(
                $event->id,
                'event_cancelled',
                'Event Cancelled',
                "The event '{$event->title}' has been cancelled.",
                Event::class,
                $event->id
            );

            // Notify club executives when published event is cancelled
            NotificationService::notifyClubExecutives(
                $event->club_id,
                'event_cancelled',
                'Event Cancelled',
                "The event '{$event->title}' has been cancelled.",
                Event::class,
                $event->id,
                $user->id
            );

            if ($user->is_admin && $event->created_by !== $user->id) {
                NotificationService::notifyUser(
                    $event->created_by,
                    'event_cancelled',
                    'Event Cancelled by Admin',
                    "An admin cancelled your event '{$event->title}'.",
                    Event::class,
                    $event->id
                );
            }
        } elseif (in_array($newStatus, ['published', 'upcoming', 'ongoing'])) {
            $this->sendEventNotification($event->fresh(), 'published', $user->id);
        }

        return response()->json([
            'message' => "Event status updated to '{$newStatus}'.",
            'event'   => $event->fresh(),
        ]);
    }

    // -------------------------------------------------------
    // DELETE /api/events/{event}
    //
    // Exec-only. Only draft or cancelled events can be deleted.
    // -------------------------------------------------------
    public function destroy(Event $event): JsonResponse
    {
        $user = Auth::user();

        if (!$user->is_admin && !$this->isExec($user->id, $event->club_id)) {
            return response()->json([
                'message' => 'Only club executives can delete events.',
            ], 403);
        }

        if (!in_array($event->status, ['draft', 'cancelled'])) {
            return response()->json([
                'message' => 'Only draft or cancelled events can be deleted.',
            ], 422);
        }

        AuditService::log('event.deleted', $event, [
            'title'   => $event->title,
            'club_id' => $event->club_id,
        ]);

        if ($event->banner_path) {
            Storage::disk('public')->delete($event->banner_path);
        }
        if ($event->banner_thumbnail_path) {
            Storage::disk('public')->delete($event->banner_thumbnail_path);
        }

        $clubId = $event->club_id;
        $event->delete();

        CacheInvalidationService::event($clubId);

        return response()->json(['message' => 'Event deleted.']);
    }

    // -------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------

    /**
     * Check if a user is an exec (president, vp, secretary, treasurer, executive)
     * in the given club.
     */
    private function isExec(int $userId, int $clubId): bool
    {
        $user = \App\Models\User::find($userId);
        if (!$user) return false;

        return $this->isClubExec($userId, $clubId);
    }

    /**
     * Check if a user is strictly a club exec (president, vp, secretary, treasurer, executive)
     * in the given club, regardless of platform admin status.
     */
    private function isClubExec(int $userId, int $clubId): bool
    {
        $user = \App\Models\User::find($userId);
        if (!$user) return false;

        return $user->hasClubPermission($clubId, 'can_manage_events') ||
            DB::table('club_members')
                ->where('user_id', $userId)
                ->where('club_id', $clubId)
                ->where(function ($q) {
                    $q->whereNull('status')->orWhere('status', 'active');
                })
                ->whereIn('role', Event::execRoles())
                ->exists();
    }

    /**
     * Whether the authenticated user can view this event.
     * Public events: anyone. Members-only: club members + admins.
     */
    private function canView($user, Event $event): bool
    {
        if ($user->is_admin || $event->visibility === 'public') {
            return true;
        }

        return DB::table('club_members')
            ->where('user_id', $user->id)
            ->where('club_id', $event->club_id)
            ->exists();
    }

    /**
     * Find overlapping events in the same club within the given time window.
     * Excludes $exceptId (used when updating an existing event).
     *
     * Overlap condition: existing.starts_at < new.ends_at
     *                AND existing.ends_at   > new.starts_at
     */
    private function getConflicts(int $clubId, $startsAt, $endsAt, ?int $exceptId = null)
    {
        return Event::where('club_id', $clubId)
            ->whereNotIn('status', ['cancelled', 'draft'])
            ->where('starts_at', '<', $endsAt)
            ->where('ends_at', '>', $startsAt)
            ->when($exceptId, fn($q) => $q->where('id', '!=', $exceptId))
            ->get(['id', 'title', 'starts_at', 'ends_at']);
    }

    /**
     * Valid status transition map.
     *
     * draft      → published, cancelled
     * published  → ongoing, cancelled
     * ongoing    → completed, cancelled
     * completed  → (terminal)
     * cancelled  → (terminal)
     */
    private function isValidTransition(string $from, string $to): bool
    {
        $allowed = $this->validTransitionsFrom($from);
        return in_array($to, $allowed);
    }

    /**
     * Automatically update event statuses based on set start/end times.
     */
    public static function syncEventStatuses(): void
    {
        $now = now();

        // Check if there are any events that need updating to avoid write locks on every GET request.
        $hasDraftsToCancel = Event::where('status', 'draft')
            ->where('starts_at', '<=', $now)
            ->exists();

        $hasPublishedToOngoing = Event::where('status', 'published')
            ->where('starts_at', '<=', $now)
            ->where('ends_at', '>', $now)
            ->exists();

        $hasOngoingToComplete = Event::whereIn('status', ['published', 'ongoing'])
            ->where('ends_at', '<=', $now)
            ->exists();

        // C. Drafted event automatically goes to cancelled if set time is reached without being published
        if ($hasDraftsToCancel) {
            Event::where('status', 'draft')
                ->where('starts_at', '<=', $now)
                ->update(['status' => 'cancelled']);
        }

        // B. Published event automatically goes to ongoing when set time starts
        if ($hasPublishedToOngoing) {
            Event::where('status', 'published')
                ->where('starts_at', '<=', $now)
                ->where('ends_at', '>', $now)
                ->update(['status' => 'ongoing']);
        }

        // B. Published or ongoing event automatically goes to completed when set time ends
        if ($hasOngoingToComplete) {
            Event::whereIn('status', ['published', 'ongoing'])
                ->where('ends_at', '<=', $now)
                ->update(['status' => 'completed']);
        }
    }

    /**
     * Check if another published/ongoing event exists at the exact same venue with overlapping time window.
     */
    private function checkVenueConflict(?string $locationValue, $startsAt, $endsAt, ?int $exceptId = null): ?Event
    {
        if (empty($locationValue)) {
            return null;
        }

        $loc = strtolower(trim($locationValue));
        $startsAtStr = \Carbon\Carbon::parse($startsAt)->toDateTimeString();
        $endsAtStr   = \Carbon\Carbon::parse($endsAt)->toDateTimeString();

        return Event::whereIn('status', ['published', 'ongoing'])
            ->whereRaw('LOWER(TRIM(location_value)) = ?', [$loc])
            ->where('starts_at', '<', $endsAtStr)
            ->where('ends_at', '>', $startsAtStr)
            ->when($exceptId, fn($q) => $q->where('id', '!=', $exceptId))
            ->first();
    }

    private function validTransitionsFrom(string $status): array
    {
        return match($status) {
            'draft'     => ['published', 'cancelled'],
            'published' => ['ongoing', 'cancelled'],
            'ongoing'   => ['completed', 'cancelled'],
            default     => [], // completed, cancelled — terminal
        };
    }

    /**
     * Send event notification in plain English.
     * Public events notify all users; members-only events notify club members.
     */
    private function sendEventNotification(Event $event, string $actionType, ?int $excludeUserId = null): void
    {
        $event->loadMissing('club');
        $clubName = $event->club ? $event->club->name : 'Club';
        $location = $event->location_value ?: ($event->venue ?: 'TBA');
        $startTime = $event->starts_at ? \Carbon\Carbon::parse($event->starts_at)->format('M d, Y \a\t g:i A') : 'TBA';

        if ($actionType === 'published') {
            $title = $event->visibility === 'public' ? "New Public Event: {$event->title}" : "New Event: {$event->title}";
            $message = "The event '{$event->title}' hosted by {$clubName} is now published. Location: {$location}, Start Time: {$startTime}.";

            if ($event->visibility === 'public') {
                NotificationService::notifyAllUsers('event_created', $title, $message, Event::class, $event->id, $excludeUserId);
            } else {
                NotificationService::notifyClubMembers($event->club_id, 'event_created', $title, $message, Event::class, $event->id, $excludeUserId);
            }
        } elseif ($actionType === 'updated') {
            $title = "Event Updated: {$event->title}";
            $message = "The event '{$event->title}' hosted by {$clubName} has been updated. Location: {$location}, Start Time: {$startTime}.";

            if ($event->visibility === 'public') {
                NotificationService::notifyAllUsers('event_updated', $title, $message, Event::class, $event->id, $excludeUserId);
            } else {
                NotificationService::notifyClubMembers($event->club_id, 'event_updated', $title, $message, Event::class, $event->id, $excludeUserId);
            }
        }
    }

    /**
     * POST /api/events/{event}/send-reminder
     *
     * Exec-only manual trigger to send custom reminder notifications to registered attendees.
     */
    public function sendReminder(Request $request, Event $event): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasClubPermission($event->club_id, 'can_manage_events')) {
            return response()->json([
                'message' => 'Only club executives can send event reminders.',
            ], 403);
        }

        $validated = $request->validate([
            'message' => 'nullable|string|max:500',
        ]);

        $customMessage = trim($validated['message'] ?? '');
        $title = "Event Reminder: {$event->title}";
        $message = $customMessage !== ''
            ? $customMessage
            : "Reminder! '{$event->title}' is scheduled for {$event->starts_at->format('M d, Y \a\t h:i A')}. See you there!";

        NotificationService::notifyEventAttendees(
            $event->id,
            'event_manual_reminder',
            $title,
            $message,
            Event::class,
            $event->id,
            $user->id
        );

        AuditService::log('event.reminder_sent', $event, [
            'sent_by' => $user->id,
            'message' => $message,
        ]);

        return response()->json([
            'message' => 'Event reminder successfully sent to all registered attendees.',
        ]);
    }
}
