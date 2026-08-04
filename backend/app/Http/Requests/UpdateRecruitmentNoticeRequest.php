<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRecruitmentNoticeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title'         => 'sometimes|nullable|string|max:255',
            'session'       => 'nullable|string|max:100',
            'description'   => 'nullable|string',
            'requirements'  => 'nullable|string',
            'custom_fields' => 'nullable|array',
            'opens_at'      => 'sometimes|required|date',
            'closes_at'     => 'sometimes|required|date',
            'status'        => 'sometimes|in:draft,open,closed',
        ];
    }
}
