<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->foreignId('club_id')->nullable()->change();
            $table->string('target_type')->default('all_users')->after('body');
            $table->foreignId('target_club_id')->nullable()->after('target_type')->constrained('clubs')->nullOnDelete();
            $table->foreignId('target_user_id')->nullable()->after('target_club_id')->constrained('users')->nullOnDelete();
        });

        Schema::create('announcement_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('announcement_id')->constrained('announcements')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['announcement_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcement_recipients');

        Schema::table('announcements', function (Blueprint $table) {
            $table->dropForeign(['target_user_id']);
            $table->dropColumn('target_user_id');
            $table->dropForeign(['target_club_id']);
            $table->dropColumn('target_club_id');
            $table->dropColumn('target_type');
        });
    }
};
