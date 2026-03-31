<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('app_deploy_versions')) {
            return;
        }

        Schema::create('app_deploy_versions', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });

        DB::table('app_deploy_versions')->insert([
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('app_deploy_versions');
    }
};
