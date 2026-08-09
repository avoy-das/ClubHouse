<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clubs', function (Blueprint $table) {
            if (!Schema::hasColumn('clubs', 'banner_path')) {
                $table->string('banner_path')->nullable()->after('logo_path');
            }
        });

        Schema::table('club_edit_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('club_edit_requests', 'banner_path')) {
                $table->string('banner_path')->nullable()->after('logo_path');
            }
        });
    }

    public function down(): void
    {
        Schema::table('clubs', function (Blueprint $table) {
            if (Schema::hasColumn('clubs', 'banner_path')) {
                $table->dropColumn('banner_path');
            }
        });

        Schema::table('club_edit_requests', function (Blueprint $table) {
            if (Schema::hasColumn('club_edit_requests', 'banner_path')) {
                $table->dropColumn('banner_path');
            }
        });
    }
};
