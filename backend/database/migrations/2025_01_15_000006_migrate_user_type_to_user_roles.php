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
        // Migrate existing user_type data to user_roles table
        $users = DB::table('users')->whereNotNull('user_type')->get();

        foreach ($users as $user) {
            // Validate user_type exists in user_types table
            $roleExists = DB::table('user_types')->where('id', $user->user_type)->exists();
            
            if ($roleExists) {
                // Check if relationship already exists
                $exists = DB::table('user_roles')
                    ->where('user_id', $user->id)
                    ->where('role_id', $user->user_type)
                    ->exists();

                if (!$exists) {
                    DB::table('user_roles')->insert([
                        'user_id' => $user->id,
                        'role_id' => $user->user_type,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration only migrates data, so we don't need to reverse it
        // The user_type column still exists in users table
    }
};

