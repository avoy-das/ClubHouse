<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class CacheInvalidationService
{
    /**
     * Invalidate overview report cache.
     */
    public static function overviewReport(): void
    {
        Cache::forget('clubhouse:reports:overview');
    }

    /**
     * Invalidate public club list and specific club detail cache.
     */
    public static function club(int $clubId = 0): void
    {
        Cache::forget('clubhouse:clubs:approved_list');
        Cache::forget('clubhouse:reports:overview');

        if ($clubId > 0) {
            Cache::forget("clubhouse:clubs:show:{$clubId}");
        }
    }

    /**
     * Invalidate event schedule and reports cache.
     */
    public static function event(int $clubId = 0): void
    {
        Cache::forget('clubhouse:events:schedule');
        Cache::forget('clubhouse:reports:overview');

        if ($clubId > 0) {
            Cache::forget("clubhouse:clubs:show:{$clubId}");
        }
    }

    /**
     * Invalidate all high-level caches (used during major updates/resets).
     */
    public static function clearAll(): void
    {
        Cache::forget('clubhouse:reports:overview');
        Cache::forget('clubhouse:clubs:approved_list');
        Cache::forget('clubhouse:events:schedule');
    }
}
