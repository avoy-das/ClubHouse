<?php

namespace App\Http\Controllers;

use App\Models\Club;
use App\Models\Event;
use App\Models\RecruitmentNotice;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    /**
     * Handle global search across clubs, events, recruitment notices, and members.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:100'],
        ]);

        $user = $request->user();
        $query = trim($request->input('q'));
        $escaped = '%' . addcslashes($query, '%_\\') . '%';

        // 1. Clubs (name, description)
        $clubs = Club::query()
            ->where(function ($q) use ($escaped) {
                $q->where('name', 'LIKE', $escaped)
                  ->orWhere('description', 'LIKE', $escaped);
            })
            ->select(['id', 'name', 'slug', 'category', 'description', 'logo_path', 'status'])
            ->get();

        // 2. Events (title, description)
        $events = Event::query()
            ->with(['club:id,name,slug'])
            ->where(function ($q) use ($escaped) {
                $q->where('title', 'LIKE', $escaped)
                  ->orWhere('description', 'LIKE', $escaped);
            })
            ->select(['id', 'club_id', 'title', 'description', 'starts_at', 'ends_at', 'status', 'location_type', 'location_value', 'visibility'])
            ->get();

        // 3. Recruitment Notices (title, description)
        $recruitmentQuery = RecruitmentNotice::query()
            ->with(['club:id,name,slug']);

        // Non-admins only see 'open' recruitment notices
        if (!$user || !$user->is_admin) {
            $recruitmentQuery->where('status', 'open');
        }

        $recruitment = $recruitmentQuery
            ->where(function ($q) use ($escaped) {
                $q->where('title', 'LIKE', $escaped)
                  ->orWhere('description', 'LIKE', $escaped);
            })
            ->select(['id', 'club_id', 'title', 'description', 'requirements', 'opens_at', 'closes_at', 'status'])
            ->get();

        $results = [
            'clubs'       => $clubs,
            'events'      => $events,
            'recruitment' => $recruitment,
        ];

        // 4. Members (users: name, student_id) - Admin ONLY
        if ($user && $user->is_admin) {
            $members = User::query()
                ->where(function ($q) use ($escaped) {
                    $q->where('name', 'LIKE', $escaped)
                      ->orWhere('student_id', 'LIKE', $escaped);
                })
                ->select(['id', 'name', 'student_id', 'email', 'department', 'phone'])
                ->get();

            $results['members'] = $members;
        }

        return response()->json($results);
    }
}
