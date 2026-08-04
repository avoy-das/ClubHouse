<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateClubRequest;
use App\Models\Club;
use App\Models\ClubEditRequest;
use App\Models\ClubMember;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClubEditRequestController extends Controller
{
    /**
     * Executive or Admin submits a club edit request.
     */
    public function store(UpdateClubRequest $request, Club $club): JsonResponse
    {
        $user = $request->user();

        // Check if user is executive of this club or admin
        if (!$user->is_admin && !$this->isExec($user->id, $club->id)) {
            return response()->json(['message' => 'Only club executives or administrators can submit edit requests.'], 403);
        }

        $data = $request->validated();

        $logoPath = null;
        if ($request->hasFile('logo')) {
            $logoPath = $request->file('logo')->store('logos', 'public');
        }

        $editRequest = ClubEditRequest::create([
            'club_id'       => $club->id,
            'requested_by'  => $user->id,
            'name'          => $data['name'] ?? $club->name,
            'category'      => $data['category'] ?? $club->category,
            'description'   => $data['description'] ?? $club->description,
            'department'    => array_key_exists('department', $data) ? $data['department'] : $club->department,
            'contact_email' => $data['contact_email'] ?? $club->contact_email,
            'contact_phone' => array_key_exists('contact_phone', $data) ? $data['contact_phone'] : $club->contact_phone,
            'logo_path'     => $logoPath ?? $club->logo_path,
            'reason'        => $data['reason'] ?? 'Executive submitted club details update.',
            'status'        => 'pending',
        ]);

        AuditService::log('club.edit_requested', $club, ['request_id' => $editRequest->id]);

        NotificationService::notifyAdmins(
            'club_edit_request',
            'New Club Edit Request',
            "An edit request for '{$club->name}' was submitted by {$user->name}.",
            Club::class,
            $club->id,
            $user->id
        );

        return response()->json([
            'message'      => 'Club edit request submitted successfully. An administrator will review and approve your changes.',
            'edit_request' => $editRequest->load('requestedBy:id,name'),
        ], 201);
    }

    /**
     * Get pending edit request for a specific club.
     */
    public function pendingForClub(Club $club): JsonResponse
    {
        $pending = ClubEditRequest::where('club_id', $club->id)
            ->where('status', 'pending')
            ->with('requestedBy:id,name')
            ->latest()
            ->first();

        return response()->json(['pending_request' => $pending]);
    }

    /**
     * Admin view list of all pending club edit requests across platform.
     */
    public function indexAdmin(): JsonResponse
    {
        $requests = ClubEditRequest::with(['club:id,name,category,logo_path,description,contact_email,contact_phone,department', 'requestedBy:id,name,email'])
            ->where('status', 'pending')
            ->latest()
            ->get();

        return response()->json($requests);
    }

    /**
     * Admin approves a club edit request.
     */
    public function approve(Request $request, ClubEditRequest $clubEditRequest): JsonResponse
    {
        if ($clubEditRequest->status !== 'pending') {
            return response()->json(['message' => 'This club edit request has already been processed.'], 422);
        }

        $club = $clubEditRequest->club;

        $updateData = [];
        if ($clubEditRequest->name)          $updateData['name']          = $clubEditRequest->name;
        if ($clubEditRequest->category)      $updateData['category']      = $clubEditRequest->category;
        if ($clubEditRequest->description)   $updateData['description']   = $clubEditRequest->description;
        if ($clubEditRequest->department !== null) $updateData['department'] = $clubEditRequest->department;
        if ($clubEditRequest->contact_email) $updateData['contact_email'] = $clubEditRequest->contact_email;
        if ($clubEditRequest->contact_phone !== null) $updateData['contact_phone'] = $clubEditRequest->contact_phone;
        if ($clubEditRequest->logo_path)     $updateData['logo_path']     = $clubEditRequest->logo_path;

        $club->update($updateData);

        $clubEditRequest->update([
            'status'      => 'approved',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        AuditService::log('club.edit_approved', $club, ['request_id' => $clubEditRequest->id]);

        // Notify executive who requested the edit
        NotificationService::notifyUser(
            $clubEditRequest->requested_by,
            'club_edit_approved',
            'Club Edit Request Approved',
            "Your edit request for '{$club->name}' has been approved by an administrator!",
            Club::class,
            $club->id
        );

        // Notify ALL active members of the club
        NotificationService::notifyClubMembers(
            $club->id,
            'club_updated',
            'Club Details Updated',
            "The details for club '{$club->name}' have been updated following administrator approval.",
            Club::class,
            $club->id,
            $request->user()->id
        );

        return response()->json([
            'message'      => 'Club edit request approved and club updated successfully.',
            'club'         => $club->fresh(),
            'edit_request' => $clubEditRequest,
        ]);
    }

    /**
     * Admin rejects a club edit request.
     */
    public function reject(Request $request, ClubEditRequest $clubEditRequest): JsonResponse
    {
        $request->validate([
            'rejection_reason' => 'required|string',
        ]);

        if ($clubEditRequest->status !== 'pending') {
            return response()->json(['message' => 'This club edit request has already been processed.'], 422);
        }

        $clubEditRequest->update([
            'status'           => 'rejected',
            'rejection_reason' => $request->rejection_reason,
            'reviewed_by'      => $request->user()->id,
            'reviewed_at'      => now(),
        ]);

        $club = $clubEditRequest->club;

        AuditService::log('club.edit_rejected', $club, [
            'request_id'       => $clubEditRequest->id,
            'rejection_reason' => $request->rejection_reason,
        ]);

        NotificationService::notifyUser(
            $clubEditRequest->requested_by,
            'club_edit_rejected',
            'Club Edit Request Rejected',
            "Your edit request for '{$club->name}' was rejected. Reason: {$request->rejection_reason}",
            Club::class,
            $club->id
        );

        return response()->json([
            'message'      => 'Club edit request rejected.',
            'edit_request' => $clubEditRequest,
        ]);
    }

    private function isExec(int $userId, int $clubId): bool
    {
        return ClubMember::where('user_id', $userId)
            ->where('club_id', $clubId)
            ->where(function ($q) {
                $q->whereNull('status')->orWhere('status', 'active');
            })
            ->whereIn('role', ['president', 'vice_president', 'secretary', 'treasurer', 'executive'])
            ->exists();
    }
}
