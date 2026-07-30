<?php

namespace App\Notifications;

use App\Models\Club;
use Illuminate\Notifications\Notification;

class ClubMembershipDecided extends Notification
{
    public function __construct(public Club $club, public string $decision) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $message = $this->decision === 'approved'
? 'Your club "' . $this->club->name . '" has been approved.'
: 'Your club "' . $this->club->name . '" has been rejected.';

        return [
            'message' => $message,
            'club_id' => $this->club->id,
        ];
    }
}