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
        'banner_path',
        'banner_thumbnail_path',
        'status',
        'visibility',
        'location_type',
        'location_value',
        'starts_at',
        'ends_at',
        'capacity',
        'custom_fields',
        'feedback_policy',
    ];

    protected $casts = [
        'starts_at'     => 'datetime',
        'ends_at'       => 'datetime',
        'capacity'      => 'integer',
        'custom_fields' => 'array',
    ];

    protected $appends = [
        'banner_url',
        'banner_thumbnail_url',
    ];

    public function getBannerUrlAttribute(): ?string
    {
        return $this->banner_path ? asset('storage/' . ltrim($this->banner_path, '/')) : null;
    }

    public function getBannerThumbnailUrlAttribute(): ?string
    {
        return $this->banner_thumbnail_path ? asset('storage/' . ltrim($this->banner_thumbnail_path, '/')) : null;
    }

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

    public function blocks(): HasMany
    {
        return $this->hasMany(EventBlock::class);
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
        if (is_null($this->capacity)) {
            return 999999;
        }
        $registeredCount = $this->registrations()->where('status', 'registered')->count();
        return max(0, $this->capacity - $registeredCount);
    }

    /**
     * Whether the event is accepting new registrations.
     * Only published events with open spots qualify.
     */
    public function isRegistrationOpen(): bool
    {
        if ($this->status !== 'published') {
            return false;
        }
        if (is_null($this->capacity)) {
            return true;
        }
        return $this->spotsRemaining() > 0;
    }

    /**
     * Exec roles that can manage events within a club.
     */
    public static function execRoles(): array
    {
        return ['president', 'vice_president', 'secretary', 'treasurer', 'executive'];
    }
}
