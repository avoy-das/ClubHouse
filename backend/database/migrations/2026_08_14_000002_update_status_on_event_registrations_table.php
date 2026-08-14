<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_registrations', function (Blueprint $table) {
            // Re-assert status column exists with length 30 to accommodate 'registered', 'pending', 'approved', 'rejected', 'waitlisted'
            if (!Schema::hasColumn('event_registrations', 'status')) {
                $table->string('status', 30)->default('registered')->index();
            }
        });
    }

    public function down(): void
    {
        // Down migration kept safe
    }
};
