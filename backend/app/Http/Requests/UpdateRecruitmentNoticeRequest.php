<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRecruitmentNoticeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('custom_fields') && is_string($this->custom_fields)) {
            $decoded = json_decode($this->custom_fields, true);
            if (is_array($decoded)) {
                $this->merge(['custom_fields' => $decoded]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'title'             => 'sometimes|nullable|string|max:255',
            'session'           => 'sometimes|required|string|max:100',
            'target_sessions'   => 'nullable|array',
            'target_sessions.*' => 'integer|min:0|max:99',
            'description'       => 'nullable|string',
            'requirements'      => 'nullable|string',
            'custom_fields'             => 'sometimes|nullable|array|max:20',
            'custom_fields.*.label'     => 'required_with:custom_fields|string|max:255',
            'custom_fields.*.type'      => 'required_with:custom_fields|string|in:text,textarea,select,checkbox,number',
            'custom_fields.*.required'  => 'nullable|boolean',
            'custom_fields.*.options'   => 'nullable|array',
            'custom_fields.*.options.*' => 'string|max:255',
            'pipeline_template' => 'nullable|string|in:simple,standard,multi_stage,custom',
            'pipeline_stages'   => 'nullable|array|min:1|max:5',
            'pipeline_stages.*.key'   => 'required_with:pipeline_stages|string|max:50',
            'pipeline_stages.*.label' => 'required_with:pipeline_stages|string|max:100',
            'opens_at'          => 'sometimes|required|date',
            'closes_at'         => 'sometimes|required|date',
            'status'            => 'sometimes|in:draft,open,closed',
        ];
    }
}
