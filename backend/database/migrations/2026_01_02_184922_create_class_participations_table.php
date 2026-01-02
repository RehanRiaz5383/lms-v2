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
        if (Schema::hasTable('class_participations')) {
            return;
        }
        
        Schema::create('class_participations', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->foreignId('batch_id')->constrained('batches')->onDelete('cascade');
            $table->foreignId('subject_id')->nullable()->constrained('subjects')->onDelete('cascade');
            $table->date('participation_date');
            $table->text('description')->nullable();
            $table->decimal('total_marks', 8, 2)->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('class_participations');
    }
};
