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
        Schema::create('task_reminder_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('task_id'); // Task ID
            $table->unsignedBigInteger('student_id'); // Student ID
            $table->string('reminder_type')->default('24h'); // Type of reminder (24h, 12h, etc.)
            $table->timestamp('reminder_sent_at'); // When reminder was sent
            $table->boolean('notification_sent')->default(false); // UI notification sent
            $table->boolean('email_sent')->default(false); // Email sent
            $table->text('notes')->nullable(); // Additional notes
            $table->timestamps();
            
            // Ensure we only send one reminder per task per student per type
            $table->unique(['task_id', 'student_id', 'reminder_type']);
            $table->index(['task_id', 'student_id']);
            $table->index('reminder_sent_at');
            
            $table->foreign('task_id')->references('id')->on('tasks')->onDelete('cascade');
            $table->foreign('student_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_reminder_logs');
    }
};
