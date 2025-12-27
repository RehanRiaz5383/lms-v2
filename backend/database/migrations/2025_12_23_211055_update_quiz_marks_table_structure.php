<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Step 1: Change column types first (must be done before foreign keys)
        Schema::table('quiz_marks', function (Blueprint $table) {
            // Change quiz_id and student_id to unsignedBigInteger to match foreign key types
            // This MUST be done BEFORE adding foreign keys
            if (Schema::hasColumn('quiz_marks', 'quiz_id')) {
                // Change quiz_id from int to bigint UNSIGNED to match quizzes.id
                $table->unsignedBigInteger('quiz_id')->nullable()->change();
            }
            
            if (Schema::hasColumn('quiz_marks', 'student_id')) {
                // Change student_id from int to bigint UNSIGNED to match users.id
                $table->unsignedBigInteger('student_id')->nullable()->change();
            }
            
            // Change obtained_marks from varchar(255) to decimal(8,2) and make it NOT NULL
            if (Schema::hasColumn('quiz_marks', 'obtained_marks')) {
                // First, update any NULL values to 0
                DB::table('quiz_marks')->whereNull('obtained_marks')->update(['obtained_marks' => '0']);
                // Change column type
                $table->decimal('obtained_marks', 8, 2)->nullable(false)->change();
            }
        });
        
        // Step 2: Add new columns
        Schema::table('quiz_marks', function (Blueprint $table) {
            // Add total_marks column if it doesn't exist
            if (!Schema::hasColumn('quiz_marks', 'total_marks')) {
                $table->decimal('total_marks', 8, 2)->nullable()->after('obtained_marks');
            }
            
            // Add remarks column if it doesn't exist
            if (!Schema::hasColumn('quiz_marks', 'remarks')) {
                $table->text('remarks')->nullable()->after('total_marks');
            }
            
            // Add created_by column if it doesn't exist
            if (!Schema::hasColumn('quiz_marks', 'created_by')) {
                $table->unsignedBigInteger('created_by')->nullable()->after('remarks');
            }
        });
        
        // Step 3: Add foreign key constraints (after column types are fixed)
        Schema::table('quiz_marks', function (Blueprint $table) {
            // Add foreign key for created_by
            if (Schema::hasColumn('quiz_marks', 'created_by') && Schema::hasTable('users')) {
                $fkExists = DB::selectOne("
                    SELECT COUNT(*) as count
                    FROM information_schema.KEY_COLUMN_USAGE 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'quiz_marks' 
                    AND COLUMN_NAME = 'created_by' 
                    AND REFERENCED_TABLE_NAME = 'users'
                ");
                if (!$fkExists || $fkExists->count == 0) {
                    $table->foreign('created_by')->references('id')->on('users')->onDelete('restrict');
                }
            }
            
            // Add foreign key for quiz_id
            if (Schema::hasColumn('quiz_marks', 'quiz_id') && Schema::hasTable('quizzes')) {
                $fkExists = DB::selectOne("
                    SELECT COUNT(*) as count
                    FROM information_schema.KEY_COLUMN_USAGE 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'quiz_marks' 
                    AND COLUMN_NAME = 'quiz_id' 
                    AND REFERENCED_TABLE_NAME = 'quizzes'
                ");
                if (!$fkExists || $fkExists->count == 0) {
                    $table->foreign('quiz_id')->references('id')->on('quizzes')->onDelete('cascade');
                }
            }
            
            // Add foreign key for student_id
            if (Schema::hasColumn('quiz_marks', 'student_id') && Schema::hasTable('users')) {
                $fkExists = DB::selectOne("
                    SELECT COUNT(*) as count
                    FROM information_schema.KEY_COLUMN_USAGE 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'quiz_marks' 
                    AND COLUMN_NAME = 'student_id' 
                    AND REFERENCED_TABLE_NAME = 'users'
                ");
                if (!$fkExists || $fkExists->count == 0) {
                    $table->foreign('student_id')->references('id')->on('users')->onDelete('cascade');
                }
            }
        });
        
        // Step 4: Add unique constraint and remove batch_id
        Schema::table('quiz_marks', function (Blueprint $table) {
            // Add unique constraint on (quiz_id, student_id) if it doesn't exist
            $indexExists = DB::selectOne("
                SELECT COUNT(*) as count
                FROM information_schema.STATISTICS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'quiz_marks' 
                AND INDEX_NAME = 'quiz_marks_quiz_id_student_id_unique'
            ");
            if (!$indexExists || $indexExists->count == 0) {
                $table->unique(['quiz_id', 'student_id'], 'quiz_marks_quiz_id_student_id_unique');
            }
            
            // Remove batch_id column if it exists (not needed, quiz_id already links to quiz which has batch_id)
            if (Schema::hasColumn('quiz_marks', 'batch_id')) {
                $table->dropColumn('batch_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quiz_marks', function (Blueprint $table) {
            // Drop unique constraint
            $table->dropUnique('quiz_marks_quiz_id_student_id_unique');
            
            // Drop foreign keys
            if (Schema::hasColumn('quiz_marks', 'quiz_id')) {
                $table->dropForeign(['quiz_id']);
            }
            if (Schema::hasColumn('quiz_marks', 'student_id')) {
                $table->dropForeign(['student_id']);
            }
            if (Schema::hasColumn('quiz_marks', 'created_by')) {
                $table->dropForeign(['created_by']);
            }
            
            // Revert obtained_marks to varchar(255) nullable
            if (Schema::hasColumn('quiz_marks', 'obtained_marks')) {
                $table->string('obtained_marks', 255)->nullable()->change();
            }
            
            // Drop added columns
            if (Schema::hasColumn('quiz_marks', 'total_marks')) {
                $table->dropColumn('total_marks');
            }
            if (Schema::hasColumn('quiz_marks', 'remarks')) {
                $table->dropColumn('remarks');
            }
            if (Schema::hasColumn('quiz_marks', 'created_by')) {
                $table->dropColumn('created_by');
            }
            
            // Re-add batch_id if it was removed
            if (!Schema::hasColumn('quiz_marks', 'batch_id')) {
                $table->integer('batch_id')->nullable();
            }
        });
    }
};
