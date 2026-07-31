<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEventRequest;
use App\Http\Requests\UpdateEventRequest;
use App\Models\Club;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventController extends Controller
{
    protected array $validTransitions = [
        'draft'     => ['published', 'cancelled'],
        'published' => ['ongoing', 'cancelled'],
        'ongoing'   => ['completed', 'cancelled'],
        'completed' => [],
        'cancelled' => [],
    ];

    protected function getOverlappingEvents(string $startAt, string $endAt, ?int $excludeId = null): array
    {
        $query = Event::where(function ($q) use ($startAt, $endAt) {
            $q->where('start_at', '<', $endAt)
              ->where('end_at', '>', $startAt);
        });

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->get(['id', 'title', 'start_at', 'end_at', 'venue'])->toArray();
    }

    public function index(Request $request, ?Club $club = null): JsonResponse
    {
        $query = Event::query();

        $clubId = $club?->id ?? $request->query('club_id');
        if ($clubId) {
            $query->where('club_id', $clubId);
        }

        $user = $request->user('sanctum') ?? $request->user();

        if (!$user || !$user->is_admin) {
            $userClubIds = $user ? $user->clubMemberships()->where('status', 'active')->pluck('club_id')->toArray() : [];
            $query->where(function ($q) use ($userClubIds) {
                $q->where('is_members_only', false)
                  ->orWhereIn('club_id', $userClubIds);
            });
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('venue', 'like', "%{$search}%");
            });
        }

        $events = $query->with('club')
            ->withCount(['registrations as registered_count' => function ($q) {
                $q->where('status', 'registered');
            }])
            ->latest('start_at')
            ->paginate(15);

        return response()->json($events);
    }

    public function store(StoreEventRequest $request, Club $club): JsonResponse
    {
        $this->authorize('create', [Event::class, $club]);

        $data = $request->validated();
        $data['club_id'] = $club->id;
        $data['created_by'] = $request->user()->id;
        $data['status'] = $data['status'] ?? 'draft';

        $startAt = $data['start_at'];
        $endAt = $data['end_at'] ?? date('Y-m-d H:i:s', strtotime($startAt . ' +2 hours'));
        $data['end_at'] = $endAt;

        $conflicts = $this->getOverlappingEvents($startAt, $endAt);

        $event = Event::create($data);

        $responsePayload = $event->load('club')->toArray();

        if (!empty($conflicts)) {
            $responsePayload['warning'] = 'Event overlaps with existing event(s).';
            $responsePayload['conflicts'] = $conflicts;
        }

        return response()->json($responsePayload, 201);
    }

    public function show(Request $request, Event $event): JsonResponse
    {
        $user = $request->user('sanctum') ?? $request->user();

        if ($event->is_members_only && (!$user || (!$user->is_admin && !$user->isMemberOf($event->club_id)))) {
            return response()->json(['message' => 'This event is restricted to club members.'], 403);
        }

        $event->load(['club', 'creator']);
        $registeredCount = $event->registrations()->where('status', 'registered')->count();

        $spotsRemaining = $event->capacity !== null ? max(0, $event->capacity - $registeredCount) : null;

        $myRegistration = null;
        if ($user) {
            $myRegistration = $event->registrations()
                ->where('user_id', $user->id)
                ->first();
        }

        $data = $event->toArray();
        $data['registered_count'] = $registeredCount;
        $data['spots_remaining'] = $spotsRemaining;
        $data['my_registration'] = $myRegistration;

        return response()->json($data);
    }

    public function update(UpdateEventRequest $request, Event $event): JsonResponse
    {
        $this->authorize('update', $event);

        if (in_array($event->status, ['completed', 'cancelled'])) {
            return response()->json(['message' => 'Cannot edit a completed or cancelled event.'], 422);
        }

        $data = $request->validated();

        if (array_key_exists('status', $data) && $data['status'] !== $event->status) {
            $newStatus = $data['status'];
            $allowed = $this->validTransitions[$event->status] ?? [];
            if (!in_array($newStatus, $allowed)) {
                return response()->json([
                    'message'           => "Invalid status transition from '{$event->status}' to '{$newStatus}'.",
                    'valid_transitions' => $allowed,
                ], 422);
            }
        }

        $startAt = $data['start_at'] ?? $event->start_at?->format('Y-m-d H:i:s');
        $endAt = $data['end_at'] ?? $event->end_at?->format('Y-m-d H:i:s');

        $conflicts = [];
        if ($startAt && $endAt && ($request->has('start_at') || $request->has('end_at'))) {
            $conflicts = $this->getOverlappingEvents($startAt, $endAt, $event->id);
        }

        $event->update($data);

        $responsePayload = $event->load('club')->toArray();
        if (!empty($conflicts)) {
            $responsePayload['warning'] = 'Event overlaps with existing event(s).';
            $responsePayload['conflicts'] = $conflicts;
        }

        return response()->json($responsePayload);
    }

    public function destroy(Request $request, Event $event): JsonResponse
    {
        $this->authorize('delete', $event);

        if ($event->status !== 'draft') {
            return response()->json(['message' => 'Only draft events can be deleted.'], 422);
        }

        $event->delete();

        return response()->json(['message' => 'Event deleted successfully.']);
    }
}
