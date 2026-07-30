<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreClubRequest;
use App\Http\Requests\UpdateClubRequest;
use App\Models\AuditLog;
use App\Models\Club;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ClubController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Club::query();

        $user = $request->user();
        if (!$user || !$user->is_admin) {
            $query->where('status', 'approved');
        } elseif ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('category')) {
            $query->where('category', $request->query('category'));
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $clubs = $query->with('creator')->latest()->get();

        return response()->json($clubs);
    }

    public function store(StoreClubRequest $request): JsonResponse
    {
        $data = $request->validated();

        $baseSlug = Str::slug($data['name']);
        $slug = $baseSlug;
        $count = 1;
        while (Club::where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-{$count}";
            $count++;
        }

        $club = Club::create([
            'name'        => $data['name'],
            'slug'        => $slug,
            'description' => $data['description'] ?? null,
            'category'    => $data['category'] ?? null,
            'logo_path'   => $data['logo_path'] ?? null,
            'status'      => 'pending',
            'created_by'  => $request->user()->id,
        ]);

        // Auto-create default position for the club
        $club->positions()->create([
            'title'      => 'Member',
            'is_default' => true,
        ]);

        // Auto-create President/Executive position for creator
        $presPosition = $club->positions()->create([
            'title'                     => 'President',
            'can_manage_members'       => true,
            'can_manage_events'        => true,
            'can_manage_announcements' => true,
            'can_manage_recruitment'   => true,
            'can_track_attendance'     => true,
            'is_default'               => false,
        ]);

        // Creator becomes active member with President position
        $member = $club->members()->create([
            'user_id'   => $request->user()->id,
            'status'    => 'active',
            'joined_at' => now(),
        ]);

        $member->positions()->create([
            'club_position_id' => $presPosition->id,
            'assigned_at'      => now(),
        ]);

        return response()->json($club->load('positions'), 201);
    }

    public function show(Request $request, Club $club): JsonResponse
    {
        $user = $request->user();
        $myMembership = null;

        if ($user) {
            $myMembership = $club->members()
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->with(['positions' => function ($q) {
                    $q->where(function ($q2) {
                        $q2->whereNull('ends_at')->orWhere('ends_at', '>', now());
                    })->with('position');
                }])
                ->first();
        }

        $response = $club->load(['creator', 'positions']);
        $data = $response->toArray();

        if ($myMembership) {
            $positionsList = $myMembership->positions->map(fn ($p) => $p->position)->filter()->values();
            $data['my_membership'] = [
                'status'    => $myMembership->status,
                'joined_at' => $myMembership->joined_at,
                'positions' => $positionsList,
            ];
        } else {
            $data['my_membership'] = null;
        }

        return response()->json($data);
    }

    public function update(UpdateClubRequest $request, Club $club): JsonResponse
    {
        $this->authorize('update', $club);

        $club->update($request->validated());

        return response()->json($club);
    }

    public function destroy(Request $request, Club $club): JsonResponse
    {
        $this->authorize('delete', $club);

        AuditLog::record($request->user(), 'delete_club', $club, ['name' => $club->name]);

        $club->delete();

        return response()->json(['message' => 'Club deleted successfully.']);
    }

    public function approve(Request $request, Club $club): JsonResponse
    {
        $club->update(['status' => 'approved']);

        AuditLog::record($request->user(), 'approve_club', $club);

        Notification::create([
            'user_id'      => $club->created_by,
            'type'         => 'club_approved',
            'title'        => 'Club Approved',
            'message'      => "Your club '{$club->name}' has been approved by an administrator.",
            'related_type' => Club::class,
            'related_id'   => $club->id,
        ]);

        return response()->json(['message' => 'Club approved successfully.', 'club' => $club]);
    }

    public function suspend(Request $request, Club $club): JsonResponse
    {
        $club->update(['status' => 'suspended']);

        AuditLog::record($request->user(), 'suspend_club', $club);

        Notification::create([
            'user_id'      => $club->created_by,
            'type'         => 'club_suspended',
            'title'        => 'Club Suspended',
            'message'      => "Your club '{$club->name}' has been suspended.",
            'related_type' => Club::class,
            'related_id'   => $club->id,
        ]);

        return response()->json(['message' => 'Club suspended successfully.', 'club' => $club]);
    }
}
