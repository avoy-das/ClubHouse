<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clubs', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->enum('category', [
                'Academic',
                'Technology',
                'Cultural',
                'Sports',
                'Arts & Media',
                'Business & Entrepreneurship',
                'Community Service',
                'Environment',
                'Health & Wellness',
                'Recreation & Hobby',
                'Other',
            ]);
            $table->text('description');
            $table->string('department');
            $table->string('contact_email');
            $table->string('contact_phone')->nullable();
            $table->string('logo_path')->nullable();
            $table->text('reason');
            $table->enum('status', ['pending', 'approved', 'rejected', 'suspended'])->default('pending');
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clubs');
    }
};