<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * This migration adds new columns to videos table if it already exists.
     * If the table doesn't exist, the create_videos_table migration will handle it.
     */
    public function up(): void
    {
        if (Schema::hasTable('videos')) {
            Schema::table('videos', function (Blueprint $table) {
                // Add title if it doesn't exist
                if (!Schema::hasColumn('videos', 'title')) {
                    $table->string('title')->after('id');
                }
                
                // Add short_description if it doesn't exist
                if (!Schema::hasColumn('videos', 'short_description')) {
                    $table->text('short_description')->nullable()->after('title');
                }
                
                // Add source_type if it doesn't exist
                if (!Schema::hasColumn('videos', 'source_type')) {
                    $table->enum('source_type', ['internal', 'external'])->default('internal')->after('short_description');
                }
                
                // Add internal_path if it doesn't exist
                if (!Schema::hasColumn('videos', 'internal_path')) {
                    $table->string('internal_path')->nullable()->after('source_type');
                }
                
                // Add external_url if it doesn't exist
                if (!Schema::hasColumn('videos', 'external_url')) {
                    $table->text('external_url')->nullable()->after('internal_path');
                }
            });
            
            // Update existing records to have source_type = 'internal' by default
            DB::table('videos')
                ->whereNull('source_type')
                ->orWhere('source_type', '')
                ->update(['source_type' => 'internal']);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('videos')) {
            Schema::table('videos', function (Blueprint $table) {
                if (Schema::hasColumn('videos', 'source_type')) {
                    $table->dropColumn('source_type');
                }
                if (Schema::hasColumn('videos', 'internal_path')) {
                    $table->dropColumn('internal_path');
                }
                if (Schema::hasColumn('videos', 'external_url')) {
                    $table->dropColumn('external_url');
                }
                if (Schema::hasColumn('videos', 'short_description')) {
                    $table->dropColumn('short_description');
                }
            });
        }
    }
};
