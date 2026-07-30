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
            'title'        => 'required|string|max:255',
            'description'  => 'nullable|string',
            'requirements' => 'nullable|string',
            'opens_at'     => 'required|date',
            'closes_at'    => 'required|date|after:opens_at',
            'status'       => 'nullable|in:draft,open,closed',
        ];
    }
}
