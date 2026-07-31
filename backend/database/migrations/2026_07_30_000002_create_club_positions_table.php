<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('club_positions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('club_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->boolean('can_manage_members')->default(false);
            $table->boolean('can_manage_events')->default(false);
            $table->boolean('can_manage_announcements')->default(false);
            $table->boolean('can_manage_recruitment')->default(false);
            $table->boolean('can_track_attendance')->default(false);
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->unique(['club_id', 'title']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('club_positions');
    }
};
