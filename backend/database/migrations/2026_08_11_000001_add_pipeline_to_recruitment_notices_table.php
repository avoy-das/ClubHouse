<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('recruitment_notices', function (Blueprint $table) {
            $table->string('pipeline_template')->default('multi_stage')->after('custom_fields');
            $table->json('pipeline_stages')->nullable()->after('pipeline_template');
        });
    }

    public function down(): void
    {
        Schema::table('recruitment_notices', function (Blueprint $table) {
            $table->dropColumn(['pipeline_template', 'pipeline_stages']);
        });
    }
};
