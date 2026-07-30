<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventFeedback;
use App\Models\EventRegistration;
use App\Services\AuditService;
use Illuminate\Http\Request;
use App\Http\Controllers\EventRegistrationController;
//use App\Http\Controllers\EventFeedbackController;


class EventFeedbackController extends Controller
{
    // -------------------------------------------------------------------------
    // POST /events/{event}/feedback
    // Authenticated user. Event must be Completed.
    // User must have attended (attended = true in event_registrations).
    // One submission per user per event — enforced at DB level (unique index)
    // and here with a 422.
    // -------------------------------------------------------------------------
    public function store(Request $request, Event $event)
    {
        $user = $request->user();

        if ($event->status !== 'completed') {
            return response()->json([
                'message' => 'Feedback can only be submitted for completed events.',
            ], 422);
        }

        // Must have attended
        $registration = EventRegistration::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->where('attended', true)
            ->first();

        if (!$registration) {
            return response()->json([
                'message' => 'Only verified attendees can submit feedback.',
            ], 403);
        }

        // Prevent duplicate
        $exists = EventFeedback::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'You have already submitted feedback for this event. Use PUT to update it.',
            ], 422);
        }

        $request->validate([
            'rating'  => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $feedback = EventFeedback::create([
            'event_id' => $event->id,
            'user_id'  => $user->id,
            'rating'   => $request->rating,
            'comment'  => $request->comment,
        ]);

        // store
AuditService::log(
    'event.registered',
    $registration,
    ['event_id' => $event->id, 'event_title' => $event->title]
);
        return response()->json([
            'message'  => 'Feedback submitted successfully.',
            'feedback' => $feedback,
        ], 201);
    }

    // -------------------------------------------------------------------------
    // GET /events/{event}/feedback
    // Exec of the event's club + platform admin only.
    // -------------------------------------------------------------------------
    public function index(Request $request, Event $event)
    {
        $user = $request->user();

        if (!$user->is_admin) {
            $isExec = $this->isExecOfClub($user, $event->club_id);

            if (!$isExec) {
                return response()->json([
                    'message' => 'Only club executives can view feedback.',
                ], 403);
            }
        }

        $feedback = EventFeedback::with('user:id,name,student_id')
            ->where('event_id', $event->id)
            ->get();

        $averageRating = $feedback->avg('rating');

        return response()->json([
            'event'          => $event->title,
            'total_feedback' => $feedback->count(),
            'average_rating' => $averageRating ? round($averageRating, 2) : null,
            'feedback'       => $feedback,
        ]);
    }

    // -------------------------------------------------------------------------
    // PUT /events/{event}/feedback
    // Own feedback only. Event must still be Completed (it always will be
    // since feedback can only exist on completed events, but guard anyway).
    // -------------------------------------------------------------------------
    public function update(Request $request, Event $event)
    {
        $user = $request->user();

        $feedback = EventFeedback::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$feedback) {
            return response()->json([
                'message' => 'No feedback found to update. Submit first.',
            ], 404);
        }

        $request->validate([
            'rating'  => 'sometimes|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $feedback->update($request->only('rating', 'comment'));

        // update
AuditService::log(
    'event.unregistered',
    $event,
    ['event_id' => $event->id, 'event_title' => $event->title]
);

        return response()->json([
            'message'  => 'Feedback updated.',
            'feedback' => $feedback->fresh(),
        ]);
    }

    // -------------------------------------------------------------------------
    // DELETE /events/{event}/feedback
    // Own feedback only.
    // -------------------------------------------------------------------------
    public function destroy(Request $request, Event $event)
    {
        $user = $request->user();

        $feedback = EventFeedback::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$feedback) {
            return response()->json([
                'message' => 'No feedback found to delete.',
            ], 404);
        }

        $feedback->delete();

// destroy
AuditService::log(
    'event.feedback_deleted',
    $event,
    ['event_id' => $event->id, 'event_title' => $event->title]
);

        return response()->json([
            'message' => 'Feedback deleted successfully.',
        ]);
    }

    // -------------------------------------------------------------------------
    // Helper
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