<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $logs = $this->buildQuery($request)->latest('id')->paginate(30);
        return response()->json($logs);
    }

    public function export(Request $request)
    {
        $logs = $this->buildQuery($request)->latest('id')->get();
        $filename = 'audit_logs_' . date('Y-m-d_His') . '.csv';

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($logs) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['ID', 'Timestamp', 'Actor Name', 'Actor Email', 'Actor Role', 'Action', 'Target', 'Club ID', 'Metadata']);

            foreach ($logs as $log) {
                $actorName  = $log->user?->name ?? ($log->user_id ? "User #{$log->user_id}" : 'System');
                $actorEmail = $log->user?->email ?? '';
                $actorRole  = ucfirst($log->actor_role ?? 'member');
                $target     = $log->target_label ?? ($log->target_type ? "{$log->target_type} #{$log->target_id}" : 'System');
                $metaSummary = is_array($log->metadata) ? json_encode($log->metadata, JSON_UNESCAPED_SLASHES) : '';

                fputcsv($file, [
                    $log->id,
                    $log->created_at?->toDateTimeString(),
                    $actorName,
                    $actorEmail,
                    $actorRole,
                    $log->action,
                    $target,
                    $log->club_id ?? '',
                    $metaSummary,
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    protected function buildQuery(Request $request)
    {
        $query = AuditLog::with(['user:id,name,email', 'actor:id,name,email', 'target']);

        // Search text (Name/Email/Action)
        if ($request->filled('search')) {
            $search = '%' . $request->input('search') . '%';
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', $search)
                  ->orWhereHas('user', function ($u) use ($search) {
                      $u->where('name', 'like', $search)->orWhere('email', 'like', $search);
                  })
                  ->orWhereRaw("JSON_EXTRACT(metadata, '$.label') LIKE ?", [$search])
                  ->orWhereRaw("JSON_EXTRACT(metadata, '$.name') LIKE ?", [$search])
                  ->orWhereRaw("JSON_EXTRACT(metadata, '$.title') LIKE ?", [$search]);
            });
        }

        // Filter by user ID
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        // Filter by actor role
        if ($request->filled('role')) {
            $query->where('actor_role', $request->input('role'));
        }

        // Filter by club
        if ($request->filled('club_id')) {
            $clubId = $request->input('club_id');
            $query->where(function ($q) use ($clubId) {
                $q->where('club_id', $clubId)
                  ->orWhere(function ($inner) use ($clubId) {
                      $inner->where('target_type', 'Club')->where('target_id', $clubId);
                  });
            });
        }

        // Filter by action category or action prefix
        if ($request->filled('category')) {
            $query->where('action', 'like', $request->input('category') . '%');
        } elseif ($request->filled('action')) {
            $query->where('action', 'like', $request->input('action') . '%');
        }

        // Date range
        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->input('from'));
        }
        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->input('to'));
        }

        return $query;
    }
}
