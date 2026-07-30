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
            'title'                 => 'sometimes|required|string|max:255',
            'description'           => 'nullable|string',
            'venue'                 => 'nullable|string|max:255',
            'capacity'              => 'nullable|integer|min:1',
            'start_at'              => 'sometimes|required|date',
            'end_at'                => 'nullable|date',
            'registration_deadline' => 'nullable|date',
            'status'                => 'sometimes|in:draft,published,cancelled,completed',
        ];
    }
}
