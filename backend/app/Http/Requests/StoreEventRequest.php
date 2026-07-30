<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled in controller via club membership check
    }

    public function rules(): array
    {
        return [
            'club_id'        => ['required', 'integer', 'exists:clubs,id'],
            'title'          => ['required', 'string', 'max:255'],
            'description'    => ['nullable', 'string'],
            'visibility'     => ['required', 'in:public,members_only'],
            'location_type'  => ['required', 'in:physical,online'],
            'location_value' => ['nullable', 'string', 'max:500'],
            'starts_at'      => ['required', 'date', 'after:now'],
            'ends_at'        => ['required', 'date', 'after:starts_at'],
            'capacity'       => ['required', 'integer', 'min:1'],
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