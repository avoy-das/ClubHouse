<?php

namespace App\Services;

use App\Models\ClubMember;
use App\Models\EventRegistration;
use App\Models\Notification;
use App\Models\User;

class NotificationService
{
    /**
     * Send notification to a single user.
     */
    public static function notifyUser(
        int $userId,
        string $type,
        string $title,
        string $message,
        ?string $relatedType = null,
        ?int $relatedId = null
    ): ?Notification {
        return Notification::create([
            'user_id'      => $userId,
            'type'         => $type,
            'title'        => $title,
            'message'      => $message,
            'related_type' => $relatedType,
            'related_id'   => $relatedId,
        ]);
    }

    /**
     * Send notification to all platform admins.
     */
    public static function notifyAdmins(
        string $type,
        string $title,
        string $message,
        ?string $relatedType = null,
        ?int $relatedId = null,
        ?int $excludeUserId = null
    ): void {
        $query = User::where('is_admin', true);
        if ($excludeUserId) {
            $query->where('id', '!=', $excludeUserId);
        }

        $adminIds = $query->pluck('id');

        foreach ($adminIds as $adminId) {
            self::notifyUser($adminId, $type, $title, $message, $relatedType, $relatedId);
        }
    }

    /**
     * Send notification to executives of a club.
     */
    public static function notifyClubExecutives(
        int $clubId,
        string $type,
        string $title,
        string $message,
        ?string $relatedType = null,
        ?int $relatedId = null,
        ?int $excludeUserId = null
    ): void {
        $execUserIds = ClubMember::where('club_id', $clubId)
            ->where('status', 'active')
            ->where(function ($q) {
                $q->whereIn('role', ['president', 'vice_president', 'secretary', 'treasurer', 'executive'])
                  ->orWhereHas('positions', function ($p) {
                      $p->where(function ($p2) {
                          $p2->whereNull('ends_at')->orWhere('ends_at', '>', now());
                      });
                  });
            })
            ->pluck('user_id')
            ->unique();

        foreach ($execUserIds as $userId) {
            if ($excludeUserId && $userId == $excludeUserId) {
                continue;
            }
            self::notifyUser($userId, $type, $title, $message, $relatedType, $relatedId);
        }
    }

    /**
     * Send notification to all active members of a club.
     */
    public static function notifyClubMembers(
        int $clubId,
        string $type,
        string $title,
        string $message,
        ?string $relatedType = null,
        ?int $relatedId = null,
        ?int $excludeUserId = null
    ): void {
        $memberUserIds = ClubMember::where('club_id', $clubId)
            ->where('status', 'active')
            ->pluck('user_id')
            ->unique();

        foreach ($memberUserIds as $userId) {
            if ($excludeUserId && $userId == $excludeUserId) {
                continue;
            }
            self::notifyUser($userId, $type, $title, $message, $relatedType, $relatedId);
        }
    }

    /**
     * Send notification to all registered attendees for an event.
     */
    public static function notifyEventAttendees(
        int $eventId,
        string $type,
        string $title,
        string $message,
        ?string $relatedType = null,
        ?int $relatedId = null,
        ?int $excludeUserId = null
    ): void {
        $attendeeUserIds = EventRegistration::where('event_id', $eventId)
            ->pluck('user_id')
            ->unique();

        foreach ($attendeeUserIds as $userId) {
            if ($excludeUserId && $userId == $excludeUserId) {
                continue;
            }
            self::notifyUser($userId, $type, $title, $message, $relatedType, $relatedId);
        }
    }
}
