<?php

namespace App\Providers;

use App\Models\Club;
use App\Models\ClubMember;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\MembershipRequest;
use App\Models\ClubEditRequest;
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
        ]);

        // Explicit domain logging is handled via AuditService::log() in Controllers/Requests.
        // Universal Observer auto-registration is disabled to eliminate the Dual-Write bug.
    }
}
