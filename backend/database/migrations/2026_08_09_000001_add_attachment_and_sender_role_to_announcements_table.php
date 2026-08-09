<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->string('attachment_path')->nullable()->after('targets');
            $table->string('attachment_name')->nullable()->after('attachment_path');
            $table->string('sender_type')->default('admin')->after('attachment_name'); // 'admin' or 'club'
            $table->string('sender_role_label')->nullable()->after('sender_type'); // e.g. "Administrator", "President of Tech Club"
        });
    }

    public function down(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->dropColumn([
                'attachment_path',
                'attachment_name',
                'sender_type',
                'sender_role_label',
            ]);
        });
    }
};
