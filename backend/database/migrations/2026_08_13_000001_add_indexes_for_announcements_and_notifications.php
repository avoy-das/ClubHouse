<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->index(['target_type', 'created_at']);
            $table->index(['is_pinned', 'created_at']);
            $table->index('posted_by');
            $table->index('target_user_id');
        });

        Schema::table('announcement_recipients', function (Blueprint $table) {
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('announcement_recipients', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
        });

        Schema::table('announcements', function (Blueprint $table) {
            $table->dropIndex(['target_type', 'created_at']);
            $table->dropIndex(['is_pinned', 'created_at']);
            $table->dropIndex(['posted_by']);
            $table->dropIndex(['target_user_id']);
        });
    }
};
