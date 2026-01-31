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
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'guardian_name')) {
                $table->string('guardian_name')->nullable()->after('city');
            }
            if (!Schema::hasColumn('users', 'guardian_email')) {
                $table->string('guardian_email')->nullable()->after('guardian_name');
            }
            if (!Schema::hasColumn('users', 'guardian_contact_no')) {
                $table->string('guardian_contact_no', 20)->nullable()->after('guardian_email');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'guardian_contact_no')) {
                $table->dropColumn('guardian_contact_no');
            }
            if (Schema::hasColumn('users', 'guardian_email')) {
                $table->dropColumn('guardian_email');
            }
            if (Schema::hasColumn('users', 'guardian_name')) {
                $table->dropColumn('guardian_name');
            }
        });
    }
};
