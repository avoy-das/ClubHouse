<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RecruitmentNotice extends Model
{
    use HasFactory;

    protected $fillable = [
        'club_id',
        'title',
        'session',
        'description',
        'requirements',
        'custom_fields',
        'opens_at',
        'closes_at',
        'status',
        'created_by',
    ];

    protected $casts = [
        'custom_fields' => 'array',
        'opens_at'      => 'datetime',
        'closes_at'     => 'datetime',
    ];

    public function club(): BelongsTo
    {
        return $this->belongsTo(Club::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(RecruitmentApplication::class, 'recruitment_notice_id');
    }
}
