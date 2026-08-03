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

        $notices = $query->with('club')->latest()->get();

        if ($user) {
            $userMemberClubIds = \App\Models\ClubMember::where('user_id', $user->id)
                ->where('status', 'active')
                ->pluck('club_id')
                ->toArray();

            $userApps = \App\Models\RecruitmentApplication::where('user_id', $user->id)
                ->get()
                ->keyBy('recruitment_notice_id');

            $notices->transform(function ($notice) use ($userMemberClubIds, $userApps) {
                $noticeArray = $notice->toArray();
                $noticeArray['is_member'] = in_array($notice->club_id, $userMemberClubIds);
                $noticeArray['my_application'] = $userApps->get($notice->id);
                return $noticeArray;
            });
        }

        return response()->json($notices);
    }

    public function store(StoreRecruitmentNoticeRequest $request, Club $club): JsonResponse
    {
        $this->authorize('create', [RecruitmentNotice::class, $club]);

        $hasActiveRecruitment = RecruitmentNotice::where('club_id', $club->id)
            ->where('status', 'open')
            ->where('closes_at', '>', now())
            ->exists();

        if ($hasActiveRecruitment) {
            return response()->json([
                'message' => "This club ('{$club->name}') already has an active recruitment campaign in progress. A club can only host one recruitment campaign at a time."
            ], 422);
        }

        $data = $request->validated();
        $data['club_id'] = $club->id;
        $data['created_by'] = $request->user()->id;
        $data['status'] = $data['status'] ?? 'open';
        if (empty($data['title'])) {
            $data['title'] = "{$club->name} Recruitment";
        }

        $notice = RecruitmentNotice::create($data);

        NotificationService::notifyClubMembers(
            $club->id,
            'recruitment_opened',
            'Recruitment Campaign Opened',
            "A new recruitment campaign '{$notice->title}' has opened in '{$club->name}'!",
            Club::class,
            $club->id,
            $request->user()->id
        );

        \App\Services\AuditService::log('recruitment_notice_created', $notice, ['title' => $notice->title], $request->user()->id);

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

        $recruitmentNotice->update($request->validated());

        if ($request->user()->is_admin) {
            NotificationService::notifyClubExecutives(
                $recruitmentNotice->club_id,
                'recruitment_updated',
                'Recruitment Campaign Updated',
                "An admin updated the recruitment campaign '{$recruitmentNotice->title}'.",
                Club::class,
                $recruitmentNotice->club_id,
                $request->user()->id
            );
        }

        \App\Services\AuditService::log('recruitment_notice_updated', $recruitmentNotice, ['title' => $recruitmentNotice->title], $request->user()->id);

        return response()->json($recruitmentNotice->load('club'));
    }

    public function destroy(Request $request, RecruitmentNotice $recruitmentNotice): JsonResponse
    {
        $this->authorize('delete', $recruitmentNotice);

        \App\Services\AuditService::log('recruitment_notice_deleted', $recruitmentNotice, ['title' => $recruitmentNotice->title], $request->user()->id);

        $recruitmentNotice->delete();

        return response()->json(['message' => 'Recruitment notice deleted successfully.']);
    }
}
