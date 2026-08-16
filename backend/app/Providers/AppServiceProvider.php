<?php

namespace App\Providers;

use App\Models\Announcement;
use App\Models\Club;
use App\Models\ClubEditRequest;
use App\Models\ClubGallery;
use App\Models\ClubMember;
use App\Models\ClubMemberPosition;
use App\Models\ClubPosition;
use App\Models\Event;
use App\Models\EventFeedback;
use App\Models\EventRegistration;
use App\Models\MembershipRequest;
use App\Models\Notification;
use App\Models\RecruitmentApplication;
use App\Models\RecruitmentNotice;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \Illuminate\Support\Facades\RateLimiter::for('login', function (\Illuminate\Http\Request $request) {
            $email = strtolower($request->input('email', ''));
            return [
                \Illuminate\Cache\RateLimiting\Limit::perMinute(5)->by($email . '|' . $request->ip()),
                \Illuminate\Cache\RateLimiting\Limit::perMinute(30)->by($request->ip()),
            ];
        });

        \Illuminate\Support\Facades\RateLimiter::for('register', function (\Illuminate\Http\Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(3)->by($request->ip());
        });

        \Illuminate\Support\Facades\RateLimiter::for('change-password', function (\Illuminate\Http\Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(5)->by($request->user()?->id ?: $request->ip());
        });

        \Illuminate\Support\Facades\RateLimiter::for('password-reset', function (\Illuminate\Http\Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(5)->by($request->ip());
        });

        \Illuminate\Auth\Notifications\ResetPassword::createUrlUsing(function (User $user, string $token) {
            $frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');
            return $frontendUrl . '/reset-password?token=' . $token . '&email=' . urlencode($user->email);
        });

        // Define explicit morph map for stable audit target_type strings across class refactors
        Relation::morphMap([
            'Club'                   => Club::class,
            'Event'                  => Event::class,
            'User'                   => User::class,
            'ClubMember'             => ClubMember::class,
            'MembershipRequest'      => MembershipRequest::class,
            'EventRegistration'      => EventRegistration::class,
            'RecruitmentNotice'      => RecruitmentNotice::class,
            'RecruitmentApplication' => RecruitmentApplication::class,
            'ClubEditRequest'        => ClubEditRequest::class,
            'EventFeedback'          => EventFeedback::class,
            'Announcement'           => Announcement::class,
            'ClubGallery'            => ClubGallery::class,
            'ClubMemberPosition'     => ClubMemberPosition::class,
            'ClubPosition'           => ClubPosition::class,
            'Notification'           => Notification::class,
        ]);

        // Explicit domain logging is handled via AuditService::log() in Controllers/Requests.
        // Universal Observer auto-registration is disabled to eliminate the Dual-Write bug.
    }
}
