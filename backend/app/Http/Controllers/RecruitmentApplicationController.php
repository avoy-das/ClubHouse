<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRecruitmentApplicationRequest;
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

        // Validate student session eligibility against campaign target_sessions
        if (!empty($recruitmentNotice->target_sessions) && is_array($recruitmentNotice->target_sessions)) {
            $userSession = $user->session;
            if ($userSession === null || !in_array((int)$userSession, array_map('intval', $recruitmentNotice->target_sessions), true)) {
                return response()->json([
                    'message' => 'Your academic session is not eligible to apply for this recruitment campaign.'
                ], 422);
            }
        }

        $answers = $request->input('answers', []);
        if (is_string($answers)) {
            $answers = json_decode($answers, true) ?? [];
        }

        if (!is_array($answers)) {
            $answers = [];
        }

        $allowedExtensions = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp'];

        // Validate uploaded files
        $request->validate([
            'answers_files.*' => 'file|max:5120|mimes:pdf,doc,docx,jpg,jpeg,png,webp',
        ]);

        // Process any uploaded custom files
        if ($request->hasFile('answers_files')) {
            $uploadedFiles = $request->file('answers_files');
            if (is_array($uploadedFiles)) {
                foreach ($uploadedFiles as $key => $file) {
                    if ($file && $file->isValid()) {
                        $ext = strtolower($file->getClientOriginalExtension());
                        if (!in_array($ext, $allowedExtensions, true)) {
                            return response()->json(['message' => 'Invalid file format uploaded.'], 422);
                        }
                        $path = $file->store('recruitment_applications', 'public');
                        $answers['custom_files'][$key] = [
                            'name' => $file->getClientOriginalName(),
                            'path' => $path,
                            'url'  => asset('storage/' . $path),
                        ];
                    }
                }
            }
        }

        foreach ($request->allFiles() as $key => $file) {
            if ($key !== 'answers_files' && !is_array($file) && $file->isValid()) {
                $ext = strtolower($file->getClientOriginalExtension());
                if (!in_array($ext, $allowedExtensions, true) || $file->getSize() > 5242880) {
                    return response()->json(['message' => 'Invalid file format or file size exceeded (max 5MB).'], 422);
                }
                $path = $file->store('recruitment_applications', 'public');
                $answers['custom_files'][$key] = [
                    'name' => $file->getClientOriginalName(),
                    'path' => $path,
                    'url'  => asset('storage/' . $path),
                ];
            }
        }

        $application = RecruitmentApplication::create([
            'recruitment_notice_id' => $recruitmentNotice->id,
            'user_id'               => $user->id,
            'answers'               => $answers,
            'status'                => $recruitmentNotice->getInitialStage(),
        ]);

        NotificationService::notifyUser(
            $user->id,
            'recruitment_application_submitted',
            'Application Submitted',
            "Your recruitment application for '{$recruitmentNotice->title}' has been submitted successfully.",
            RecruitmentNotice::class,
            $recruitmentNotice->id
        );

        NotificationService::notifyClubExecutives(
            $recruitmentNotice->club_id,
            'recruitment_application_submitted',
            'New Recruitment Application',
            "{$user->name} submitted a recruitment application for '{$recruitmentNotice->title}'.",
            RecruitmentNotice::class,
            $recruitmentNotice->id,
            $user->id
        );

        \App\Services\AuditService::log('recruitment.application.submitted', $application, ['title' => $recruitmentNotice->title], $user->id);

        return response()->json($application, 201);
    }

    public function index(Request $request, RecruitmentNotice $recruitmentNotice): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasClubPermission($recruitmentNotice->club_id, 'can_manage_recruitment')) {
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

        $notice = $application->recruitmentNotice;
        $validStatuses = $notice->getAllValidStatuses();

        $request->validate([
            'status' => 'required|string|in:' . implode(',', $validStatuses),
        ]);

        $status = $request->input('status');
        $user = $request->user();

        $application->update([
            'status'      => $status,
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
        ]);

        if ($status === 'accepted') {
            $membershipService->admitUser($notice->club, $application->user);
        }

        $stageLabel = $notice->getStageLabelFor($status);
        $message = in_array($status, ['accepted', 'rejected'], true)
            ? "Your recruitment application for '{$notice->club->name}' has been {$status}."
            : "Your recruitment application for '{$notice->club->name}' has advanced to: {$stageLabel}.";

        Notification::create([
            'user_id'      => $application->user_id,
            'type'         => 'recruitment_application_' . $status,
            'title'        => 'Recruitment Application Update',
            'message'      => $message,
            'related_type' => RecruitmentNotice::class,
            'related_id'   => $application->recruitment_notice_id,
        ]);

        \App\Services\AuditService::log('recruitment.application.' . $status, $application, ['status' => $status], $user->id);

        return response()->json($application->load(['user', 'reviewer']));
    }
}
