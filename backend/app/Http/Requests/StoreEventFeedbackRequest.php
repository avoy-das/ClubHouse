<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEventFeedbackRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('comments') && !$this->has('comment')) {
            $this->merge([
                'comment' => $this->input('comments'),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'rating'   => 'required|integer|between:1,5',
            'comment'  => 'nullable|string|max:2000',
            'comments' => 'nullable|string|max:2000',
        ];
    }
}
