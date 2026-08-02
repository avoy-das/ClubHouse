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
        Schema::table('announcements', function (Blueprint $table) {
            $table->json('targets')->nullable();
        });
        // Make club_id nullable safely
        \Illuminate\Support\Facades\DB::statement('ALTER TABLE announcements MODIFY club_id BIGINT UNSIGNED NULL');
    }

    public function down(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->dropColumn('targets');
        });
        \Illuminate\Support\Facades\DB::statement('ALTER TABLE announcements MODIFY club_id BIGINT UNSIGNED NOT NULL');
    }
};
