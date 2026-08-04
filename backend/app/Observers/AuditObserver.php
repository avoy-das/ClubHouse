<?php

namespace App\Observers;

use App\Models\AuditLog;
use App\Services\AuditService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;


class AuditObserver
{
    protected function action(Model $model, string $event): string
    {
        $shortClass = class_basename($model);
        // Convert CamelCase to snake_case
        $snake = strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $shortClass));
        return "{$event}_{$snake}";
    }

    protected function meta(Model $model, string $event): array
    {
        $meta = [];

        if ($event === 'updated') {
            $dirty = $model->getDirty();
            // Exclude noisy timestamps
            unset($dirty['updated_at'], $dirty['created_at']);

            $original = [];
            foreach (array_keys($dirty) as $field) {
                // Skip password hashes
                if ($field === 'password') {
                    $dirty[$field]    = '[redacted]';
                    $original[$field] = '[redacted]';
                } else {
                    $original[$field] = $model->getOriginal($field);
                }
            }

            $meta['changed']  = $dirty;
            $meta['previous'] = $original;
        }


        foreach (['name', 'title', 'email'] as $labelField) {
            if (isset($model->{$labelField})) {
                $meta['label'] = $model->{$labelField};
                break;
            }
        }

        return $meta;
    }

    protected function resolveActor(): ?\App\Models\User
    {
        /** @var \App\Models\User|null */
        return Auth::guard('sanctum')->user() ?? Auth::user();
    }


    public function created(Model $model): void
    {
        AuditService::log(
            $this->action($model, 'create'),
            $model,
            $this->meta($model, 'created'),
            $this->resolveActor()?->id
        );
    }

    public function updated(Model $model): void
    {
        // Skip if nothing meaningful changed
        $dirty = $model->getDirty();
        unset($dirty['updated_at']);
        if (empty($dirty)) {
            return;
        }

        AuditService::log(
            $this->action($model, 'update'),
            $model,
            $this->meta($model, 'updated'),
            $this->resolveActor()?->id
        );
    }

    public function deleted(Model $model): void
    {
        AuditService::log(
            $this->action($model, 'delete'),
            $model,
            $this->meta($model, 'deleted'),
            $this->resolveActor()?->id
        );
    }
}
