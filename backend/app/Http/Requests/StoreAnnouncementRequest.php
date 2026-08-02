<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title'     => 'required|string|max:255',
            'body'      => 'required|string',
            'is_pinned' => 'nullable|boolean',
            'targets'   => 'nullable|array',
            'targets.types' => 'nullable|array',
            'targets.types.*' => 'string|in:all_users,entire_club,single_user,single_club_member',
            'targets.user_ids' => 'nullable|array',
            'targets.user_ids.*' => 'integer|exists:users,id',
            'targets.club_ids' => 'nullable|array',
            'targets.club_ids.*' => 'integer|exists:clubs,id',
        ];
    }
}
