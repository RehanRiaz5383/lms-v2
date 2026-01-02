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
        if (Schema::hasTable('class_participation_marks')) {
            return;
        }
        
        Schema::create('class_participation_marks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_participation_id')->constrained('class_participations')->onDelete('cascade');
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->decimal('obtained_marks', 8, 2)->default(0);
            $table->decimal('total_marks', 8, 2)->nullable();
            $table->text('remarks')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            
            // Ensure one mark per student per class participation
            $table->unique(['class_participation_id', 'student_id'], 'cp_marks_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('class_participation_marks');
    }
};
