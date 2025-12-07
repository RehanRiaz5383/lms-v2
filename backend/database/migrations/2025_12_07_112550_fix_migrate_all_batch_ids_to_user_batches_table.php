<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * This migration fixes the previous migration by handling:
     * 1. Comma-separated batch_id values (e.g., "25,26")
     * 2. String batch_id values that need conversion
     * 3. All users that still have batch_id in the users table
     */
    public function up(): void
    {
        // Get all users that still have batch_id set
        $users = DB::table('users')
            ->whereNotNull('batch_id')
            ->where('batch_id', '!=', '')
            ->get();

        $migrated = 0;
        $skipped = 0;

        foreach ($users as $user) {
            $batchIdValue = trim($user->batch_id);
            
            // Skip if empty
            if (empty($batchIdValue)) {
                $skipped++;
                continue;
            }

            // Handle comma-separated values (e.g., "25,26" or "25, 26")
            $batchIds = [];
            if (strpos($batchIdValue, ',') !== false) {
                // Split by comma and process each
                $parts = explode(',', $batchIdValue);
                foreach ($parts as $part) {
                    $part = trim($part);
                    $batchId = filter_var($part, FILTER_VALIDATE_INT);
                    if ($batchId !== false && $batchId > 0) {
                        $batchIds[] = $batchId;
                    }
                }
            } else {
                // Single value - try to convert to integer
                $batchId = filter_var($batchIdValue, FILTER_VALIDATE_INT);
                if ($batchId !== false && $batchId > 0) {
                    $batchIds[] = $batchId;
                }
            }

            // Process each batch_id
            foreach ($batchIds as $batchId) {
                // Check if batch exists (including soft-deleted ones)
                $batchExists = DB::table('batches')
                    ->where('id', $batchId)
                    ->exists();
                
                if (!$batchExists) {
                    \Log::warning("Skipping batch_id migration for user ID {$user->id}: batch ID {$batchId} does not exist in batches table.");
                    $skipped++;
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
                    $migrated++;
                }
            }
        }

        \Log::info("Batch ID migration completed: {$migrated} relationships created, {$skipped} skipped.");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration only adds data, so down() doesn't need to do anything
        // The data will remain in user_batches table
    }
};
