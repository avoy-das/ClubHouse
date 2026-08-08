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
        $clubParam = $this->route('club');
        $clubId = $clubParam instanceof \App\Models\Club ? $clubParam->id : $clubParam;

        return [
            'name'          => 'sometimes|string|max:255|unique:clubs,name,' . $clubId,
            'category'      => 'sometimes|in:Academic,Technology,Cultural,Sports,Arts & Media,Business & Entrepreneurship,Community Service,Environment,Health & Wellness,Recreation & Hobby,Other',
            'description'   => 'sometimes|string',
            'department'    => 'nullable|string|max:255',
            'contact_email' => 'sometimes|email',
            'contact_phone' => 'nullable|string|max:20',
            'logo'          => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'banner'        => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'reason'        => 'sometimes|string',
        ];
    }
}
