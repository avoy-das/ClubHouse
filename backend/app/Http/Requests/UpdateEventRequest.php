<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title'          => ['sometimes', 'string', 'max:255'],
            'description'    => ['sometimes', 'nullable', 'string'],
            'banner'         => ['sometimes', 'nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'visibility'     => ['sometimes', 'in:public,members_only'],
            'location_type'  => ['sometimes', 'in:physical,online'],
            'location_value' => ['sometimes', 'nullable', 'string', 'max:500'],
            'starts_at'      => ['sometimes', 'date', 'after:now'],
            'ends_at'        => ['sometimes', 'date', 'after:starts_at'],
            'capacity'       => ['sometimes', 'integer', 'min:1'],
            'status'         => ['sometimes', 'string', 'in:draft,published,upcoming,ongoing,completed,cancelled'],
        ];
    }

    public function messages(): array
    {
        return [
            'starts_at.after' => 'Event start time must be in the future.',
            'ends_at.after'   => 'Event end time must be after the start time.',
            'capacity.min'    => 'Capacity must be at least 1.',
        ];
    }
}
