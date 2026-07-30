<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title'     => 'sometimes|required|string|max:255',
            'body'      => 'sometimes|required|string',
            'is_pinned' => 'nullable|boolean',
        ];
    }
}
