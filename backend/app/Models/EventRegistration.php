<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventRegistration extends Model
{
    public const STATUS_REGISTERED = 'registered';
    public const STATUS_WAITLISTED = 'waitlisted';
    public const STATUS_PENDING    = 'pending';
    public const STATUS_APPROVED   = 'approved';
    public const STATUS_REJECTED   = 'rejected';

    protected $fillable = [
        'event_id',
        'user_id',
        'attended',
        'answers',
        'status',
    ];

    protected $casts = [
        'attended' => 'boolean',
        'answers'  => 'array',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
