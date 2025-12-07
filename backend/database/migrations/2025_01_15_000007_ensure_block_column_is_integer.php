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
     * This migration ensures the block column is properly set as integer
     * and defaults to 0 for existing users where block is NULL or not set.
     */
    public function up(): void
    {
        if (Schema::hasTable('users')) {
            // Update any NULL block values to 0 (active)
            DB::table('users')
                ->whereNull('block')
                ->update(['block' => 0]);
            
            // Ensure block column is integer type (if it's not already)
            Schema::table('users', function (Blueprint $table) {
                // If block column doesn't exist, create it
                if (!Schema::hasColumn('users', 'block')) {
                    $table->tinyInteger('block')->default(0)->after('user_type');
                } else {
                    // Modify existing column to ensure it's integer
                    $table->tinyInteger('block')->default(0)->change();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No need to reverse - this is a data integrity fix
    }
};

