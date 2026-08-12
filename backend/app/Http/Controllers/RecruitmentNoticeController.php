<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRecruitmentNoticeRequest;
use App\Http\Requests\UpdateRecruitmentNoticeRequest;
use App\Models\Club;
use App\Models\RecruitmentNotice;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecruitmentNoticeController extends Controller
{
    public function index(Request $request, ?Club $club = null): JsonResponse
    {
        $query = RecruitmentNotice::query();

        if ($club) {
            $query->where('club_id', $club->id);
        }

        $user = $request->user();
        if ($club) {
            $isExec = $user && ($user->is_admin || $user->hasClubPermission($club, 'can_manage_recruitment'));
            if (!$isExec) {
                $query->where('status', 'open');
            }
        } else {
            if (!$user || !$user->is_admin) {
                $query->where('status', 'open');
            }
        }

        $notices = $query->with('club:id,name,logo_path,category,department,status')->latest()->get();

        if ($user) {
            $userMemberClubIds = \App\Models\ClubMember::where('user_id', $user->id)
                ->where('status', 'active')
                ->pluck('club_id')
                ->toArray();

            $userApps = \App\Models\RecruitmentApplication::select(['id', 'recruitment_notice_id', 'user_id', 'status', 'created_at'])
                ->where('user_id', $user->id)
                ->get()
                ->keyBy('recruitment_notice_id');

            $notices->each(function ($notice) use ($userMemberClubIds, $userApps) {
                $notice->setAttribute('is_member', in_array($notice->club_id, $userMemberClubIds));
                $notice->setAttribute('my_application', $userApps->get($notice->id));
            });
        }

        return response()->json($notices);
    }

    public function store(StoreRecruitmentNoticeRequest $request, Club $club): JsonResponse
    {
        $this->authorize('create', [RecruitmentNotice::class, $club]);

        $data = $request->validated();
        $session = $data['session'] ?? null;

        // Check 1: Enforce one recruitment per year/session per club
        if ($session) {
            $existingSameSession = RecruitmentNotice::where('club_id', $club->id)
                ->where('session', (string)$session)
                ->exists();

            if ($existingSameSession) {
                return response()->json([
                    'message' => "A recruitment campaign for session '{$session}' already exists for '{$club->name}'. Only one recruitment campaign per year/session is allowed."
                ], 422);
            }
        }

        // Check 2: Active recruitment check
        $hasActiveRecruitment = RecruitmentNotice::where('club_id', $club->id)
            ->where('status', 'open')
            ->where('closes_at', '>', now())
            ->exists();

        if ($hasActiveRecruitment) {
            return response()->json([
                'message' => "This club ('{$club->name}') already has an active recruitment campaign in progress. A club can only host one recruitment campaign at a time."
            ], 422);
        }

        $data['club_id'] = $club->id;
        $data['created_by'] = $request->user()->id;
        $data['status'] = $data['status'] ?? 'open';
        if (empty($data['title'])) {
            $data['title'] = "{$club->name} Recruitment";
        }

        // Resolve pipeline stages
        $template = $data['pipeline_template'] ?? 'multi_stage';
        if ($template === 'custom' && !empty($data['pipeline_stages'])) {
            $data['pipeline_stages'] = $data['pipeline_stages'];
        } else {
            $templates = RecruitmentNotice::pipelineTemplates();
            $data['pipeline_template'] = isset($templates[$template]) ? $template : 'multi_stage';
            $data['pipeline_stages']   = $templates[$data['pipeline_template']];
        }

        $notice = RecruitmentNotice::create($data);

        // Notify targeted student session users if target_sessions specified, else notify all club members
        if (!empty($notice->target_sessions) && is_array($notice->target_sessions)) {
            NotificationService::notifyUsersBySessions(
                $notice->target_sessions,
                'recruitment_opened',
                'Recruitment Campaign Opened',
                "Recruitment campaign '{$notice->title}' is now open for '{$club->name}' for your session!",
                RecruitmentNotice::class,
                $notice->id,
                $request->user()->id
            );
        } else {
            NotificationService::notifyClubMembers(
                $club->id,
                'recruitment_opened',
                'Recruitment Campaign Opened',
                "A new recruitment campaign '{$notice->title}' has opened in '{$club->name}'!",
                RecruitmentNotice::class,
                $notice->id,
                $request->user()->id
            );
        }

        \App\Services\AuditService::log('recruitment.notice.created', $notice, ['title' => $notice->title], $request->user()->id);

        return response()->json($notice->load('club'), 201);
    }

    public function show(Request $request, RecruitmentNotice $recruitmentNotice): JsonResponse
    {
        $user = $request->user();
        $recruitmentNotice->load(['club', 'creator']);

        $myApplication = null;
        $isMember = false;
        if ($user) {
            $myApplication = $recruitmentNotice->applications()
                ->where('user_id', $user->id)
                ->first();
            $isMember = \App\Models\ClubMember::where('club_id', $recruitmentNotice->club_id)
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->exists();
        }

        $data = $recruitmentNotice->toArray();
        $data['my_application'] = $myApplication;
        $data['is_member'] = $isMember;

        return response()->json($data);
    }

    public function update(UpdateRecruitmentNoticeRequest $request, RecruitmentNotice $recruitmentNotice): JsonResponse
    {
        $this->authorize('update', $recruitmentNotice);

        $data = $request->validated();

        // Lock pipeline modifications if applications already exist
        if (isset($data['pipeline_template']) || isset($data['pipeline_stages'])) {
            if ($recruitmentNotice->applications()->exists()) {
                return response()->json([
                    'message' => 'Cannot modify the recruitment process pipeline after applications have been submitted.'
                ], 422);
            }

            $template = $data['pipeline_template'] ?? $recruitmentNotice->pipeline_template;
            if ($template === 'custom' && !empty($data['pipeline_stages'])) {
                $data['pipeline_stages'] = $data['pipeline_stages'];
            } else {
                $templates = RecruitmentNotice::pipelineTemplates();
                $data['pipeline_template'] = isset($templates[$template]) ? $template : 'multi_stage';
                $data['pipeline_stages']   = $templates[$data['pipeline_template']];
            }
        }

        $recruitmentNotice->update($data);

        if ($request->user()->is_admin) {
            NotificationService::notifyClubExecutives(
                $recruitmentNotice->club_id,
                'recruitment_updated',
                'Recruitment Campaign Updated',
                "An admin updated the recruitment campaign '{$recruitmentNotice->title}'.",
                RecruitmentNotice::class,
                $recruitmentNotice->id,
                $request->user()->id
            );
        }

        \App\Services\AuditService::log('recruitment.notice.updated', $recruitmentNotice, ['title' => $recruitmentNotice->title], $request->user()->id);

        return response()->json($recruitmentNotice->load('club'));
    }

    public function destroy(Request $request, RecruitmentNotice $recruitmentNotice): JsonResponse
    {
        $this->authorize('delete', $recruitmentNotice);

        \App\Services\AuditService::log('recruitment.notice.deleted', $recruitmentNotice, ['title' => $recruitmentNotice->title], $request->user()->id);

        $recruitmentNotice->delete();

        return response()->json(['message' => 'Recruitment notice deleted successfully.']);
    }
}
