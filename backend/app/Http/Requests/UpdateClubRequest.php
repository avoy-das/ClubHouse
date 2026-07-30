<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateClubRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'        => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'category'    => 'nullable|string|max:255',
            'logo_path'   => 'nullable|string|max:255',
            'status'      => 'sometimes|in:pending,approved,rejected,suspended',
        ];
    }
}
