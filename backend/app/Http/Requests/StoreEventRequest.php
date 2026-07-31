<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title'                 => 'required|string|max:255',
            'description'           => 'nullable|string',
            'venue'                 => 'nullable|string|max:255',
            'capacity'              => 'nullable|integer|min:1',
            'is_members_only'       => 'nullable|boolean',
            'start_at'              => 'required|date',
            'end_at'                => 'nullable|date|after:start_at',
            'registration_deadline' => 'nullable|date|before:start_at',
            'status'                => 'nullable|in:draft,published,ongoing,cancelled,completed',
        ];
    }
}
