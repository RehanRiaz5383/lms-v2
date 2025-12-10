<?php

namespace Database\Seeders;

use App\Models\UserType;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UserTypeSeeder extends Seeder
{
    /**
     * Seed the user types (roles) table.
     * This seeder ensures all required roles exist in the database.
     */
    public function run(): void
    {
        $roles = [
            ['id' => 1, 'title' => 'Admin'],
            ['id' => 2, 'title' => 'Student'],
            ['id' => 3, 'title' => 'Teacher'],
            ['id' => 4, 'title' => 'Class Representative (CR)'],
        ];

        foreach ($roles as $role) {
            // Check if role already exists
            $exists = DB::table('user_types')->where('id', $role['id'])->exists();
            
            if (!$exists) {
                // Insert new role
                DB::table('user_types')->insert([
                    'id' => $role['id'],
                    'title' => $role['title'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $this->command->info("Created role: {$role['title']}");
            } else {
                // Update existing role title if it doesn't match
                $existing = DB::table('user_types')->where('id', $role['id'])->first();
                if ($existing->title !== $role['title']) {
                    DB::table('user_types')
                        ->where('id', $role['id'])
                        ->update([
                            'title' => $role['title'],
                            'updated_at' => now(),
                        ]);
                    $this->command->info("Updated role: {$role['title']}");
                } else {
                    $this->command->info("Role already exists: {$role['title']}");
                }
            }
        }
    }
}

