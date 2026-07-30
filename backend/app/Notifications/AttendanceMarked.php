<?php

namespace App\Notifications;

use App\Models\EventRegistration;
use Illuminate\Notifications\Notification;

class AttendanceMarked extends Notification
{
    public function __construct(public EventRegistration $registration) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'message'  => 'Your attendance for "' . $this->registration->event->title . '" has been marked.',
            'event_id' => $this->registration->event_id,
        ];
    }
}