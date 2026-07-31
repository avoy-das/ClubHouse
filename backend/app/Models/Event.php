<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Event extends Model
{
    use HasFactory;

    protected $fillable = [
        'club_id',
        'title',
        'description',
        'venue',
        'capacity',
        'is_members_only',
        'start_at',
        'end_at',
        'registration_deadline',
        'status',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'is_members_only'       => 'boolean',
            'start_at'              => 'datetime',
            'end_at'                => 'datetime',
            'registration_deadline' => 'datetime',
        ];
    }

    public function club(): BelongsTo
    {
        return $this->belongsTo(Club::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(EventRegistration::class);
    }
}
