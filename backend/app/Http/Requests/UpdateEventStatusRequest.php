<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEventStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', 'in:draft,published,ongoing,completed,cancelled'],
        ];
    }

    public function messages(): array
    {
        return [
            'status.in' => 'Invalid status. Allowed values: draft, published, ongoing, completed, cancelled.',
        ];
    }
}