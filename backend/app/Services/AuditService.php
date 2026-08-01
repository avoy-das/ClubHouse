<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class AuditService
{
    public static function log(string $action, ?Model $target = null, array $metadata = [], ?int $userId = null): void
    {
        $resolvedUserId = $userId ?? Auth::id();
        if (!$resolvedUserId && $target && $target instanceof \App\Models\User) {
            $resolvedUserId = $target->id;
        }

        AuditLog::create([
            'user_id'     => $resolvedUserId,
            'action'      => $action,
            'target_type' => $target ? class_basename($target) : 'User',
            'target_id'   => $target ? $target->getKey() : null,
            'metadata'    => empty($metadata) ? null : $metadata,
            'created_at'  => now(),
        ]);
    }
}