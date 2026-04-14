<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nav_permissions', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 128)->unique();
            $table->string('label', 255);
            $table->string('route_path', 255)->nullable()->comment('Primary dashboard path for this item');
            $table->string('audience', 32)->default('admin')->comment('admin|student|teacher — for seeding / docs');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('user_type_nav_permission', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_type_id')->constrained('user_types')->cascadeOnDelete();
            $table->foreignId('nav_permission_id')->constrained('nav_permissions')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_type_id', 'nav_permission_id'], 'user_type_nav_perm_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_type_nav_permission');
        Schema::dropIfExists('nav_permissions');
    }
};
