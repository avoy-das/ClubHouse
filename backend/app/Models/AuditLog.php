<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'club_id',
        'action',
        'target_type',
        'target_id',
        'metadata',
    ];

    protected $casts = [
        'metadata'   => 'array',
        'created_at' => 'datetime',
    ];

    protected $appends = [
        'target_label',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function club()
    {
        return $this->belongsTo(Club::class);
    }

    public function target()
    {
        return $this->morphTo('target', 'target_type', 'target_id');
    }

    public function getTargetLabelAttribute(): ?string
    {
        if (is_array($this->metadata)) {
            foreach (['label', 'name', 'title', 'email'] as $key) {
                if (!empty($this->metadata[$key]) && is_string($this->metadata[$key])) {
                    return $this->metadata[$key];
                }
            }
        }

        if ($this->relationLoaded('target') && $this->target) {
            foreach (['name', 'title', 'email'] as $field) {
                if (!empty($this->target->{$field})) {
                    return (string) $this->target->{$field};
                }
            }
        }

        if ($this->target_type && $this->target_id) {
            return "{$this->target_type} #{$this->target_id}";
        }

        return null;
    }
}
