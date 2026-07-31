<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('club_positions', function (Blueprint $table) {
            $table->boolean('is_executive')->default(false)->after('title');
        });

        // Set President, Vice President, and Event Manager as executive roles
        DB::table('club_positions')
            ->whereIn('title', ['President', 'Vice President', 'Event Manager'])
            ->update(['is_executive' => true, 'can_manage_events' => true]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('club_positions', function (Blueprint $table) {
            $table->dropColumn('is_executive');
        });
    }
};
