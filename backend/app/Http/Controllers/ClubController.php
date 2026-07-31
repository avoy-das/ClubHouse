<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateClubRequest;
use App\Http\Requests\UpdateClubRequest;
use App\Models\Club;
use App\Models\ClubMember;
use App\Services\AuditService;
use Illuminate\Http\Request;

class ClubController extends Controller
{
    // Any authenticated user can submit a club creation request
    public function store(CreateClubRequest $request)
    {
        $logoPath = null;

        if ($request->hasFile('logo')) {
            $logoPath = $request->file('logo')->store('logos', 'public');
        }

        $club = Club::create([
            'name'          => $request->name,
            'category'      => $request->category,
            'description'   => $request->description,
            'department'    => $request->department,
            'contact_email' => $request->contact_email,
            'contact_phone' => $request->contact_phone,
            'logo_path'     => $logoPath,
            'reason'        => $request->reason,
            'status'        => 'pending',
            'created_by'    => $request->user()->id,
        ]);

        AuditService::log('club.created', $club);

        return response()->json([
            'message' => 'Club creation request submitted successfully.',
            'club'    => $club,
        ], 201);
    }

    // Any authenticated user can view approved clubs
    public function index()
    {
        $clubs = Club::where('status', 'approved')
            ->with('creator:id,name')
            ->latest()
            ->get();

        return response()->json($clubs);
    }

    // Any authenticated user can view a single approved club
    public function show(Club $club)
    {
        if ($club->status !== 'approved') {
            return response()->json(['message' => 'Club not found.'], 404);
        }

        $club->load('creator:id,name', 'members.user:id,name');

        return response()->json($club);
    }

    // Admin only — view all clubs regardless of status
    public function adminIndex(Request $request)
    {
        $clubs = Club::with('creator:id,name')
            ->latest()
            ->get();

        return response()->json($clubs);
    }

    // Admin only — approve a club
    public function approve(Request $request, Club $club)
    {
        if ($club->status !== 'pending') {
            return response()->json(['message' => 'Only pending clubs can be approved.'], 422);
        }

        $club->update([
            'status'      => 'approved',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        // Founder becomes president automatically
        ClubMember::create([
            'club_id'   => $club->id,
            'user_id'   => $club->created_by,
            'role'      => 'president',
            'joined_at' => now(),
        ]);

        AuditService::log('club.approved', $club, [
            'previous_status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Club approved successfully.',
            'club'    => $club,
        ]);
    }

    // Admin only — reject a club
    public function reject(Request $request, Club $club)
    {
        $request->validate([
            'rejection_reason' => 'required|string',
        ]);

        if ($club->status !== 'pending') {
            return response()->json(['message' => 'Only pending clubs can be rejected.'], 422);
        }

        $club->update([
            'status'           => 'rejected',
            'rejection_reason' => $request->rejection_reason,
        ]);

        AuditService::log('club.rejected', $club, [
            'previous_status'  => 'pending',
            'rejection_reason' => $request->rejection_reason,
        ]);

        return response()->json([
            'message' => 'Club rejected.',
            'club'    => $club,
        ]);
    }

    // Admin only — update club details
    public function update(UpdateClubRequest $request, Club $club)
    {
        $data = $request->validated();

        if ($request->hasFile('logo')) {
            $data['logo_path'] = $request->file('logo')->store('logos', 'public');
        }

        unset($data['logo']);

        $club->update($data);

        AuditService::log('club.updated', $club);

        return response()->json([
            'message' => 'Club updated successfully.',
            'club'    => $club,
        ]);
    }

    // Admin only — suspend a club
    public function suspend(Club $club)
    {
        if ($club->status !== 'approved') {
            return response()->json(['message' => 'Only approved clubs can be suspended.'], 422);
        }

        $club->update(['status' => 'suspended']);

        AuditService::log('club.suspended', $club, [
            'previous_status' => 'approved',
        ]);

        return response()->json(['message' => 'Club suspended.']);
    }

    // Contextual search and listing for club members
    public function members(Request $request, Club $club)
    {
        $user = $request->user();
        $q = trim($request->input('q', ''));

        $membersQuery = ClubMember::with(['user:id,name,student_id,email,department', 'club:id,name,slug']);

        if ($q !== '') {
            $escaped = '%' . addcslashes($q, '%_\\') . '%';

            $membersQuery->whereHas('user', function ($query) use ($escaped) {
                $query->where('name', 'LIKE', $escaped)
                      ->orWhere('student_id', 'LIKE', $escaped);
            });

            // Club Exec/Student searches only members of their own club
            // Admin searches all members platform-wide
            if (!$user || !$user->is_admin) {
                $membersQuery->where('club_id', $club->id);
            }
        } else {
            $membersQuery->where('club_id', $club->id);
        }

        $members = $membersQuery->get();

        return response()->json($members);
    }
}
