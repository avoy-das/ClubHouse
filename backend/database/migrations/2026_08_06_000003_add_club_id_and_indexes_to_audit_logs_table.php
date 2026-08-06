<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('audit_logs') && !Schema::hasColumn('audit_logs', 'club_id')) {
            Schema::table('audit_logs', function (Blueprint $table) {
                $table->foreignId('club_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
                $table->index('club_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('audit_logs') && Schema::hasColumn('audit_logs', 'club_id')) {
            Schema::table('audit_logs', function (Blueprint $table) {
                $table->dropForeign(['club_id']);
                $table->dropColumn('club_id');
            });
        }
    }
};
