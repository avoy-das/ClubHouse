<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use App\Services\AuditService;
use App\Services\NotificationService;
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
            $escaped = '%' . addcslashes($search, '%_\\') . '%';
            $query->whereHas('user', function ($q) use ($escaped) {
                $q->where('name', 'like', $escaped)
                  ->orWhere('student_id', 'like', $escaped)
                  ->orWhere('email', 'like', $escaped);
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

        // 0. Guard against blocked user (403 Forbidden)
        $isBlocked = \App\Models\EventBlock::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->exists();

        if ($isBlocked) {
            return response()->json([
                'message' => 'You are blocked from registering for this event.',
            ], 403);
        }

        // 1. Guard against duplicate registration (409 Conflict)
        $alreadyRegistered = EventRegistration::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->first();

        if ($alreadyRegistered) {
            $msg = $alreadyRegistered->status === 'waitlisted' 
                ? 'You are already on the waitlist for this event.' 
                : 'You are already registered for this event.';
            return response()->json([
                'message' => $msg,
            ], 409);
        }

        // Guard against registering for events of suspended clubs
        if ($event->club && $event->club->status === 'suspended') {
            return response()->json([
                'message' => 'Registration is not allowed because the hosting club is suspended.',
            ], 422);
        }

        // 2. Guard against registering for non-published events (e.g. draft, even for club executives)
        if ($event->status === 'draft') {
            return response()->json([
                'message' => 'Registration is not allowed before the event is published.',
            ], 422);
        }

        // Guard against registering for closed/completed/cancelled/past events
        if (in_array($event->status, ['completed', 'cancelled']) || $event->ends_at->isPast()) {
            return response()->json([
                'message' => 'Registration is closed because this event has ended or is cancelled.',
            ], 422);
        }

        // 3. Extract and process custom field answers / files
        $answersData = $request->input('answers', []);
        if (is_string($answersData)) {
            $answersData = json_decode($answersData, true) ?? [];
        }
        if (!is_array($answersData)) {
            $answersData = [];
        }

        $allowedExtensions = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp'];

        // Validate uploaded files
        $request->validate([
            'answers_files.*' => 'file|max:5120|mimes:pdf,doc,docx,jpg,jpeg,png,webp',
        ]);

        if ($request->hasFile('answers_files')) {
            $uploadedFiles = $request->file('answers_files');
            if (is_array($uploadedFiles)) {
                foreach ($uploadedFiles as $key => $file) {
                    if ($file && $file->isValid()) {
                        $ext = strtolower($file->getClientOriginalExtension());
                        if (!in_array($ext, $allowedExtensions, true)) {
                            return response()->json(['message' => 'Invalid file format uploaded.'], 422);
                        }
                        $path = $file->store('event_answers', 'public');
                        $answersData['custom_files'][$key] = [
                            'name' => $file->getClientOriginalName(),
                            'path' => $path,
                            'url'  => asset('storage/' . $path),
                        ];
                    }
                }
            }
        }

        foreach ($request->allFiles() as $key => $file) {
            if ($key !== 'answers_files' && !is_array($file) && $file->isValid()) {
                $ext = strtolower($file->getClientOriginalExtension());
                if (!in_array($ext, $allowedExtensions, true) || $file->getSize() > 5242880) {
                    return response()->json(['message' => 'Invalid file format or file size exceeded (max 5MB).'], 422);
                }
                $path = $file->store('event_answers', 'public');
                $answersData['custom_files'][$key] = [
                    'name' => $file->getClientOriginalName(),
                    'path' => $path,
                    'url'  => asset('storage/' . $path),
                ];
            }
        }

        $status = 'registered';

        // 4. Perform capacity check and registration inside a DB transaction with pessimistic locking
        try {
            DB::transaction(function () use ($event, $user, $answersData, &$status) {
                // Lock the event row for update to prevent concurrent overbooking
                $lockedEvent = Event::where('id', $event->id)->lockForUpdate()->first();

                if (!$lockedEvent) {
                    throw new \RuntimeException('Event no longer exists.', 404);
                }

                // Capacity check if set (capacity null means unlimited)
                if (!is_null($lockedEvent->capacity)) {
                    $currentCount = $lockedEvent->registrations()->where('status', 'registered')->count();
                    if ($currentCount >= $lockedEvent->capacity) {
                        $status = 'waitlisted';
                    }
                }

                // Create registration record
                EventRegistration::create([
                    'event_id' => $lockedEvent->id,
                    'user_id'  => $user->id,
                    'answers'  => $answersData,
                    'status'   => $status,
                ]);
            });
        } catch (\RuntimeException $e) {
            $code = $e->getCode() >= 400 && $e->getCode() < 600 ? $e->getCode() : 422;
            return response()->json([
                'message' => $e->getMessage(),
            ], $code);
        }

        if ($status === 'registered') {
            NotificationService::notifyUser(
                $user->id,
                'event_registration_confirmed',
                'Registration Confirmed',
                "Your registration for event '{$event->title}' has been confirmed!",
                Event::class,
                $event->id
            );
        } else {
            $position = EventRegistration::where('event_id', $event->id)->where('status', 'waitlisted')->count();
            NotificationService::notifyUser(
                $user->id,
                'event_waitlist_joined',
                'Joined Waitlist',
                "You have joined the waitlist for event '{$event->title}' (position: {$position}).",
                Event::class,
                $event->id
            );
        }

        return response()->json([
            'message'             => $status === 'registered' ? 'Successfully registered for event.' : 'Successfully joined the waitlist.',
            'is_registered'       => true,
            'status'              => $status,
            'registrations_count' => $event->registrations()->where('status', 'registered')->count(),
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

        $wasRegistered = ($registration->status === 'registered');

        DB::transaction(function () use ($registration, $event, $wasRegistered) {
            $registration->delete();

            if ($wasRegistered) {
                $this->promoteNextWaitlistUser($event);
            }
        });

        return response()->json([
            'message'             => 'Registration successfully cancelled.',
            'is_registered'       => false,
            'registrations_count' => $event->registrations()->where('status', 'registered')->count(),
            'spots_remaining'     => $event->spotsRemaining(),
        ]);
    }

    /**
     * DELETE /api/events/{event}/registrations/{user}/cancel
     *
     * Exec-only action to cancel another user's registration.
     */
    public function execCancel(Request $request, Event $event, User $user): JsonResponse
    {
        $authUser = Auth::user();

        if (!$authUser->hasClubPermission($event->club_id, 'can_manage_events')) {
            return response()->json([
                'message' => 'Only club executives can cancel attendee registrations.',
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

        $wasRegistered = ($registration->status === 'registered');

        DB::transaction(function () use ($registration, $event, $wasRegistered) {
            $registration->delete();

            if ($wasRegistered) {
                $this->promoteNextWaitlistUser($event);
            }
        });

        NotificationService::notifyUser(
            $user->id,
            'event_registration_cancelled_by_exec',
            'Registration Cancelled',
            "Your registration for event '{$event->title}' has been cancelled by a club executive.",
            Event::class,
            $event->id
        );

        return response()->json([
            'message'             => 'Registration cancelled by executive.',
            'registrations_count' => $event->registrations()->where('status', 'registered')->count(),
            'spots_remaining'     => $event->spotsRemaining(),
        ]);
    }

    /**
     * POST /api/events/{event}/blocks
     *
     * Exec-only action to block a user from registering for an event.
     * If they have an active registration/waitlist, it implicitly cancels it first.
     */
    public function block(Request $request, Event $event): JsonResponse
    {
        $authUser = Auth::user();

        if (!$authUser->hasClubPermission($event->club_id, 'can_manage_events')) {
            return response()->json([
                'message' => 'Only club executives can block users from registering.',
            ], 403);
        }

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'reason'  => 'nullable|string|max:255',
        ]);

        $userId = $validated['user_id'];

        $alreadyBlocked = \App\Models\EventBlock::where('event_id', $event->id)
            ->where('user_id', $userId)
            ->exists();

        if ($alreadyBlocked) {
            return response()->json([
                'message' => 'This user is already blocked.',
            ], 409);
        }

        DB::transaction(function () use ($event, $userId, $authUser, $validated) {
            \App\Models\EventBlock::create([
                'event_id'   => $event->id,
                'user_id'    => $userId,
                'blocked_by' => $authUser->id,
                'reason'     => $validated['reason'] ?? null,
            ]);

            $registration = EventRegistration::where('event_id', $event->id)
                ->where('user_id', $userId)
                ->first();

            if ($registration) {
                $wasRegistered = ($registration->status === 'registered');
                $registration->delete();

                if ($wasRegistered) {
                    $this->promoteNextWaitlistUser($event);
                }
            }
        });

        NotificationService::notifyUser(
            $userId,
            'event_user_blocked',
            'Blocked from Event',
            "You have been blocked from registering for event '{$event->title}'.",
            Event::class,
            $event->id
        );

        return response()->json([
            'message'             => 'User successfully blocked and registration cancelled.',
            'registrations_count' => $event->registrations()->where('status', 'registered')->count(),
            'spots_remaining'     => $event->spotsRemaining(),
        ]);
    }

    /**
     * DELETE /api/events/{event}/blocks/{user}
     *
     * Exec-only action to unblock a user.
     */
    public function unblock(Request $request, Event $event, User $user): JsonResponse
    {
        $authUser = Auth::user();

        if (!$authUser->hasClubPermission($event->club_id, 'can_manage_events')) {
            return response()->json([
                'message' => 'Only club executives can unblock users.',
            ], 403);
        }

        $block = \App\Models\EventBlock::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$block) {
            return response()->json([
                'message' => 'This user is not blocked.',
            ], 404);
        }

        $block->delete();

        NotificationService::notifyUser(
            $user->id,
            'event_user_unblocked',
            'Unblocked from Event',
            "You have been unblocked and can now register for event '{$event->title}'.",
            Event::class,
            $event->id
        );

        return response()->json([
            'message' => 'User successfully unblocked.',
        ]);
    }

    /**
     * GET /api/events/{event}/blocks
     *
     * Exec-only action to list blocked users.
     */
    public function blocks(Event $event): JsonResponse
    {
        $authUser = Auth::user();

        if (!$authUser->hasClubPermission($event->club_id, 'can_manage_events')) {
            return response()->json([
                'message' => 'Only club executives can view blocked users.',
            ], 403);
        }

        $blocks = \App\Models\EventBlock::with(['user:id,name,email,student_id,department', 'blockedBy:id,name'])
            ->where('event_id', $event->id)
            ->latest()
            ->get();

        return response()->json([
            'blocks' => $blocks,
        ]);
    }

    /**
     * Helper to promote the first waitlisted user.
     */
    private function promoteNextWaitlistUser(Event $event): void
    {
        if (is_null($event->capacity)) {
            $next = EventRegistration::where('event_id', $event->id)
                ->where('status', 'waitlisted')
                ->orderBy('created_at', 'asc')
                ->first();
            if ($next) {
                $next->update(['status' => 'registered']);
                NotificationService::notifyUser(
                    $next->user_id,
                    'event_registration_promoted',
                    'Promoted from Waitlist',
                    "You have been promoted from the waitlist for event '{$event->title}' and your registration is now confirmed!",
                    Event::class,
                    $event->id
                );
            }
            return;
        }

        $activeCount = EventRegistration::where('event_id', $event->id)
            ->where('status', 'registered')
            ->count();

        if ($activeCount < $event->capacity) {
            $next = EventRegistration::where('event_id', $event->id)
                ->where('status', 'waitlisted')
                ->orderBy('created_at', 'asc')
                ->first();

            if ($next) {
                $next->update(['status' => 'registered']);

                NotificationService::notifyUser(
                    $next->user_id,
                    'event_registration_promoted',
                    'Promoted from Waitlist',
                    "You have been promoted from the waitlist for event '{$event->title}' and your registration is now confirmed!",
                    Event::class,
                    $event->id
                );

                $this->promoteNextWaitlistUser($event);
            }
        }
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

        if ($attendedVal === true) {
            NotificationService::notifyUser(
                $user->id,
                'event_attendance',
                'Attendance Marked: Present',
                "Your attendance for '{$event->title}' has been marked as Attended.",
                Event::class,
                $event->id
            );
        } elseif ($attendedVal === false) {
            NotificationService::notifyUser(
                $user->id,
                'event_attendance',
                'Attendance Marked: Absent',
                "Your attendance for '{$event->title}' has been marked as Absent.",
                Event::class,
                $event->id
            );
        }

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

        $totalRegistered = $event->registrations()->where('status', 'registered')->count();
        $attendedCount   = $event->registrations()->where('status', 'registered')->where('attended', true)->count();
        $absentCount     = $event->registrations()->where('status', 'registered')->where('attended', false)->count();
        $unmarkedCount   = $event->registrations()->where('status', 'registered')->whereNull('attended')->count();

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
        return $user->hasClubPermission($event->club_id, 'can_track_attendance') ||
            DB::table('club_members')
                ->where('user_id', $user->id)
                ->where('club_id', $event->club_id)
                ->where(function ($q) {
                    $q->whereNull('status')->orWhere('status', 'active');
                })
                ->whereIn('role', Event::execRoles())
                ->exists();
    }
}
