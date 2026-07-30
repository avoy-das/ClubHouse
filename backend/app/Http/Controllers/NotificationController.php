<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NotificationController extends Controller
{
    // GET /notifications
    public function index(Request $request)
    {
        $notifications = $request->user()->notifications()->latest()->get()->map(function ($n) {
            return [
                'id'         => $n->id,
                'message'    => $n->data['message'],
                'data'       => $n->data,
                'read'       => !is_null($n->read_at),
                'created_at' => $n->created_at,
            ];
        });

        return response()->json($notifications);
    }

    // PUT /notifications/{id}/read
    public function markRead(Request $request, string $id)
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();

        return response()->json(['message' => 'Notification marked as read.']);
    }

    // PUT /notifications/read-all
    public function markAllRead(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['message' => 'All notifications marked as read.']);
    }
}