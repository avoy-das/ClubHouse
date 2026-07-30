<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreClubPositionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title'                     => 'required|string|max:255',
            'can_manage_members'       => 'boolean',
            'can_manage_events'        => 'boolean',
            'can_manage_announcements' => 'boolean',
            'can_manage_recruitment'   => 'boolean',
            'can_track_attendance'     => 'boolean',
            'is_default'               => 'boolean',
        ];
    }
}
