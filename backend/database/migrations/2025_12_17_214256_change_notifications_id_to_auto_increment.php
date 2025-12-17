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
        // Check if id column is char(36) (UUID type)
        $idColumnInfo = DB::select("SHOW COLUMNS FROM notifications WHERE Field = 'id'");
        
        if (isset($idColumnInfo[0])) {
            $idType = strtolower($idColumnInfo[0]->Type ?? '');
            
            // Only proceed if id is char/varchar (UUID type)
            if (strpos($idType, 'char') !== false || strpos($idType, 'varchar') !== false) {
                Schema::table('notifications', function (Blueprint $table) {
                    // Drop the existing primary key
                    $table->dropPrimary(['id']);
                });
                
                // Drop the old id column
                DB::statement('ALTER TABLE notifications DROP COLUMN id');
                
                // Add new auto-increment id column
                Schema::table('notifications', function (Blueprint $table) {
                    $table->id()->first(); // Add as first column
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Check if id column is bigint (auto-increment type)
        $idColumnInfo = DB::select("SHOW COLUMNS FROM notifications WHERE Field = 'id'");
        
        if (isset($idColumnInfo[0])) {
            $idType = strtolower($idColumnInfo[0]->Type ?? '');
            
            // Only proceed if id is bigint (auto-increment type)
            if (strpos($idType, 'bigint') !== false) {
                Schema::table('notifications', function (Blueprint $table) {
                    // Drop the existing primary key
                    $table->dropPrimary(['id']);
                });
                
                // Drop the old id column
                DB::statement('ALTER TABLE notifications DROP COLUMN id');
                
                // Add new char(36) id column
                Schema::table('notifications', function (Blueprint $table) {
                    $table->char('id', 36)->first(); // Add as first column
                });
                
                // Set as primary key
                DB::statement('ALTER TABLE notifications ADD PRIMARY KEY (id)');
            }
        }
    }
};
