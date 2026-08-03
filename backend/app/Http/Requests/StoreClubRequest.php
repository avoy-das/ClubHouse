<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreClubRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'        => 'required|string|max:255|unique:clubs,name',
            'description' => 'nullable|string',
            'category'            => 'nullable|string|in:Academic & Technology,Engineering,Cultural & Arts,Sports & Athletics,Social Services',
            'logo_path'           => 'nullable|string|max:255',
            'permission_document' => 'nullable|file|mimes:pdf,jpg,jpeg,png,doc,docx|max:10240',
        ];
    }
}
