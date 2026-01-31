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
        Schema::create('google_drive_folders', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // e.g., 'user_profile', 'task_files', 'submitted_tasks'
            $table->string('display_name'); // e.g., 'User Profile', 'Task Files', 'Submitted Tasks'
            $table->string('directory_path'); // e.g., 'lms/User_Profile', 'lms/Task_Files'
            $table->string('folder_id')->nullable(); // Google Drive folder ID
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('google_drive_folders');
    }
};
