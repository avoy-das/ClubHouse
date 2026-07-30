<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();

            $table->foreignId('club_id')
                  ->constrained('clubs')
                  ->cascadeOnDelete();

            $table->foreignId('created_by')
                  ->constrained('users')
                  ->restrictOnDelete();

            $table->string('title');
            $table->text('description')->nullable();

            $table->enum('status', [
                'draft',
                'published',
                'ongoing',
                'completed',
                'cancelled',
            ])->default('draft');

            $table->enum('visibility', [
                'public',
                'members_only',
            ])->default('public');

            $table->enum('location_type', [
                'physical',
                'online',
            ]);

            // Physical: venue name/address. Online: meeting link.
            $table->string('location_value')->nullable();

            $table->dateTime('starts_at');
            $table->dateTime('ends_at');

            $table->unsignedInteger('capacity');

            // Soft conflict detection — no hard block, just data for the warning
            // Checked at the service layer, not enforced by DB constraint.

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};