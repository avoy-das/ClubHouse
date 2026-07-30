<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('club_member_positions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('club_member_id')->constrained()->cascadeOnDelete();
            $table->foreignId('club_position_id')->constrained()->cascadeOnDelete();
            $table->timestamp('assigned_at')->useCurrent();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();

            $table->unique(['club_member_id', 'club_position_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('club_member_positions');
    }
};
