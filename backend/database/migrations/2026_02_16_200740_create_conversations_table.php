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
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_one_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('user_two_id')->nullable()->constrained('users')->onDelete('cascade');
            // For self-chat (notes), user_two_id will be null and user_one_id = user_two_id (same user)
            // For regular chat, user_one_id and user_two_id are different users
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();

            // Ensure unique conversation between two users
            // For self-chat, user_two_id is null, so we need a unique index on user_one_id where user_two_id is null
            // We'll handle this in the application logic since MySQL doesn't support partial unique indexes easily
            $table->unique(['user_one_id', 'user_two_id'], 'conversation_unique');
            
            // Index for faster queries
            $table->index('user_one_id');
            $table->index('user_two_id');
            $table->index('last_message_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
