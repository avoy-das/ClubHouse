<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Event extends Model
{
    protected $fillable = [
        'club_id',
        'created_by',
        'title',
        'description',
        'status',
        'visibility',
        'location_type',
        'location_value',
        'starts_at',
        'ends_at',
        'capacity',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at'   => 'datetime',
        'capacity'  => 'integer',
    ];

    // -------------------------------------------------------
    // Relationships
    // -------------------------------------------------------

    public function club(): BelongsTo
    {
        return $this->belongsTo(Club::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(EventRegistration::class);
    }

    public function feedback(): HasMany
    {
        return $this->hasMany(EventFeedback::class);
    }

    // -------------------------------------------------------
    // Helpers
    // -------------------------------------------------------

    /**
     * How many spots are still available.
     * Returns 0 if at or over capacity (never negative).
     */
    public function spotsRemaining(): int
    {
        return max(0, $this->capacity - $this->registrations()->count());
    }

    /**
     * Whether the event is accepting new registrations.
     * Only published events with open spots qualify.
     */
    public function isRegistrationOpen(): bool
    {
        return $this->status === 'published' && $this->spotsRemaining() > 0;
    }

    /**
     * Exec roles that can manage events within a club.
     */
    public static function execRoles(): array
    {
        return ['president', 'vice_president', 'secretary', 'treasurer'];
    }
}