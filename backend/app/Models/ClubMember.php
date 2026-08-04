<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClubMember extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'club_id',
        'user_id',
        'role',
        'joined_at',
    ];

    protected $casts = [
        'joined_at' => 'datetime',
    ];

    public function club()
    {
        return $this->belongsTo(Club::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function positions()
    {
        return $this->hasMany(ClubMemberPosition::class);
    }

    public static function getRoleRank(?string $role): int
    {
        return match (strtolower($role ?? 'member')) {
            'president'      => 10,
            'vice_president',
            'vice president',
            'vp'             => 9,
            'secretary',
            'treasurer'      => 8,
            'executive'      => 7,
            default          => 1,
        };
    }

    public static function calculatePositionRank(?ClubPosition $pos): int
    {
        if (!$pos) return 1;
        $title = strtolower($pos->title);
        if (str_contains($title, 'president') && !str_contains($title, 'vice')) {
            return 10;
        }
        if (str_contains($title, 'vice') || str_contains($title, 'vp')) {
            return 9;
        }
        if (str_contains($title, 'secretary') || str_contains($title, 'treasurer')) {
            return 8;
        }
        if ($pos->is_executive || $pos->can_manage_members) {
            return 7;
        }
        return 1;
    }

    public function getHighestRank(): int
    {
        $maxRank = static::getRoleRank($this->role);

        $positions = $this->positions()
            ->where(function ($q) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>', now());
            })
            ->with('position')
            ->get();

        foreach ($positions as $p) {
            if ($p->position) {
                $rank = static::calculatePositionRank($p->position);
                if ($rank > $maxRank) {
                    $maxRank = $rank;
                }
            }
        }

        return $maxRank;
    }
}

