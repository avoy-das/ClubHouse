<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAnnouncementRequest;
use App\Http\Requests\UpdateAnnouncementRequest;
use App\Models\Announcement;
use App\Models\Club;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    public function index(Club $club): JsonResponse
    {
        $announcements = Announcement::where('club_id', $club->id)
            ->with('author')
            ->orderBy('is_pinned', 'desc')
            ->latest()
            ->get();

        return response()->json($announcements);
    }

    public function store(StoreAnnouncementRequest $request, Club $club): JsonResponse
    {
        $this->authorize('create', [Announcement::class, $club]);

        $data = $request->validated();

        $announcement = Announcement::create([
            'club_id'   => $club->id,
            'title'     => $data['title'],
            'body'      => $data['body'],
            'posted_by' => $request->user()->id,
            'is_pinned' => $data['is_pinned'] ?? false,
        ]);

        return response()->json($announcement->load('author'), 201);
    }

    public function show(Announcement $announcement): JsonResponse
    {
        return response()->json($announcement->load(['club', 'author']));
    }

    public function update(UpdateAnnouncementRequest $request, Announcement $announcement): JsonResponse
    {
        $this->authorize('update', $announcement);

        $announcement->update($request->validated());

        return response()->json($announcement->load('author'));
    }

    public function destroy(Request $request, Announcement $announcement): JsonResponse
    {
        $this->authorize('delete', $announcement);

        $announcement->delete();

        return response()->json(['message' => 'Announcement deleted successfully.']);
    }

    public function allAnnouncements(Request $request): JsonResponse
    {
        $userClubIds = \App\Models\ClubMember::where('user_id', $request->user()->id)->pluck('club_id');

        $announcements = Announcement::whereIn('club_id', $userClubIds)
            ->orWhereHas('club', function ($q) {
                $q->where('status', 'approved');
            })
            ->with(['club:id,name', 'author:id,name'])
            ->orderBy('is_pinned', 'desc')
            ->latest()
            ->get();

        return response()->json($announcements);
    }
}
