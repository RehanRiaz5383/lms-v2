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
        Schema::create('vouchers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->decimal('fee_amount', 10, 2);
            $table->date('due_date'); // The date when payment is due (e.g., 17th of month)
            $table->date('promise_date'); // The promise date from student (e.g., 17th of month)
            $table->enum('status', ['pending', 'submitted', 'approved', 'rejected'])->default('pending');
            $table->timestamp('submitted_at')->nullable(); // When student submits payment proof
            $table->timestamp('approved_at')->nullable(); // When admin approves
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('submission_file')->nullable(); // File path for payment proof
            $table->text('remarks')->nullable(); // Admin remarks
            $table->timestamps();
            
            $table->index(['student_id', 'status']);
            $table->index('due_date');
            $table->index('promise_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vouchers');
    }
};
