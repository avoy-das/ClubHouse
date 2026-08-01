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

        return response()->json($notices);
    }

    public function store(StoreRecruitmentNoticeRequest $request, Club $club): JsonResponse
    {
        $this->authorize('create', [RecruitmentNotice::class, $club]);

        $data = $request->validated();
        $data['club_id'] = $club->id;
        $data['created_by'] = $request->user()->id;
        $data['status'] = $data['status'] ?? 'open';

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

        return response()->json($notice->load('club'), 201);
    }

    public function show(Request $request, RecruitmentNotice $recruitmentNotice): JsonResponse
    {
        $user = $request->user();
        $recruitmentNotice->load(['club', 'creator']);

        $myApplication = null;
        if ($user) {
            $myApplication = $recruitmentNotice->applications()
                ->where('user_id', $user->id)
                ->first();
        }

        $data = $recruitmentNotice->toArray();
        $data['my_application'] = $myApplication;

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

        return response()->json($recruitmentNotice->load('club'));
    }

    public function destroy(Request $request, RecruitmentNotice $recruitmentNotice): JsonResponse
    {
        $this->authorize('delete', $recruitmentNotice);

        $recruitmentNotice->delete();

        return response()->json(['message' => 'Recruitment notice deleted successfully.']);
    }
}
