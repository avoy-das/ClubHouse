<?php

namespace App\Http\Controllers;

use App\Http\Requests\MarkAttendanceRequest;
use App\Models\Certificate;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EventRegistrationController extends Controller
{
    public function store(Request $request, Event $event): JsonResponse
    {
        $user = $request->user();

        if ($event->status !== 'published') {
            return response()->json(['message' => 'Registration is not open for this event.'], 422);
        }

        if ($event->registration_deadline && now()->gt($event->registration_deadline)) {
            return response()->json(['message' => 'Registration deadline has passed.'], 422);
        }

        return DB::transaction(function () use ($event, $user) {
            $lockedEvent = Event::where('id', $event->id)->lockForUpdate()->first();

            if ($lockedEvent->capacity !== null) {
                $registeredCount = EventRegistration::where('event_id', $lockedEvent->id)
                    ->where('status', 'registered')
                    ->count();

                if ($registeredCount >= $lockedEvent->capacity) {
                    return response()->json(['message' => 'Event capacity is full.'], 422);
                }
            }

            $existing = EventRegistration::where('event_id', $lockedEvent->id)
                ->where('user_id', $user->id)
                ->first();

            if ($existing) {
                if ($existing->status === 'registered') {
                    return response()->json(['message' => 'You are already registered for this event.'], 422);
                }
                $existing->update([
                    'status'        => 'registered',
                    'registered_at' => now(),
                ]);
                return response()->json($existing->load('event'));
            }

            $registration = EventRegistration::create([
                'event_id'      => $lockedEvent->id,
                'user_id'       => $user->id,
                'status'        => 'registered',
                'registered_at' => now(),
            ]);

            return response()->json($registration->load('event'), 201);
        });
    }

    public function destroy(Request $request, Event $event): JsonResponse
    {
        $user = $request->user();

        if (now()->gte($event->start_at)) {
            return response()->json(['message' => 'Cannot cancel registration after event has started.'], 422);
        }

        $registration = EventRegistration::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$registration || $registration->status === 'cancelled') {
            return response()->json(['message' => 'Active registration not found.'], 404);
        }

        $registration->update(['status' => 'cancelled']);

        return response()->json(['message' => 'Registration cancelled successfully.']);
    }

    public function index(Request $request, Event $event): JsonResponse
    {
        $user = $request->user();
        $canView = $user->is_admin
            || $user->hasClubPermission($event->club_id, 'can_manage_events')
            || $user->hasClubPermission($event->club_id, 'can_track_attendance');

        if (!$canView) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $registrations = EventRegistration::where('event_id', $event->id)
            ->with(['user', 'certificate', 'feedback'])
            ->latest('registered_at')
            ->get();

        return response()->json($registrations);
    }

    public function markAttendance(MarkAttendanceRequest $request, Event $event, EventRegistration $registration): JsonResponse
    {
        if ($registration->event_id !== $event->id) {
            return response()->json(['message' => 'Registration does not belong to this event.'], 404);
        }

        $this->authorize('markAttendance', $registration);

        $attended = $request->boolean('attended');

        $registration->update([
            'attended'    => $attended,
            'attended_at' => $attended ? now() : null,
        ]);

        if ($attended && !$registration->certificate) {
            $certNum = 'CH-' . $event->id . '-' . $registration->id . '-' . strtoupper(Str::random(6));
            $certPath = 'certificates/' . $certNum . '.pdf';

            $certificate = Certificate::create([
                'event_registration_id' => $registration->id,
                'certificate_number'    => $certNum,
                'file_path'             => $certPath,
                'issued_at'             => now(),
            ]);

            Notification::create([
                'user_id'      => $registration->user_id,
                'type'         => 'certificate_issued',
                'title'        => 'Certificate Issued',
                'message'      => "Congratulations! Your certificate for '{$event->title}' is ready for download.",
                'related_type' => Certificate::class,
                'related_id'   => $certificate->id,
            ]);
        }

        return response()->json($registration->load(['user', 'certificate']));
    }
}
