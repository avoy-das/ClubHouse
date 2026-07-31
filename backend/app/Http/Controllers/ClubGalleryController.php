<?php

namespace App\Http\Controllers;

use App\Models\Club;
use App\Models\ClubGallery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClubGalleryController extends Controller
{
    public function index(Club $club): JsonResponse
    {
        return response()->json($club->galleries()->with('uploader')->latest()->get());
    }

    public function store(Request $request, Club $club): JsonResponse
    {
        $user = $request->user();
        if (!$user->is_admin && !$user->hasClubPermission($club, 'can_manage_members')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $request->validate([
            'image_path' => 'required|string|max:255',
            'caption'    => 'nullable|string|max:255',
        ]);

        $item = $club->galleries()->create([
            'image_path'  => $request->input('image_path'),
            'caption'     => $request->input('caption'),
            'uploaded_by' => $user->id,
        ]);

        return response()->json($item, 201);
    }

    public function destroy(Request $request, ClubGallery $gallery): JsonResponse
    {
        $user = $request->user();
        if (!$user->is_admin && !$user->hasClubPermission($gallery->club_id, 'can_manage_members')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $gallery->delete();

        return response()->json(['message' => 'Gallery image removed successfully.']);
    }
}
