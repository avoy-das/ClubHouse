<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::with(['user:id,name,email', 'actor:id,name,email', 'target']);

        // Filter by user
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }
        // Filter by club (uses indexed club_id column, fallback to target lookup)
        if ($request->filled('club_id')) {
            $clubId = $request->input('club_id');
            $query->where(function ($q) use ($clubId) {
                $q->where('club_id', $clubId)
                  ->orWhere(function ($inner) use ($clubId) {
                      $inner->where('target_type', 'Club')->where('target_id', $clubId);
                  });
            });
        }
        // Filter by action prefix
        if ($request->filled('action')) {
            $query->where('action', 'like', $request->input('action') . '%');
        }
        // Date range
        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->input('from'));
        }
        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->input('to'));
        }

        $logs = $query->latest('id')->paginate(30);

        return response()->json($logs);
    }
}
