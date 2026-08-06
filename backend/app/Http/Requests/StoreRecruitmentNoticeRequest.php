<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRecruitmentNoticeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title'           => 'nullable|string|max:255',
            'session'         => 'required|string|max:100',
            'target_sessions' => 'nullable|array',
            'target_sessions.*' => 'integer|min:0|max:99',
            'description'     => 'nullable|string',
            'requirements'    => 'nullable|string',
            'custom_fields'   => 'nullable|array',
            'opens_at'        => 'required|date',
            'closes_at'       => 'required|date|after:opens_at',
            'status'          => 'nullable|in:draft,open,closed',
        ];
    }
}
