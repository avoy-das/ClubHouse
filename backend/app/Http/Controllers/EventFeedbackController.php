<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEventFeedbackRequest;
use App\Models\Event;
use App\Models\EventFeedback;
use App\Models\EventRegistration;
use Illuminate\Http\JsonResponse;

class EventFeedbackController extends Controller
{
    public function store(StoreEventFeedbackRequest $request, Event $event): JsonResponse
    {
        $user = $request->user();

        $registration = EventRegistration::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->where('attended', true)
            ->first();

        if (!$registration) {
            return response()->json(['message' => 'Only users who attended this event can submit feedback.'], 422);
        }

        $existing = EventFeedback::where('event_registration_id', $registration->id)->exists();

        if ($existing) {
            return response()->json(['message' => 'Feedback already submitted for this event.'], 422);
        }

        $feedback = EventFeedback::create([
            'event_registration_id' => $registration->id,
            'rating'                => $request->validated()['rating'],
            'comments'              => $request->validated()['comments'] ?? null,
            'submitted_at'          => now(),
        ]);

        return response()->json($feedback, 201);
    }
}
