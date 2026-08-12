<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('event_feedback') && !Schema::hasColumn('event_feedback', 'is_anonymous')) {
            Schema::table('event_feedback', function (Blueprint $table) {
                $table->boolean('is_anonymous')->default(false)->after('comment');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('event_feedback') && Schema::hasColumn('event_feedback', 'is_anonymous')) {
            Schema::table('event_feedback', function (Blueprint $table) {
                $table->dropColumn('is_anonymous');
            });
        }
    }
};
