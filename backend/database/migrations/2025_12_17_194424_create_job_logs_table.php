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
        Schema::create('job_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('scheduled_job_id')->constrained('scheduled_jobs')->onDelete('cascade');
            $table->string('job_name');
            $table->string('job_class');
            $table->enum('status', ['success', 'failed', 'running'])->default('running');
            $table->text('message')->nullable();
            $table->text('output')->nullable();
            $table->text('error')->nullable();
            $table->json('metadata')->nullable(); // Store additional data like counts, details, etc.
            $table->timestamp('started_at');
            $table->timestamp('completed_at')->nullable();
            $table->integer('execution_time_ms')->nullable(); // Execution time in milliseconds
            $table->timestamps();
            
            // Indexes for faster queries
            $table->index('scheduled_job_id');
            $table->index('status');
            $table->index('started_at');
            $table->index(['scheduled_job_id', 'started_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_logs');
    }
};
