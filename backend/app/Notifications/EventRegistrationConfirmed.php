<?php

namespace App\Notifications;

use App\Models\EventRegistration;
use Illuminate\Notifications\Notification;

class EventRegistrationConfirmed extends Notification
{
    public function __construct(public EventRegistration $registration) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'message'  => 'You have successfully registered for "' . $this->registration->event->title . '".',
            'event_id' => $this->registration->event_id,
        ];
    }
}