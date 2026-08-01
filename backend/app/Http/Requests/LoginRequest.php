<?php

namespace App\Http\Requests;

use App\Models\User;
use App\Services\AuditService;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'email'    => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        $email = $this->input('email');
        $user = $email ? User::where('email', strtolower($email))->first() : null;

        AuditService::log('auth.login.failed', $user, [
            'email'      => $email,
            'ip'         => $this->ip(),
            'user_agent' => $this->userAgent(),
            'status'     => 'failed',
            'reason'     => 'Validation failed',
            'errors'     => $validator->errors()->toArray(),
        ], $user?->id);

        parent::failedValidation($validator);
    }
}
