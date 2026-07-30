<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecruitmentApplication extends Model
{
    use HasFactory;

    protected $fillable = [
        'recruitment_notice_id',
        'user_id',
        'answers',
        'status',
        'reviewed_by',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'answers'     => 'array',
            'reviewed_at' => 'datetime',
        ];
    }

    public function recruitmentNotice(): BelongsTo
    {
        return $this->belongsTo(RecruitmentNotice::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
