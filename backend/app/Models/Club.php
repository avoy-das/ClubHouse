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
        'reason',
        'status',
        'created_by',
        'approved_by',
        'approved_at',
        'rejection_reason',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
    ];

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
