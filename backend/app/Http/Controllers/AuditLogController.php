<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;

class AuditLogController extends Controller
{
    public function index(): JsonResponse
    {
        $logs = AuditLog::with('actor')->latest()->paginate(25);

        return response()->json($logs);
    }
}
