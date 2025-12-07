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
            // Store as integer (day of month: 1-31) instead of full date
            $table->tinyInteger('expected_fee_promise_date')->nullable()->after('fees')->comment('Day of month (1-31) for fee payment');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('expected_fee_promise_date');
        });
    }
};
