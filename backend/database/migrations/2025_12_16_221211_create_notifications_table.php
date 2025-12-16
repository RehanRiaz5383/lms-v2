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
        if (!Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id'); // User who receives the notification
                $table->string('type'); // Type of notification: task_assigned, grade_awarded, grade_updated, etc.
                $table->string('title'); // Notification title
                $table->text('message'); // Notification message
                $table->json('data')->nullable(); // Additional data (task_id, subject_id, marks, etc.)
                $table->boolean('read')->default(false); // Whether notification is read
                $table->timestamp('read_at')->nullable(); // When notification was read
                $table->timestamps();

                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->index(['user_id', 'read']);
                $table->index('created_at');
            });
        } else {
            // Table exists, add missing columns if needed
            Schema::table('notifications', function (Blueprint $table) {
                // Check if we need to add user_id (for Laravel's default structure with notifiable_id)
                if (!Schema::hasColumn('notifications', 'user_id') && Schema::hasColumn('notifications', 'notifiable_id')) {
                    // Add user_id column that maps to notifiable_id for User model
                    $table->unsignedBigInteger('user_id')->nullable()->after('id');
                    // We'll populate it via a separate update query
                }
                
                if (!Schema::hasColumn('notifications', 'type')) {
                    $table->string('type')->after('user_id');
                }
                if (!Schema::hasColumn('notifications', 'title')) {
                    $table->string('title')->after('type');
                }
                if (!Schema::hasColumn('notifications', 'message')) {
                    $table->text('message')->after('title');
                }
                if (!Schema::hasColumn('notifications', 'data')) {
                    $table->json('data')->nullable()->after('message');
                }
                if (!Schema::hasColumn('notifications', 'read')) {
                    $table->boolean('read')->default(false)->after('data');
                }
                if (!Schema::hasColumn('notifications', 'read_at')) {
                    $table->timestamp('read_at')->nullable()->after('read');
                }
            });

            // If user_id was just added, populate it from notifiable_id for User model
            if (Schema::hasColumn('notifications', 'user_id') && Schema::hasColumn('notifications', 'notifiable_id')) {
                DB::table('notifications')
                    ->where('notifiable_type', 'App\\Models\\User')
                    ->whereNull('user_id')
                    ->update(['user_id' => DB::raw('notifiable_id')]);
            }

            // Try to add indexes (will fail silently if they exist)
            try {
                Schema::table('notifications', function (Blueprint $table) {
                    $table->index(['user_id', 'read'], 'notifications_user_id_read_index');
                });
            } catch (\Exception $e) {
                // Index might already exist, ignore
            }
            
            try {
                Schema::table('notifications', function (Blueprint $table) {
                    $table->index('created_at', 'notifications_created_at_index');
                });
            } catch (\Exception $e) {
                // Index might already exist, ignore
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
