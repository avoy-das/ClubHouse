<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class EventRegistrationController extends Controller
{
    /**
     * GET /api/events/{event}/registrations
     *
     * List all registrations for an event with attendance status.
     * Executive/Admin only.
     */
    public function index(Request $request, Event $event): JsonResponse
    {
        $user = Auth::user();

        if (!$this->canManageAttendance($user, $event)) {
            return response()->json([
                'message' => 'Only club executives can view event registrations.',
            ], 403);
        }

        $query = EventRegistration::with('user:id,name,email,student_id,department')
            ->where('event_id', $event->id);

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('student_id', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $registrations = $query->latest()->get();

        return response()->json([
            'registrations' => $registrations,
            'total'         => $registrations->count(),
        ]);
    }

    /**
     * POST /api/events/{event}/register
     *
     * Registers the authenticated user for an event.
     */
    public function register(Request $request, Event $event): JsonResponse
    {
        $user = Auth::user();

        // 1. Guard against duplicate registration (409 Conflict)
        $alreadyRegistered = EventRegistration::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->exists();

        if ($alreadyRegistered) {
            return response()->json([
                'message' => 'You are already registered for this event.',
            ], 409);
        }

        // 2. Guard against registering for closed/completed/cancelled/past events
        if (in_array($event->status, ['completed', 'cancelled']) || $event->ends_at->isPast()) {
            return response()->json([
                'message' => 'Registration is closed because this event has ended or is cancelled.',
            ], 422);
        }

        // 3. Perform capacity check and registration inside a DB transaction with pessimistic locking
        try {
            DB::transaction(function () use ($event, $user) {
                // Lock the event row for update to prevent concurrent overbooking
                $lockedEvent = Event::where('id', $event->id)->lockForUpdate()->first();

                if (!$lockedEvent) {
                    throw new \RuntimeException('Event no longer exists.', 404);
                }

                // Capacity check if set (capacity null means unlimited)
                if (!is_null($lockedEvent->capacity)) {
                    $currentCount = $lockedEvent->registrations()->count();
                    if ($currentCount >= $lockedEvent->capacity) {
                        throw new \RuntimeException('This event is fully booked.', 422);
                    }
                }

                // Create registration record
                EventRegistration::create([
                    'event_id' => $lockedEvent->id,
                    'user_id'  => $user->id,
                ]);
            });
        } catch (\RuntimeException $e) {
            $code = $e->getCode() >= 400 && $e->getCode() < 600 ? $e->getCode() : 422;
            return response()->json([
                'message' => $e->getMessage(),
            ], $code);
        }

        AuditService::log('event.registered', $event, [
            'user_id'  => $user->id,
            'event_id' => $event->id,
        ]);

        return response()->json([
            'message'             => 'Successfully registered for event.',
            'is_registered'       => true,
            'registrations_count' => $event->registrations()->count(),
            'spots_remaining'     => $event->spotsRemaining(),
        ], 201);
    }

    /**
     * DELETE /api/events/{event}/register
     *
     * Cancels the authenticated user's registration.
     */
    public function cancel(Request $request, Event $event): JsonResponse
    {
        $user = Auth::user();

        // 1. Guard against non-registered user
        $registration = EventRegistration::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$registration) {
            return response()->json([
                'message' => 'You are not registered for this event.',
            ], 422);
        }

        // 2. Guard against cancelling after event has started or completed
        if ($event->status === 'ongoing' || $event->status === 'completed' || $event->starts_at->isPast()) {
            return response()->json([
                'message' => 'Registration changes are not allowed after the event has started.',
            ], 403);
        }

        $registration->delete();

        AuditService::log('event.registration_cancelled', $event, [
            'user_id'  => $user->id,
            'event_id' => $event->id,
        ]);

        return response()->json([
            'message'             => 'Registration successfully cancelled.',
            'is_registered'       => false,
            'registrations_count' => $event->registrations()->count(),
            'spots_remaining'     => $event->spotsRemaining(),
        ]);
    }

    /**
     * PATCH /api/events/{event}/registrations/{user}/attendance
     *
     * Exec-only action to mark attendance for a registered user.
     */
    public function updateAttendance(Request $request, Event $event, User $user): JsonResponse
    {
        $authUser = Auth::user();

        if (!$this->canManageAttendance($authUser, $event)) {
            return response()->json([
                'message' => 'Only club executives can update attendance.',
            ], 403);
        }

        $registration = EventRegistration::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$registration) {
            return response()->json([
                'message' => 'This user is not registered for the event.',
            ], 404);
        }

        $validated = $request->validate([
            'attended' => ['nullable', 'boolean'],
        ]);

        $attendedVal = array_key_exists('attended', $validated) ? $validated['attended'] : null;

        $registration->update([
            'attended' => $attendedVal,
        ]);

        AuditService::log('event.attendance_updated', $event, [
            'target_user_id' => $user->id,
            'attended'       => $attendedVal,
            'updated_by'     => $authUser->id,
        ]);

        return response()->json([
            'message'      => 'Attendance status updated successfully.',
            'registration' => $registration->fresh()->load('user:id,name,email,student_id,department'),
        ]);
    }

    /**
     * GET /api/events/{event}/attendance-report
     *
     * Exec-only attendance summary report metrics.
     */
    public function attendanceReport(Event $event): JsonResponse
    {
        $user = Auth::user();

        if (!$this->canManageAttendance($user, $event)) {
            return response()->json([
                'message' => 'Only club executives can view attendance reports.',
            ], 403);
        }

        $totalRegistered = $event->registrations()->count();
        $attendedCount   = $event->registrations()->where('attended', true)->count();
        $absentCount     = $event->registrations()->where('attended', false)->count();
        $unmarkedCount   = $event->registrations()->whereNull('attended')->count();

        $attendanceRate = $totalRegistered > 0
            ? round(($attendedCount / $totalRegistered) * 100, 1)
            : 0;

        return response()->json([
            'event' => [
                'id'         => $event->id,
                'title'      => $event->title,
                'status'     => $event->status,
                'starts_at'  => $event->starts_at,
                'ends_at'    => $event->ends_at,
                'capacity'   => $event->capacity,
            ],
            'metrics' => [
                'total_registered' => $totalRegistered,
                'attended_count'   => $attendedCount,
                'absent_count'     => $absentCount,
                'unmarked_count'   => $unmarkedCount,
                'attendance_rate'  => $attendanceRate,
                'capacity'         => $event->capacity,
                'spots_remaining'  => $event->spotsRemaining(),
            ],
        ]);
    }

    /**
     * Check if user is executive of club or admin.
     */
    private function canManageAttendance($user, Event $event): bool
    {
        if ($user->is_admin) {
            return true;
        }

        return DB::table('club_members')
            ->where('user_id', $user->id)
            ->where('club_id', $event->club_id)
            ->whereIn('role', Event::execRoles())
            ->exists();
    }
}
