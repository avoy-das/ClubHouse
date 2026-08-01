<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('club_members', 'status')) {
            Schema::table('club_members', function (Blueprint $table) {
                $table->enum('status', ['active', 'inactive', 'removed'])->default('active')->after('role');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('club_members', 'status')) {
            Schema::table('club_members', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }
    }
};
