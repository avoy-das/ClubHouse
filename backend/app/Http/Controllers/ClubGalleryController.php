<?php

namespace App\Http\Controllers;

use App\Models\Club;
use App\Models\ClubGallery;
use App\Services\AuditService;
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
            'image'   => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
            'caption' => 'nullable|string|max:255',
        ]);

        $imagePath = $request->file('image')->store('clubs/galleries', 'public');

        $item = $club->galleries()->create([
            'image_path'  => $imagePath,
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

        AuditService::log('club.gallery_deleted', $gallery, [
            'caption' => $gallery->caption,
        ], $user->id, $gallery->club_id);

        $gallery->delete();

        return response()->json(['message' => 'Gallery image removed successfully.']);
    }
}
