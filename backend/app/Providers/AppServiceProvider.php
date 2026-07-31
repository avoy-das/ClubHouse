<?php

namespace App\Providers;

use App\Models\Club;
use App\Models\ClubMember;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\MembershipRequest;
use App\Models\User;
use App\Observers\AuditObserver;
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
        // Attach the universal audit observer to all key models.
        // Any create / update / delete on these will produce an audit_logs row.
        $models = [
            Event::class,
            Club::class,
            User::class,
            ClubMember::class,
            MembershipRequest::class,
            EventRegistration::class,
        ];

        foreach ($models as $model) {
            $model::observe(AuditObserver::class);
        }
    }
}
