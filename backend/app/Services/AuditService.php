<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class AuditService
{
    public static function log(string $action, Model $target, array $metadata = []): void
    {
        AuditLog::create([
            'user_id'     => Auth::id(),
            'action'      => $action,
            'target_type' => class_basename($target),
            'target_id'   => $target->getKey(),
            'metadata'    => empty($metadata) ? null : $metadata,
        ]);
    }
}