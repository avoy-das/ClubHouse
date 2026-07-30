<?php

namespace App\Notifications;

use App\Models\Event;
use Illuminate\Notifications\Notification;

class EventStatusChanged extends Notification
{
    public function __construct(public Event $event, public string $oldStatus) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'message'  => 'The event "' . $this->event->title . '" status has changed from ' . $this->oldStatus . ' to ' . $this->event->status . '.',
            'event_id' => $this->event->id,
        ];
    }
}