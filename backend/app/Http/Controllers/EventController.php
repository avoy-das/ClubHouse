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
    public function index(Request $request, ?Club $club = null): JsonResponse
    {
        $query = Event::query();

        if ($club) {
            $query->where('club_id', $club->id);
        }

        $user = $request->user();
        if ($club) {
            $isExec = $user && ($user->is_admin || $user->hasClubPermission($club, 'can_manage_events'));
            if (!$isExec) {
                $query->where('status', 'published');
            }
        } else {
            if (!$user || !$user->is_admin) {
                $query->where('status', 'published');
            }
        }

        if ($request->filled('status') && ($user && $user->is_admin)) {
            $query->where('status', $request->query('status'));
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
            ->get();

        return response()->json($events);
    }

    public function store(StoreEventRequest $request, Club $club): JsonResponse
    {
        $this->authorize('create', [Event::class, $club]);

        $data = $request->validated();
        $data['club_id'] = $club->id;
        $data['created_by'] = $request->user()->id;
        $data['status'] = $data['status'] ?? 'draft';

        $event = Event::create($data);

        return response()->json($event->load('club'), 201);
    }

    public function show(Request $request, Event $event): JsonResponse
    {
        $user = $request->user();

        $event->load(['club', 'creator']);
        $event->registered_count = $event->registrations()->where('status', 'registered')->count();

        $myRegistration = null;
        if ($user) {
            $myRegistration = $event->registrations()
                ->where('user_id', $user->id)
                ->first();
        }

        $data = $event->toArray();
        $data['my_registration'] = $myRegistration;

        return response()->json($data);
    }

    public function update(UpdateEventRequest $request, Event $event): JsonResponse
    {
        $this->authorize('update', $event);

        $event->update($request->validated());

        return response()->json($event->load('club'));
    }

    public function destroy(Request $request, Event $event): JsonResponse
    {
        $this->authorize('delete', $event);

        $event->delete();

        return response()->json(['message' => 'Event deleted successfully.']);
    }
}
