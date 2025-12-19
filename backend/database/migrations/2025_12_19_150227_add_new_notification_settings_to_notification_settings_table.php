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
        Schema::table('notification_settings', function (Blueprint $table) {
            $table->boolean('notify_on_new_signup')->default(false)->after('new_student_registration');
            $table->boolean('notify_on_payment_proof_submission')->default(false)->after('notify_on_new_signup');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notification_settings', function (Blueprint $table) {
            $table->dropColumn(['notify_on_new_signup', 'notify_on_payment_proof_submission']);
        });
    }
};
