<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'student_id',
        'email',
        'password',
        'department',
        'phone',
        'is_admin',
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
        ];
    }

    public function clubMemberships(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ClubMember::class);
    }

    public function membershipRequests(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(MembershipRequest::class);
    }

    public function eventRegistrations(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(EventRegistration::class);
    }

    public function notifications(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function clubs(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(
            Club::class,
            'club_members',
            'user_id',
            'club_id'
        );
    }

    /**
     * True if the user holds a position with the given permission flag
     * in an active membership of the given club.
     */
    public function hasClubPermission(int|Club $club, string $permission): bool
    {
        $clubId = $club instanceof Club ? $club->id : $club;

        return $this->clubMemberships()
            ->where('club_id', $clubId)
            ->where('status', 'active')
            ->whereHas('positions', function ($q) use ($permission) {
                $q->where(function ($q2) {
                    $q2->whereNull('ends_at')
                        ->orWhere('ends_at', '>', now());
                })->whereHas('position', fn($q3) => $q3->where($permission, true));
            })
            ->exists();
    }

    public function isMemberOf(int|Club $club): bool
    {
        $clubId = $club instanceof Club ? $club->id : $club;

        return $this->clubMemberships()
            ->where('club_id', $clubId)
            ->where('status', 'active')
            ->exists();
    }
}