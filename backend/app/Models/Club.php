<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Club extends Model
{
    protected $fillable = [
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
        'permission_doc_path',
        'created_by',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'advisor',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'advisor'     => 'array',
    ];

    protected $appends = [
        'logo_url',
        'banner_url',
        'permission_doc_url',
        'advisors',
    ];

    public function getAdvisorsAttribute(): array
    {
        $val = $this->advisor;
        if (!$val) return [];
        if (is_array($val) && isset($val['name'])) {
            return [$val];
        }
        return is_array($val) ? array_values($val) : [];
    }

    public function getLogoUrlAttribute(): ?string
    {
        return $this->logo_path ? asset('storage/' . ltrim($this->logo_path, '/')) : null;
    }

    public function getBannerUrlAttribute(): ?string
    {
        return $this->banner_path ? asset('storage/' . ltrim($this->banner_path, '/')) : null;
    }

    public function getPermissionDocUrlAttribute(): ?string
    {
        return $this->permission_doc_path ? asset('storage/' . ltrim($this->permission_doc_path, '/')) : null;
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function members()
    {
        return $this->hasMany(ClubMember::class);
    }
    public function events()
    {
        return $this->hasMany(Event::class);
    }

    public function positions()
    {
        return $this->hasMany(ClubPosition::class);
    }
}
