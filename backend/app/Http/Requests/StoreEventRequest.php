<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled in controller via club membership check
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('custom_fields') && is_string($this->custom_fields)) {
            $decoded = json_decode($this->custom_fields, true);
            if (is_array($decoded)) {
                $this->merge(['custom_fields' => $decoded]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'club_id'        => ['required', 'integer', 'exists:clubs,id'],
            'title'          => ['required', 'string', 'max:255'],
            'description'    => ['nullable', 'string', 'max:10000'],
            'banner'         => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'visibility'     => ['required', 'in:public,members_only'],
            'location_type'  => ['required', 'in:physical,online'],
            'location_value' => ['nullable', 'string', 'max:500'],
            'starts_at'      => ['required', 'date', 'after:now - 10 minutes'],
            'ends_at'        => ['required', 'date', 'after:starts_at'],
            'capacity'       => ['required', 'integer', 'min:1'],
            'custom_fields'             => ['nullable', 'array', 'max:20'],
            'custom_fields.*.label'     => ['required_with:custom_fields', 'string', 'max:255'],
            'custom_fields.*.type'      => ['required_with:custom_fields', 'string', 'in:text,textarea,select,checkbox,number'],
            'custom_fields.*.required'  => ['nullable', 'boolean'],
            'custom_fields.*.options'   => ['nullable', 'array'],
            'custom_fields.*.options.*' => ['string', 'max:255'],
            'status'          => ['nullable', 'string', 'in:draft,published,upcoming,ongoing,completed,cancelled'],
            'feedback_policy' => ['nullable', 'string', 'in:attended_only,registered_only,open_to_all'],
        ];
    }

    public function messages(): array
    {
        return [
            'starts_at.after' => 'Event start time must be in the future.',
            'ends_at.after'   => 'Event end time must be after the start time.',
            'capacity.min'    => 'Capacity must be at least 1.',
            'club_id.exists'  => 'The selected club does not exist.',
        ];
    }
}
