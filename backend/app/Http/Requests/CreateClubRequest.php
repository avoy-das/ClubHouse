<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateClubRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'          => 'required|string|max:255|unique:clubs,name',
            'category'      => 'required|in:Academic,Technology,Cultural,Sports,Arts & Media,Business & Entrepreneurship,Community Service,Environment,Health & Wellness,Recreation & Hobby,Other',
            'description'   => 'required|string',
            'department'    => 'nullable|string|max:255',
            'contact_email' => 'required|email',
            'contact_phone' => 'nullable|string|max:20',
            'logo'          => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'banner'        => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'reason'        => 'required|string',
        ];
    }
}