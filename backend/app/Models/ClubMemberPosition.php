<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClubMemberPosition extends Model
{
    use HasFactory;

    protected $fillable = [
        'club_member_id',
        'club_position_id',
        'assigned_at',
        'ends_at',
    ];

    protected function casts(): array
    {
        return [
            'assigned_at' => 'datetime',
            'ends_at'     => 'datetime',
        ];
    }

    public function clubMember(): BelongsTo
    {
        return $this->belongsTo(ClubMember::class);
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(ClubPosition::class, 'club_position_id');
    }
}
