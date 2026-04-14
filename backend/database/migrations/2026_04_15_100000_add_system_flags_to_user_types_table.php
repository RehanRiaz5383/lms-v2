<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('user_types')) {
            return;
        }

        Schema::table('user_types', function (Blueprint $table) {
            if (! Schema::hasColumn('user_types', 'is_system')) {
                $table->boolean('is_system')->default(true)->after('title');
            }
            if (! Schema::hasColumn('user_types', 'slug')) {
                $table->string('slug', 64)->nullable()->unique()->after('is_system');
            }
        });

        $slugs = [1 => 'admin', 2 => 'student', 3 => 'teacher', 4 => 'class_representative'];
        foreach ($slugs as $id => $slug) {
            \Illuminate\Support\Facades\DB::table('user_types')->where('id', $id)->update([
                'is_system' => true,
                'slug' => $slug,
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('user_types')) {
            return;
        }

        Schema::table('user_types', function (Blueprint $table) {
            if (Schema::hasColumn('user_types', 'slug')) {
                $table->dropUnique(['slug']);
                $table->dropColumn('slug');
            }
            if (Schema::hasColumn('user_types', 'is_system')) {
                $table->dropColumn('is_system');
            }
        });
    }
};
