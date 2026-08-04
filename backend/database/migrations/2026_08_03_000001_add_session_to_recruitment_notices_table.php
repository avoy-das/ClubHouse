<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('recruitment_notices', function (Blueprint $table) {
            $table->string('session')->nullable()->after('title');
        });
    }

    public function down(): void
    {
        Schema::table('recruitment_notices', function (Blueprint $table) {
            $table->dropColumn('session');
        });
    }
};
