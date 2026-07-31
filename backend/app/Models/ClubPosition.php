<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClubPosition extends Model
{
    use HasFactory;

    protected $fillable = [
        'club_id',
        'title',
        'is_executive',
        'can_manage_members',
        'can_manage_events',
        'can_manage_announcements',
        'can_manage_recruitment',
        'can_track_attendance',
        'is_default',
    ];

    protected function casts(): array
    {
        return [
            'is_executive'             => 'boolean',
            'can_manage_members'       => 'boolean',
            'can_manage_events'        => 'boolean',
            'can_manage_announcements' => 'boolean',
            'can_manage_recruitment'   => 'boolean',
            'can_track_attendance'     => 'boolean',
            'is_default'               => 'boolean',
        ];
    }

    public function club(): BelongsTo
    {
        return $this->belongsTo(Club::class);
    }
}
