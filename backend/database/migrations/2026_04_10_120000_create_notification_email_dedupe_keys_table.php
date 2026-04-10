<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Short-lived keys so queue retries and overlapping crons do not send the same notification twice.
     */
    public function up(): void
    {
        Schema::create('notification_email_dedupe_keys', function (Blueprint $table) {
            $table->string('dedupe_key', 140)->primary();
            $table->timestamp('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_email_dedupe_keys');
    }
};
