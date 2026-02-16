<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('chat_messages', function (Blueprint $table) {
            $table->string('attachment_path')->nullable()->after('message');
            $table->string('attachment_name')->nullable()->after('attachment_path');
            $table->string('attachment_type')->nullable()->after('attachment_name'); // MIME type
            $table->bigInteger('attachment_size')->nullable()->after('attachment_type'); // Size in bytes
            $table->string('google_drive_file_id')->nullable()->after('attachment_size');
            
            $table->index('attachment_path');
            $table->index('google_drive_file_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('chat_messages', function (Blueprint $table) {
            $table->dropIndex(['attachment_path']);
            $table->dropIndex(['google_drive_file_id']);
            $table->dropColumn([
                'attachment_path',
                'attachment_name',
                'attachment_type',
                'attachment_size',
                'google_drive_file_id',
            ]);
        });
    }
};
