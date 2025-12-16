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
        Schema::create('scheduled_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Job name (e.g., "Task Reminder 24h")
            $table->text('description')->nullable(); // Job description
            $table->string('job_class'); // Job class name (e.g., "TaskReminderJob")
            $table->string('schedule_type'); // daily, hourly, weekly, monthly, custom
            $table->json('schedule_config')->nullable(); // Additional schedule configuration
            $table->boolean('enabled')->default(true); // Enable/disable job
            $table->timestamp('last_run_at')->nullable(); // Last execution time
            $table->timestamp('next_run_at')->nullable(); // Next scheduled execution
            $table->json('metadata')->nullable(); // Additional job metadata
            $table->timestamps();
            
            $table->index(['enabled', 'next_run_at']);
            $table->index('schedule_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('scheduled_jobs');
    }
};
