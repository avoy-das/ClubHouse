<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->email) {
            $this->merge([
                'email' => strtolower($this->email),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'name'       => ['required', 'string', 'max:255'],
            'student_id' => ['required', 'string', 'unique:users,student_id'],
            'email'      => ['required', 'email', 'ends_with:@student.nstu.edu.bd', 'unique:users,email'],
            'password'   => ['required', 'string', 'min:8', 'confirmed'],
            'department' => ['required', 'string', 'max:255'],
            'phone'      => ['nullable', 'string', 'max:20'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.ends_with' => 'Only official NSTU student emails (@student.nstu.edu.bd) are allowed to register.',
        ];
    }
}

