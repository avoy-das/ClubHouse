<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreClubPositionRequest;
use App\Http\Requests\UpdateClubPositionRequest;
use App\Models\Club;
use App\Models\ClubPosition;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClubPositionController extends Controller
{
    public function index(Club $club): JsonResponse
    {
        return response()->json($club->positions);
    }

    public function store(StoreClubPositionRequest $request, Club $club): JsonResponse
    {
        $user = $request->user();
        if (!$user->is_admin && !$user->hasClubPermission($club, 'can_manage_members')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $data = $request->validated();

        if (!empty($data['is_default'])) {
            $club->positions()->where('is_default', true)->update(['is_default' => false]);
        }

        $position = $club->positions()->create($data);

        return response()->json($position, 201);
    }

    public function update(UpdateClubPositionRequest $request, ClubPosition $position): JsonResponse
    {
        $user = $request->user();
        if (!$user->is_admin && !$user->hasClubPermission($position->club_id, 'can_manage_members')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $data = $request->validated();

        if (!empty($data['is_default'])) {
            ClubPosition::where('club_id', $position->club_id)
                ->where('id', '!=', $position->id)
                ->update(['is_default' => false]);
        }

        $position->update($data);

        return response()->json($position);
    }

    public function destroy(Request $request, ClubPosition $position): JsonResponse
    {
        $user = $request->user();
        if (!$user->is_admin && !$user->hasClubPermission($position->club_id, 'can_manage_members')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $position->delete();

        return response()->json(['message' => 'Position deleted successfully.']);
    }
}
