<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('recruitment_notices', function (Blueprint $table) {
            $table->index(['status', 'closes_at'], 'recruitment_notices_status_closes_index');
            $table->index(['club_id', 'status'], 'recruitment_notices_club_status_index');
        });

        Schema::table('recruitment_applications', function (Blueprint $table) {
            $table->index(['user_id', 'status'], 'recruitment_apps_user_status_index');
            $table->index(['recruitment_notice_id', 'status'], 'recruitment_apps_notice_status_index');
        });
    }

    public function down(): void
    {
        Schema::table('recruitment_notices', function (Blueprint $table) {
            $table->dropIndex('recruitment_notices_status_closes_index');
            $table->dropIndex('recruitment_notices_club_status_index');
        });

        Schema::table('recruitment_applications', function (Blueprint $table) {
            $table->dropIndex('recruitment_apps_user_status_index');
            $table->dropIndex('recruitment_apps_notice_status_index');
        });
    }
};
