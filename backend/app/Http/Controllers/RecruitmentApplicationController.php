<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRecruitmentApplicationRequest;
use App\Models\Club;
use App\Models\Notification;
use App\Models\RecruitmentApplication;
use App\Models\RecruitmentNotice;
use App\Services\ClubMembershipService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecruitmentApplicationController extends Controller
{
    public function store(StoreRecruitmentApplicationRequest $request, RecruitmentNotice $recruitmentNotice): JsonResponse
    {
        $user = $request->user();

        if ($recruitmentNotice->status !== 'open' || now()->lt($recruitmentNotice->opens_at) || now()->gt($recruitmentNotice->closes_at)) {
            return response()->json(['message' => 'Recruitment is currently closed for this notice.'], 422);
        }

        $existing = RecruitmentApplication::where('recruitment_notice_id', $recruitmentNotice->id)
            ->where('user_id', $user->id)
            ->exists();

        if ($existing) {
            return response()->json(['message' => 'You have already submitted an application for this recruitment campaign. Candidates are permitted to apply only once per recruitment campaign.'], 422);
        }

        $isMember = \App\Models\ClubMember::where('club_id', $recruitmentNotice->club_id)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->exists();

        if ($isMember) {
            return response()->json(['message' => 'You are already an active member of this club. Recruitment is reserved for new applicants.'], 422);
        }

        $application = RecruitmentApplication::create([
            'recruitment_notice_id' => $recruitmentNotice->id,
            'user_id'               => $user->id,
            'answers'               => $request->validated()['answers'] ?? null,
            'status'                => 'pending',
        ]);

        NotificationService::notifyUser(
            $user->id,
            'recruitment_application_submitted',
            'Application Submitted',
            "Your recruitment application for '{$recruitmentNotice->title}' has been submitted successfully.",
            Club::class,
            $recruitmentNotice->club_id
        );

        NotificationService::notifyClubExecutives(
            $recruitmentNotice->club_id,
            'recruitment_application_submitted',
            'New Recruitment Application',
            "{$user->name} submitted a recruitment application for '{$recruitmentNotice->title}'.",
            Club::class,
            $recruitmentNotice->club_id,
            $user->id
        );

        \App\Services\AuditService::log('recruitment_application_submitted', $application, ['title' => $recruitmentNotice->title], $user->id);

        return response()->json($application, 201);
    }

    public function index(Request $request, RecruitmentNotice $recruitmentNotice): JsonResponse
    {
        $user = $request->user();
        if (!$user->is_admin && !$user->hasClubPermission($recruitmentNotice->club_id, 'can_manage_recruitment')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $applications = RecruitmentApplication::where('recruitment_notice_id', $recruitmentNotice->id)
            ->with('user')
            ->latest()
            ->get();

        return response()->json($applications);
    }

    public function review(Request $request, RecruitmentApplication $application, ClubMembershipService $membershipService): JsonResponse
    {
        $this->authorize('review', $application);

        $request->validate([
            'status' => 'required|in:interview,accepted,rejected',
        ]);

        $status = $request->input('status');
        $user = $request->user();

        $application->update([
            'status'      => $status,
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
        ]);

        if ($status === 'accepted') {
            $membershipService->admitUser($application->recruitmentNotice->club, $application->user);
        }

        $message = $status === 'interview'
            ? "Your recruitment application for '{$application->recruitmentNotice->club->name}' has advanced to the Interview phase."
            : "Your recruitment application for '{$application->recruitmentNotice->club->name}' has been {$status}.";

        Notification::create([
            'user_id'      => $application->user_id,
            'type'         => 'recruitment_application_' . $status,
            'title'        => 'Recruitment Application ' . ucfirst($status),
            'message'      => $message,
            'related_type' => Club::class,
            'related_id'   => $application->recruitmentNotice->club_id,
        ]);

        \App\Services\AuditService::log('recruitment_application_' . $status, $application, ['status' => $status], $user->id);

        return response()->json($application->load(['user', 'reviewer']));
    }
}
