<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Club;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class AuditService
{
    public static function log(string $action, ?Model $target = null, array $metadata = [], ?int $userId = null, ?int $clubId = null): void
    {
        $resolvedUserId = $userId ?? Auth::id();

        $targetType = null;
        if ($target) {
            $morphClass = $target->getMorphClass();
            $targetType = ($morphClass === get_class($target)) ? class_basename($target) : $morphClass;
        }

        $resolvedClubId = $clubId;
        if (!$resolvedClubId) {
            if ($target instanceof Club) {
                $resolvedClubId = $target->id;
            } elseif ($target && isset($target->club_id)) {
                $resolvedClubId = $target->club_id;
            } elseif (isset($metadata['club_id'])) {
                $resolvedClubId = (int) $metadata['club_id'];
            }
        }

        if ($target && !isset($metadata['label'])) {
            foreach (['name', 'title', 'email'] as $field) {
                if (!empty($target->{$field}) && is_string($target->{$field})) {
                    $metadata['label'] = $target->{$field};
                    break;
                }
            }
        }

        $actorRole = null;
        if ($resolvedUserId) {
            $user = ($resolvedUserId === Auth::id() && Auth::user())
                ? Auth::user()
                : \App\Models\User::find($resolvedUserId);

            if ($user) {
                if ($user->is_admin) {
                    $actorRole = 'admin';
                } else {
                    $execQuery = \App\Models\ClubMember::where('user_id', $user->id)
                        ->where('status', 'active')
                        ->where(function ($q) {
                            $q->where('role', '!=', 'member')
                              ->orWhereHas('positions', function ($p) {
                                  $p->whereHas('position', function ($pos) {
                                      $pos->where('is_executive', true);
                                  });
                              });
                        });

                    if ($resolvedClubId) {
                        $execQuery->where('club_id', $resolvedClubId);
                    }

                    $actorRole = $execQuery->exists() ? 'executive' : 'member';
                }
            }
        }

        AuditLog::create([
            'user_id'     => $resolvedUserId,
            'actor_role'  => $actorRole,
            'club_id'     => $resolvedClubId,
            'action'      => $action,
            'target_type' => $targetType,
            'target_id'   => $target ? $target->getKey() : null,
            'metadata'    => empty($metadata) ? null : $metadata,
            'created_at'  => now(),
        ]);
    }
}