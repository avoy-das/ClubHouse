<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_feedback', function (Blueprint $table) {
            $table->id();

            $table->foreignId('event_id')
                  ->constrained('events')
                  ->cascadeOnDelete();

            // Only registered attendees can submit — enforced at service layer,
            // but the FK here still points to users for integrity.
            $table->foreignId('user_id')
                  ->constrained('users')
                  ->cascadeOnDelete();

            // 1–5 star rating.
            $table->unsignedTinyInteger('rating')->nullable();

            $table->text('comment')->nullable();

            $table->timestamps();

            // One feedback entry per user per event.
            $table->unique(['event_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_feedback');
    }
};