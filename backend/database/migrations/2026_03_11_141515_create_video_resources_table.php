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
        if (Schema::hasTable('video_resources')) {
            return;
        }
        Schema::create('video_resources', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('video_id');
            $table->string('file_path'); // Path stored for Google Drive (e.g. lms/resources/xxx.zip)
            $table->string('original_name')->nullable(); // Original filename for display
            $table->timestamps();

            $table->index('video_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('video_resources');
    }
};
