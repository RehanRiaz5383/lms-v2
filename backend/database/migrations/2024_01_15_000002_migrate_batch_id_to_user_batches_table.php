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
        // Migrate existing batch_id from users table to user_batches table
        // Use Laravel's query builder for safer type handling
        $users = DB::table('users')
            ->whereNotNull('batch_id')
            ->where('batch_id', '!=', '')
            ->get();

        foreach ($users as $user) {
            // Convert batch_id to integer, skip if invalid
            $batchId = filter_var($user->batch_id, FILTER_VALIDATE_INT);
            
            if ($batchId === false || $batchId <= 0) {
                continue;
            }

            // Check if batch exists
            $batchExists = DB::table('batches')->where('id', $batchId)->exists();
            if (!$batchExists) {
                continue;
            }

            // Check if relationship already exists
            $exists = DB::table('user_batches')
                ->where('user_id', $user->id)
                ->where('batch_id', $batchId)
                ->exists();

            if (!$exists) {
                DB::table('user_batches')->insert([
                    'user_id' => $user->id,
                    'batch_id' => $batchId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Optionally, you can restore batch_id to users table
        // But we'll leave it empty as the new structure doesn't use batch_id
        DB::table('user_batches')->truncate();
    }
};

