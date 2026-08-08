<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClubEditRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'club_id',
        'requested_by',
        'name',
        'category',
        'description',
        'department',
        'contact_email',
        'contact_phone',
        'logo_path',
        'banner_path',
        'reason',
        'status',
        'rejection_reason',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    protected $appends = [
        'logo_url',
        'banner_url',
    ];

    public function getLogoUrlAttribute(): ?string
    {
        return $this->logo_path ? asset('storage/' . ltrim($this->logo_path, '/')) : null;
    }

    public function getBannerUrlAttribute(): ?string
    {
        return $this->banner_path ? asset('storage/' . ltrim($this->banner_path, '/')) : null;
    }

    public function club(): BelongsTo
    {
        return $this->belongsTo(Club::class);
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
