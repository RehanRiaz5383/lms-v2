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
        Schema::table('quizzes', function (Blueprint $table) {
            // Add title column if it doesn't exist
            if (!Schema::hasColumn('quizzes', 'title')) {
                $table->string('title')->after('id');
            }
            
            // Add subject_id column if it doesn't exist (nullable for batch-level quizzes)
            if (!Schema::hasColumn('quizzes', 'subject_id')) {
                $table->unsignedBigInteger('subject_id')->nullable()->after('batch_id');
                // Add foreign key constraint if subjects table exists
                if (Schema::hasTable('subjects')) {
                    $table->foreign('subject_id')->references('id')->on('subjects')->onDelete('cascade');
                }
            }
            
            // Add created_by column if it doesn't exist
            if (!Schema::hasColumn('quizzes', 'created_by')) {
                $table->unsignedBigInteger('created_by')->nullable()->after('total_marks');
                // Add foreign key constraint if users table exists
                if (Schema::hasTable('users')) {
                    $table->foreign('created_by')->references('id')->on('users')->onDelete('restrict');
                }
            }
            
            // Change total_marks from int to decimal if it's currently int
            if (Schema::hasColumn('quizzes', 'total_marks')) {
                $table->decimal('total_marks', 8, 2)->nullable()->change();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quizzes', function (Blueprint $table) {
            // Drop foreign keys first
            if (Schema::hasColumn('quizzes', 'subject_id')) {
                $table->dropForeign(['subject_id']);
            }
            if (Schema::hasColumn('quizzes', 'created_by')) {
                $table->dropForeign(['created_by']);
            }
            
            // Drop columns
            if (Schema::hasColumn('quizzes', 'title')) {
                $table->dropColumn('title');
            }
            if (Schema::hasColumn('quizzes', 'subject_id')) {
                $table->dropColumn('subject_id');
            }
            if (Schema::hasColumn('quizzes', 'created_by')) {
                $table->dropColumn('created_by');
            }
            
            // Revert total_marks to int if needed (optional, as this might break existing data)
            // We'll leave it as decimal since it's better
        });
    }
};
