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
     * Send notification to all registered users.
     */
    public static function notifyAllUsers(
        string $type,
        string $title,
        string $message,
        ?string $relatedType = null,
        ?int $relatedId = null,
        ?int $excludeUserId = null
    ): void {
        $query = User::query();
        if ($excludeUserId) {
            $query->where('id', '!=', $excludeUserId);
        }

        $userIds = $query->pluck('id');

        self::sendBulkNotifications($userIds, $type, $title, $message, $relatedType, $relatedId);
    }

    /**
     * Send notification to users belonging to specific student sessions.
     */
    public static function notifyUsersBySessions(
        array $sessions,
        string $type,
        string $title,
        string $message,
        ?string $relatedType = null,
        ?int $relatedId = null,
        ?int $excludeUserId = null
    ): void {
        if (empty($sessions)) return;

        $query = User::whereIn('session', $sessions);
        if ($excludeUserId) {
            $query->where('id', '!=', $excludeUserId);
        }

        $userIds = $query->pluck('id');

        self::sendBulkNotifications($userIds, $type, $title, $message, $relatedType, $relatedId);
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

        self::sendBulkNotifications($adminIds, $type, $title, $message, $relatedType, $relatedId);
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

        self::sendBulkNotifications($execUserIds, $type, $title, $message, $relatedType, $relatedId, $excludeUserId);
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

        self::sendBulkNotifications($memberUserIds, $type, $title, $message, $relatedType, $relatedId, $excludeUserId);
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
            ->where(function ($q) {
                $q->whereNull('status')->orWhere('status', 'registered');
            })
            ->pluck('user_id')
            ->unique();

        self::sendBulkNotifications($attendeeUserIds, $type, $title, $message, $relatedType, $relatedId, $excludeUserId);
    }

    /**
     * Send notification to a collection or array of specific user IDs.
     */
    public static function notifyUserIds(
        iterable $userIds,
        string $type,
        string $title,
        string $message,
        ?string $relatedType = null,
        ?int $relatedId = null,
        ?int $excludeUserId = null
    ): void {
        self::sendBulkNotifications($userIds, $type, $title, $message, $relatedType, $relatedId, $excludeUserId);
    }

    /**
     * Helper to perform chunked bulk insertion of notifications.
     */
    private static function sendBulkNotifications(
        iterable $userIds,
        string $type,
        string $title,
        string $message,
        ?string $relatedType = null,
        ?int $relatedId = null,
        ?int $excludeUserId = null
    ): void {
        $now = now();
        $insertData = [];

        foreach ($userIds as $userId) {
            if ($excludeUserId && $userId == $excludeUserId) {
                continue;
            }
            $insertData[] = [
                'user_id'      => $userId,
                'type'         => $type,
                'title'        => $title,
                'message'      => $message,
                'related_type' => $relatedType,
                'related_id'   => $relatedId,
                'created_at'   => $now,
                'updated_at'   => $now,
            ];
        }

        if (!empty($insertData)) {
            foreach (array_chunk($insertData, 500) as $chunk) {
                Notification::insert($chunk);
            }
        }
    }
}
