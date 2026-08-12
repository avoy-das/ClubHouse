<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEventFeedbackRequest;
use App\Models\Event;
use App\Models\EventFeedback;
use App\Models\EventRegistration;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class EventFeedbackController extends Controller
{
    /**
     * GET /api/events/{event}/feedback/summary
     * Aggregate statistics and current user's submission state.
     */
    public function summary(Request $request, Event $event): JsonResponse
    {
        $user = Auth::user();
        EventController::syncEventStatuses();

        $feedbackQuery = EventFeedback::where('event_id', $event->id);
        $totalReviews  = (clone $feedbackQuery)->count();
        $avgRating     = $totalReviews > 0 ? round((float)(clone $feedbackQuery)->avg('rating'), 1) : 0;

        $distribution = [
            5 => (clone $feedbackQuery)->where('rating', 5)->count(),
            4 => (clone $feedbackQuery)->where('rating', 4)->count(),
            3 => (clone $feedbackQuery)->where('rating', 3)->count(),
            2 => (clone $feedbackQuery)->where('rating', 2)->count(),
            1 => (clone $feedbackQuery)->where('rating', 1)->count(),
        ];

        $myFeedback = EventFeedback::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->first();

        $windowOpen = $this->isFeedbackWindowOpen($event);
        $isCreator  = ($event->created_by === $user->id);
        $eligibilityError = $this->checkFeedbackEligibility($user, $event);
        $canSubmit = ($eligibilityError === null) && !$myFeedback;

        return response()->json([
            'average_rating'       => $avgRating,
            'total_reviews'        => $totalReviews,
            'rating_distribution'  => $distribution,
            'my_feedback'          => $myFeedback,
            'feedback_window_open' => $windowOpen,
            'can_submit'           => $canSubmit,
            'is_creator'           => $isCreator,
            'feedback_policy'      => $event->feedback_policy ?? 'attended_only',
        ]);
    }

    /**
     * GET /api/events/{event}/feedback
     * List all feedback entries for club executives or platform admins.
     */
    public function index(Request $request, Event $event): JsonResponse
    {
        $user = Auth::user();

        if (!$user->is_admin && !$this->isClubExec($user->id, $event->club_id)) {
            return response()->json(['message' => 'Only club executives and admins can view feedback details.'], 403);
        }

        $feedbacks = EventFeedback::where('event_id', $event->id)
            ->with(['user:id,name,email'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($feedbacks);
    }

    /**
     * POST /api/events/{event}/feedback
     * Submit feedback for an event.
     */
    public function store(StoreEventFeedbackRequest $request, Event $event): JsonResponse
    {
        $user = $request->user();
        EventController::syncEventStatuses();

        $eligibilityError = $this->checkFeedbackEligibility($user, $event);
        if ($eligibilityError) {
            return response()->json(['message' => $eligibilityError], 422);
        }

        $existing = EventFeedback::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->exists();

        if ($existing) {
            return response()->json(['message' => 'Feedback already submitted for this event.'], 422);
        }

        $validated = $request->validated();
        $comment = $validated['comment'] ?? $validated['comments'] ?? null;

        $feedback = EventFeedback::create([
            'event_id' => $event->id,
            'user_id'  => $user->id,
            'rating'   => $validated['rating'],
            'comment'  => $comment,
        ]);

        AuditService::log('event.feedback_submitted', $feedback, [
            'event_id' => $event->id,
            'rating'   => $feedback->rating,
        ]);

        NotificationService::notifyUser(
            $event->created_by,
            'event_feedback_submitted',
            'New Event Feedback',
            "New feedback (Rating: {$feedback->rating}/5) submitted for event '{$event->title}'.",
            Event::class,
            $event->id
        );

        NotificationService::notifyClubExecutives(
            $event->club_id,
            'event_feedback_submitted',
            'New Event Feedback',
            "New feedback (Rating: {$feedback->rating}/5) submitted for event '{$event->title}'.",
            Event::class,
            $event->id,
            $event->created_by
        );

        return response()->json($feedback, 201);
    }

    /**
     * PUT /api/events/{event}/feedback
     * Update user's submitted feedback within window.
     */
    public function update(StoreEventFeedbackRequest $request, Event $event): JsonResponse
    {
        $user = $request->user();

        if (!$this->isFeedbackWindowOpen($event)) {
            return response()->json(['message' => 'The feedback submission window for this event has closed.'], 422);
        }

        $feedback = EventFeedback::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$feedback) {
            return response()->json(['message' => 'No feedback submission found to update.'], 404);
        }

        $validated = $request->validated();
        $comment = $validated['comment'] ?? $validated['comments'] ?? null;

        $feedback->update([
            'rating'  => $validated['rating'],
            'comment' => $comment,
        ]);

        return response()->json($feedback);
    }

    /**
     * DELETE /api/events/{event}/feedback
     * Delete user's submitted feedback within window.
     */
    public function destroy(Request $request, Event $event): JsonResponse
    {
        $user = $request->user();

        if (!$this->isFeedbackWindowOpen($event)) {
            return response()->json(['message' => 'The feedback submission window for this event has closed.'], 422);
        }

        $feedback = EventFeedback::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$feedback) {
            return response()->json(['message' => 'No feedback submission found to delete.'], 404);
        }

        $feedback->delete();

        return response()->json(['message' => 'Feedback deleted.']);
    }

    private function isFeedbackWindowOpen(Event $event): bool
    {
        if (!in_array($event->status, ['completed', 'cancelled'])) {
            return false;
        }

        $endsAt = $event->ends_at ?? $event->updated_at ?? now();
        $cutoff = Carbon::parse($endsAt)->addDays(14);

        return now()->lte($cutoff);
    }

    private function isClubExec(int $userId, int $clubId): bool
    {
        $user = \App\Models\User::find($userId);
        if (!$user) return false;
        if ($user->is_admin) return true;

        return DB::table('club_members')
            ->where('user_id', $userId)
            ->where('club_id', $clubId)
            ->where(function ($q) {
                $q->whereNull('status')->orWhere('status', 'active');
            })
            ->whereIn('role', Event::execRoles())
            ->exists();
    }

    /**
     * Check if a user is eligible to submit feedback under the event's feedback policy.
     * Returns null if eligible, or an error message string if ineligible.
     */
    private function checkFeedbackEligibility(\App\Models\User $user, Event $event): ?string
    {
        if ($event->created_by === $user->id) {
            return 'Event creators cannot submit feedback for their own events.';
        }

        if (!in_array($event->status, ['completed', 'cancelled'])) {
            return 'Feedback can only be submitted for completed events.';
        }

        if (!$this->isFeedbackWindowOpen($event)) {
            return 'The feedback submission window for this event has closed.';
        }

        $policy = $event->feedback_policy ?? 'attended_only';

        if ($policy === 'open_to_all') {
            if ($event->visibility === 'members_only' && !$user->is_admin) {
                $isMember = DB::table('club_members')
                    ->where('user_id', $user->id)
                    ->where('club_id', $event->club_id)
                    ->where(function ($q) {
                        $q->whereNull('status')->orWhere('status', 'active');
                    })
                    ->exists();
                if (!$isMember) {
                    return 'Only club members can submit feedback for this event.';
                }
            }
            return null;
        }

        if ($policy === 'registered_only') {
            $registered = EventRegistration::where('event_id', $event->id)
                ->where('user_id', $user->id)
                ->exists();
            if (!$registered) {
                return 'Only registered attendees can submit feedback for this event.';
            }
            return null;
        }

        $attended = EventRegistration::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->where('attended', true)
            ->exists();

        if (!$attended) {
            return 'Only users who attended this event can submit feedback.';
        }

        return null;
    }
}
