<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventRegistration;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class EventRegistrationController extends Controller
{
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
}
