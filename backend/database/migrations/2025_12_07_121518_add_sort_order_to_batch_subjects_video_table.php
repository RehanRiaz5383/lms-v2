<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('batch_subjects_video')) {
            Schema::table('batch_subjects_video', function (Blueprint $table) {
                if (!Schema::hasColumn('batch_subjects_video', 'sort_order')) {
                    $table->integer('sort_order')->default(0)->after('video_id');
                }
            });

            // Set initial sort_order for existing records
            DB::table('batch_subjects_video')
                ->whereNull('sort_order')
                ->update(['sort_order' => 0]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('batch_subjects_video')) {
            Schema::table('batch_subjects_video', function (Blueprint $table) {
                if (Schema::hasColumn('batch_subjects_video', 'sort_order')) {
                    $table->dropColumn('sort_order');
                }
            });
        }
    }
};
