<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Announcement extends Model
{
    use HasFactory;

    protected $fillable = [
        'club_id',
        'title',
        'body',
        'posted_by',
        'is_pinned',
        'target_type',
        'target_club_id',
        'target_user_id',
        'targets',
    ];

    protected function casts(): array
    {
        return [
            'is_pinned' => 'boolean',
            'targets'   => 'array',
        ];
    }

    public function club(): BelongsTo
    {
        return $this->belongsTo(Club::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    public function targetClub(): BelongsTo
    {
        return $this->belongsTo(Club::class, 'target_club_id');
    }

    public function targetUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }

    public function recipients(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'announcement_recipients')->withTimestamps();
    }
}
