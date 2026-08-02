<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('club_members', function (Blueprint $table) {
            if (!Schema::hasColumn('club_members', 'status')) {
                $table->enum('status', ['active', 'inactive', 'removed'])->default('active');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('club_members', function (Blueprint $table) {
            if (Schema::hasColumn('club_members', 'status')) {
                $table->dropColumn('status');
            }
        });
    }
};
