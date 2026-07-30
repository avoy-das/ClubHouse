<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventRegistration;
use App\Services\AuditService;
use Illuminate\Http\Request;
//use App\Http\Controllers\EventRegistrationController;
use App\Http\Controllers\EventFeedbackController;
use App\Notifications\EventRegistrationConfirmed;
use App\Notifications\AttendanceMarked;

class EventRegistrationController extends Controller
{
    // -------------------------------------------------------------------------
    // POST /events/{event}/register
    // Any authenticated user. Event must be Published.
    // Enforces capacity limit and members_only gate.
    // -------------------------------------------------------------------------
    public function register(Request $request, Event $event)
    {
        $user = $request->user();

        // Only Published events accept new registrations
        if ($event->status !== 'published') {
            return response()->json([
                'message' => 'Registrations are not open for this event.',
            ], 422);
        }

        // members_only gate — user must be a member of the event's club
        if ($event->visibility === 'members_only') {
            $isMember = $event->club->members()
                ->where('user_id', $user->id)
                ->exists();

            if (!$isMember && !$user->is_admin) {
                return response()->json([
                    'message' => 'This event is open to club members only.',
                ], 403);
            }
        }

        // Prevent duplicate registration
        $alreadyRegistered = EventRegistration::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->exists();

        if ($alreadyRegistered) {
            return response()->json([
                'message' => 'You are already registered for this event.',
            ], 422);
        }

        // Capacity check (null capacity = unlimited)
        if ($event->capacity !== null) {
            $registered = EventRegistration::where('event_id', $event->id)->count();

            if ($registered >= $event->capacity) {
                return response()->json([
                    'message' => 'This event has reached its maximum capacity.',
                ], 422);
            }
        }

        $registration = EventRegistration::create([
            'event_id' => $event->id,
            'user_id'  => $user->id,
        ]);

        $request->user()->notify(new EventRegistrationConfirmed($registration));

        // register
AuditService::log(
    'event.registered',
    $registration,
    ['event_id' => $event->id, 'event_title' => $event->title]
);

        return response()->json([
            'message'      => 'Successfully registered for the event.',
            'registration' => $registration,
        ], 201);
    }

    // -------------------------------------------------------------------------
    // DELETE /events/{event}/register
    // Own registration only. Blocked once event is Ongoing, Completed,
    // or Cancelled. Hard delete.
    // -------------------------------------------------------------------------
    public function unregister(Request $request, Event $event)
    {
        $user = $request->user();

        $lockedStatuses = ['ongoing', 'completed', 'cancelled'];
        if (in_array($event->status, $lockedStatuses)) {
            return response()->json([
                'message' => 'You cannot unregister from an event that is already ongoing, completed, or cancelled.',
            ], 422);
        }

        $registration = EventRegistration::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$registration) {
            return response()->json([
                'message' => 'You are not registered for this event.',
            ], 404);
        }

        $registration->delete();

        // unregister
AuditService::log(
    'event.unregistered',
    $event,
    ['event_id' => $event->id, 'event_title' => $event->title]
);

        return response()->json([
            'message' => 'Successfully unregistered from the event.',
        ]);
    }

    // -------------------------------------------------------------------------
    // GET /events/{event}/registrants
    // Exec of the event's club + platform admin only.
    // -------------------------------------------------------------------------
    public function registrants(Request $request, Event $event)
    {
        $user = $request->user();

        if (!$user->is_admin) {
            $isExec = $this->isExecOfClub($user, $event->club_id);

            if (!$isExec) {
                return response()->json([
                    'message' => 'Only club executives can view the registrant list.',
                ], 403);
            }
        }

        $registrants = EventRegistration::with('user:id,name,email,student_id,department')
            ->where('event_id', $event->id)
            ->get();

        return response()->json([
            'event'      => $event->title,
            'total'      => $registrants->count(),
            'registrants' => $registrants,
        ]);
    }

    // -------------------------------------------------------------------------
    // PATCH /events/{event}/registrants/{registration}/attendance
    // Exec of the event's club + platform admin only.
    // Body: { "attended": true|false }
    // Sets attended; null (unmarked) is the DB default.
    // -------------------------------------------------------------------------
    public function markAttendance(Request $request, Event $event, EventRegistration $registration)
    {
        $user = $request->user();

        // Confirm this registration belongs to this event
        if ($registration->event_id !== $event->id) {
            return response()->json([
                'message' => 'Registration does not belong to this event.',
            ], 422);
        }

        if (!$user->is_admin) {
            $isExec = $this->isExecOfClub($user, $event->club_id);

            if (!$isExec) {
                return response()->json([
                    'message' => 'Only club executives can mark attendance.',
                ], 403);
            }
        }

        $request->validate([
            'attended' => 'required|boolean',
        ]);

        $previous = $registration->attended;
$registration->update(['attended' => $request->attended]);

// Notify the attendee that their attendance has been marked
$registration->user->notify(new AttendanceMarked($registration));

        // markAttendance
AuditService::log(
    'event.attendance_marked',
    $registration,
    [
        'event_id'    => $event->id,
        'event_title' => $event->title,
        'attendee_id' => $registration->user_id,
        'from'        => $previous,
        'to'          => $request->attended,
    ]
);

        return response()->json([
            'message'      => 'Attendance updated.',
            'registration' => $registration->fresh(),
        ]);
    }

    // -------------------------------------------------------------------------
    // Helper — exec roles on club_members
    // -------------------------------------------------------------------------
    private function isExecOfClub($user, int $clubId): bool
    {
        $execRoles = ['president', 'vice_president', 'secretary', 'treasurer'];

        return $user->clubMemberships()
            ->where('club_id', $clubId)
            ->whereIn('role', $execRoles)
            ->exists();
    }
}