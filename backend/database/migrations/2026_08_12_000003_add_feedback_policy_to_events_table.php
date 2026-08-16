<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('events') && !Schema::hasColumn('events', 'feedback_policy')) {
            Schema::table('events', function (Blueprint $table) {
                $table->string('feedback_policy')->default('attended_only')->after('capacity');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('events') && Schema::hasColumn('events', 'feedback_policy')) {
            Schema::table('events', function (Blueprint $table) {
                $table->dropColumn('feedback_policy');
            });
        }
    }
};
