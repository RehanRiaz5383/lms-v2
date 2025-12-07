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
        if (!Schema::hasTable('videos')) {
            Schema::create('videos', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('short_description')->nullable(); // For keywords/search
                $table->enum('source_type', ['internal', 'external'])->default('internal');
                $table->string('internal_path')->nullable(); // Path for internal server videos
                $table->text('external_url')->nullable(); // URL for external videos
                $table->timestamps();
                $table->softDeletes();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('videos');
    }
};
