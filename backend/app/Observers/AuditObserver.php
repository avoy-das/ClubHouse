<?php

namespace App\Observers;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

/**
 * A universal Eloquent observer that automatically writes an audit log entry
 * whenever a watched model is created, updated, or deleted.
 *
 * Register it in AppServiceProvider::boot() for each model you want to track.
 */
class AuditObserver
{
    /**
     * Derive a short, human-readable action string from the model class and event.
     *  e.g.  App\Models\Event  + 'created'  →  'create_event'
     */
    protected function action(Model $model, string $event): string
    {
        $shortClass = class_basename($model);
        // Convert CamelCase to snake_case
        $snake = strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $shortClass));
        return "{$event}_{$snake}";
    }

    /**
     * Build a compact metadata snapshot for the log entry.
     * For updates we include only the changed fields (dirty) and their old values.
     */
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

        // Attach a human-readable label if the model has a name/title field
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

    // ---------------------------------------------------------------

    public function created(Model $model): void
    {
        AuditLog::record(
            $this->resolveActor(),
            $this->action($model, 'create'),
            $model,
            $this->meta($model, 'created')
        );
    }

    public function updated(Model $model): void
    {
        // Skip if nothing meaningful changed (e.g. only timestamps)
        $dirty = $model->getDirty();
        unset($dirty['updated_at']);
        if (empty($dirty)) {
            return;
        }

        AuditLog::record(
            $this->resolveActor(),
            $this->action($model, 'update'),
            $model,
            $this->meta($model, 'updated')
        );
    }

    public function deleted(Model $model): void
    {
        AuditLog::record(
            $this->resolveActor(),
            $this->action($model, 'delete'),
            $model,
            $this->meta($model, 'deleted')
        );
    }
}
