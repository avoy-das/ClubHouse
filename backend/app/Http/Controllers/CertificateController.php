<?php

namespace App\Http\Controllers;

use App\Models\Certificate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CertificateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $certificates = Certificate::whereHas('registration', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        })
        ->with(['registration.event.club'])
        ->latest('issued_at')
        ->get();

        return response()->json($certificates);
    }

    public function download(Request $request, Certificate $certificate): Response
    {
        $user = $request->user();
        $ownerId = $certificate->registration->user_id ?? null;

        if (!$user->is_admin && $user->id !== $ownerId) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $event = $certificate->registration->event;
        $userName  = htmlspecialchars($certificate->registration->user->name, ENT_QUOTES, 'UTF-8');
        $studentId = htmlspecialchars($certificate->registration->user->student_id, ENT_QUOTES, 'UTF-8');
        $clubName  = htmlspecialchars($event->club->name ?? 'ClubHouse', ENT_QUOTES, 'UTF-8');
        $eventTitle = htmlspecialchars($event->title, ENT_QUOTES, 'UTF-8');
        $certNumber = htmlspecialchars($certificate->certificate_number, ENT_QUOTES, 'UTF-8');

        // Generate dynamic HTML certificate for instant viewing/printing/downloading
        $html = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <title>Certificate of Participation - {$certNumber}</title>
            <style>
                body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f3f4f6; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
                .cert-card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 8px double #2563eb; width: 750px; text-align: center; position: relative; }
                .header { color: #1e3a8a; font-size: 28px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
                .subtitle { color: #4b5563; font-size: 16px; margin-top: 5px; }
                .recipient { font-size: 26px; font-weight: bold; color: #111827; margin: 25px 0 5px 0; border-bottom: 2px solid #2563eb; display: inline-block; padding-bottom: 4px; }
                .student-id { font-size: 14px; color: #6b7280; margin-bottom: 20px; }
                .text { font-size: 16px; color: #374151; line-height: 1.6; max-width: 600px; margin: 0 auto; }
                .event-title { font-weight: bold; color: #2563eb; }
                .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 13px; color: #6b7280; }
                .cert-no { font-family: monospace; font-size: 12px; background: #eff6ff; padding: 4px 8px; border-radius: 4px; color: #1d4ed8; }
            </style>
        </head>
        <body>
            <div class='cert-card'>
                <div class='header'>Certificate of Participation</div>
                <div class='subtitle'>This is proudly presented to</div>
                <div class='recipient'>{$userName}</div>
                <div class='student-id'>Student ID: {$studentId}</div>
                <div class='text'>
                    for successfully participating in the event <span class='event-title'>\"{$eventTitle}\"</span> 
                    organized by <strong>{$clubName}</strong> on " . $event->start_at->format('F j, Y') . ".
                </div>
                <div class='footer'>
                    <div>
                        <strong>Issued Date:</strong> " . $certificate->issued_at->format('M d, Y') . "
                    </div>
                    <div class='cert-no'>No: {$certNumber}</div>
                </div>
            </div>
            <script>window.onload = function() { window.print(); };</script>
        </body>
        </html>
        ";

        return response($html, 200, [
            'Content-Type' => 'text/html',
            'Content-Security-Policy' => "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data:;",
        ]);
    }
}
