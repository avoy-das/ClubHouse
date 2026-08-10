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
        'created_by',
        'title',
        'session',
        'target_sessions',
        'description',
        'requirements',
        'custom_fields',
        'pipeline_template',
        'pipeline_stages',
        'opens_at',
        'closes_at',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'opens_at'        => 'datetime',
            'closes_at'       => 'datetime',
            'custom_fields'   => 'array',
            'target_sessions' => 'array',
            'pipeline_stages' => 'array',
        ];
    }

    public static function pipelineTemplates(): array
    {
        return [
            'single_stage' => [
                ['key' => 'submitted', 'label' => 'Submitted / Review'],
            ],
            'multi_stage' => [
                ['key' => 'submitted', 'label' => 'Application Submitted'],
                ['key' => 'screening', 'label' => 'Initial Screening'],
                ['key' => 'interview', 'label' => 'Interview'],
            ],
        ];
    }

    public function getInitialStage(): string
    {
        if (!empty($this->pipeline_stages) && is_array($this->pipeline_stages)) {
            return $this->pipeline_stages[0]['key'] ?? 'submitted';
        }
        return 'submitted';
    }

    public function getAllValidStatuses(): array
    {
        $statuses = ['accepted', 'rejected'];

        if (!empty($this->pipeline_stages) && is_array($this->pipeline_stages)) {
            foreach ($this->pipeline_stages as $stage) {
                if (!empty($stage['key'])) {
                    $statuses[] = $stage['key'];
                }
            }
        } else {
            $statuses[] = 'submitted';
        }

        return array_values(array_unique($statuses));
    }

    public function getStageLabelFor(string $status): string
    {
        if ($status === 'accepted') {
            return 'Accepted';
        }
        if ($status === 'rejected') {
            return 'Rejected';
        }

        if (!empty($this->pipeline_stages) && is_array($this->pipeline_stages)) {
            foreach ($this->pipeline_stages as $stage) {
                if (isset($stage['key']) && $stage['key'] === $status) {
                    return $stage['label'] ?? ucfirst($status);
                }
            }
        }

        return ucfirst($status);
    }

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
        return $this->hasMany(RecruitmentApplication::class);
    }
}
