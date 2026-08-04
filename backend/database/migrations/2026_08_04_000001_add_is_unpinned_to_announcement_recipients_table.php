<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcement_recipients', function (Blueprint $table) {
            if (!Schema::hasColumn('announcement_recipients', 'is_unpinned')) {
                $table->boolean('is_unpinned')->default(false)->after('user_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('announcement_recipients', function (Blueprint $table) {
            if (Schema::hasColumn('announcement_recipients', 'is_unpinned')) {
                $table->dropColumn('is_unpinned');
            }
        });
    }
};
