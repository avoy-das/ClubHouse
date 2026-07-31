<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEventRequest;
use App\Http\Requests\UpdateEventRequest;
use App\Http\Requests\UpdateEventStatusRequest;
use App\Models\Club;
use App\Models\Event;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

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
        $user       = Auth::user();
        $clubId     = $request->query('club_id');
        $status     = strtolower($request->query('status', ''));
        $search     = $request->query('search');
        $datePreset = strtolower($request->query('date_preset', $request->query('date', '')));

        $query = Event::with(['club:id,name', 'creator:id,name'])
            ->withCount('registrations');

        // Text search by title
        if ($search) {
            $query->where('title', 'like', '%' . $search . '%');
        }

        // Scope to specific club if requested
        if ($clubId) {
            $query->where('club_id', $clubId);
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

        $events = $query->orderBy('starts_at', 'asc')->paginate(12)->appends($request->query());

        return response()->json($events);
    }

    // -------------------------------------------------------
    // POST /api/events
    //
    // Exec-only. Creates event in draft status.
    // Runs conflict warning check before saving.
    // -------------------------------------------------------
    public function store(StoreEventRequest $request): JsonResponse
    {
        $user = Auth::user();
        $data = $request->validated();

        // Must be exec of the target club (or platform admin)
        if (!$user->is_admin && !$this->isExec($user->id, $data['club_id'])) {
            return response()->json([
                'message' => 'Only club executives can create events.',
            ], 403);
        }

        // Conflict warning: check for overlapping events in the same club
        $conflicts = $this->getConflicts(
            $data['club_id'],
            $data['starts_at'],
            $data['ends_at']
        );

        $event = Event::create([
            ...$data,
            'created_by' => $user->id,
            'status'     => 'draft',
        ]);

        AuditService::log('event.created', $event, [
            'title'    => $event->title,
            'club_id'  => $event->club_id,
            'starts_at'=> $event->starts_at,
        ]);

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
        $user = Auth::user();

        if (!$this->canView($user, $event)) {
            return response()->json(['message' => 'This event is members only.'], 403);
        }

        $event->load(['club:id,name', 'creator:id,name'])
              ->loadCount('registrations');

        $isRegistered = \App\Models\EventRegistration::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->exists();

        $canManage = $user->is_admin || $event->created_by === $user->id || $this->isExec($user->id, $event->club_id);

        return response()->json([
            'event'           => $event,
            'spots_remaining' => $event->spotsRemaining(),
            'is_registered'   => $isRegistered,
            'can_manage'      => $canManage,
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
        $user = Auth::user();

        if (!$user->is_admin && !$this->isExec($user->id, $event->club_id)) {
            return response()->json([
                'message' => 'Only club executives can edit events.',
            ], 403);
        }

        if (in_array($event->status, ['completed', 'cancelled'])) {
            return response()->json([
                'message' => 'Cannot edit a completed or cancelled event.',
            ], 422);
        }

        $data = $request->validated();

        // Re-run conflict check if either time field changed
        $response = [];
        $startsAt = $data['starts_at'] ?? $event->starts_at;
        $endsAt   = $data['ends_at']   ?? $event->ends_at;

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

        $event->update($data);

        AuditService::log('event.updated', $event, ['changed_fields' => array_keys($data)]);

        $response['event'] = $event->fresh()->load(['club:id,name', 'creator:id,name']);

        return response()->json($response);
    }

    // -------------------------------------------------------
    // PATCH /api/events/{event}/status
    //
    // Exec-only. Enforces valid transition sequence.
    // -------------------------------------------------------
    public function updateStatus(UpdateEventStatusRequest $request, Event $event): JsonResponse
    {
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

        $oldStatus = $event->status;
        $event->update(['status' => $newStatus]);

        AuditService::log('event.status_changed', $event, [
            'from' => $oldStatus,
            'to'   => $newStatus,
        ]);

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

        $event->delete();

        return response()->json(['message' => 'Event deleted.']);
    }

    // -------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------

    /**
     * Check if a user is an exec (president, vp, secretary, treasurer)
     * in the given club.
     */
    private function isExec(int $userId, int $clubId): bool
    {
        return DB::table('club_members')
            ->where('user_id', $userId)
            ->where('club_id', $clubId)
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

    private function validTransitionsFrom(string $status): array
    {
        return match($status) {
            'draft'     => ['published', 'cancelled'],
            'published' => ['ongoing', 'cancelled'],
            'ongoing'   => ['completed', 'cancelled'],
            default     => [], // completed, cancelled — terminal
        };
    }
}
