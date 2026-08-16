<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'name',
        'student_id',
        'email',
        'password',
        'department',
        'session',
        'phone',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'is_admin'          => 'boolean',
            'session'           => 'integer',
        ];
    }

    public function clubs()
    {
        return $this->hasMany(ClubMember::class);
    }

    public function clubMemberships()
    {
        return $this->hasMany(ClubMember::class);
    }

    public function createdClubs()
    {
        return $this->hasMany(Club::class, 'created_by');
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    public function receivedAnnouncements()
    {
        return $this->belongsToMany(Announcement::class, 'announcement_recipients')->withTimestamps();
    }

    public function isMemberOf(int|Club $club): bool
    {
        $clubId = $club instanceof Club ? $club->id : $club;
        return $this->clubMemberships()
            ->where('club_id', $clubId)
            ->where(function ($st) {
                $st->where('status', 'active')->orWhereNull('status');
            })
            ->exists();
    }

    public function hasClubPermission(int|Club $club, string $permission): bool
    {
        $clubId = $club instanceof Club ? $club->id : $club;

        return $this->clubMemberships()
            ->where('club_id', $clubId)
            ->where(function ($st) {
                $st->where('status', 'active')->orWhereNull('status');
            })
            ->where(function ($query) use ($permission) {
                $query->whereIn('role', ['president', 'vice_president', 'secretary', 'treasurer', 'executive'])
                      ->orWhereHas('positions', function ($q) use ($permission) {
                          $q->where(function ($q2) {
                              $q2->whereNull('ends_at')->orWhere('ends_at', '>', now());
                          })->whereHas('position', fn ($q3) => $q3->where($permission, true));
                      });
            })
            ->exists();
    }

    public function getExecutiveClubs()
    {
        return Club::whereHas('members', function ($q) {
            $q->where('user_id', $this->id)
              ->where(function ($st) {
                  $st->where('status', 'active')->orWhereNull('status');
              })
              ->where(function ($q2) {
                  $q2->whereIn('role', ['president', 'vice_president', 'secretary', 'treasurer', 'executive'])
                     ->orWhereHas('positions', function ($p) {
                         $p->where(function ($p2) {
                             $p2->whereNull('ends_at')->orWhere('ends_at', '>', now());
                          })->whereHas('position', fn ($q3) => $q3->where('can_manage_events', true)->orWhere('can_manage_announcements', true)->orWhere('is_executive', true));
                      });
               });
        })->where('status', 'approved')->get(['id', 'name']);
    }

    public function getClubRank(int|Club $club): int
    {
        if ($this->is_admin) {
            return 100;
        }

        $clubId = $club instanceof Club ? $club->id : $club;

        $member = ClubMember::where('club_id', $clubId)
            ->where('user_id', $this->id)
            ->where(function ($st) {
                $st->where('status', 'active')->orWhereNull('status');
            })
            ->first();

        if (!$member) {
            return 1;
        }

        return $member->getHighestRank();
    }
}