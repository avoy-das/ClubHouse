<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class AuditService
{
    public static function log(string $action, ?Model $target = null, array $metadata = [], ?int $userId = null): void
    {
        AuditLog::create([
            'user_id'     => $userId ?? Auth::id(),
            'action'      => $action,
            'target_type' => $target ? class_basename($target) : 'User',
            'target_id'   => $target ? $target->getKey() : null,
            'metadata'    => empty($metadata) ? null : $metadata,
        ]);
    }
}