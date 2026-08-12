<?php

namespace App\Http\Requests;

use App\Services\AuditService;
use Illuminate\Contracts\Validation\Validator;
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
            'password'   => ['required', 'string', 'confirmed', \Illuminate\Validation\Rules\Password::min(8)->letters()->numbers()],
            'department' => ['required', 'string', 'max:255'],
            'session'    => ['nullable', 'integer', 'min:0', 'max:99'],
            'phone'      => ['nullable', 'string', 'max:20'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.ends_with' => 'Only official NSTU student emails (@student.nstu.edu.bd) are allowed to register.',
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        AuditService::log('auth.register.failed', null, [
            'name'       => $this->input('name'),
            'student_id' => $this->input('student_id'),
            'email'      => $this->input('email'),
            'department' => $this->input('department'),
            'ip'         => $this->ip(),
            'user_agent' => $this->userAgent(),
            'status'     => 'failed',
            'reason'     => 'Validation failed',
            'errors'     => $validator->errors()->toArray(),
        ]);

        parent::failedValidation($validator);
    }
}

