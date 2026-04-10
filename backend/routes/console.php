<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Schema;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule queue processing for shared hosting
// This runs every minute and processes queued jobs
Schedule::command('queue:work --once --tries=3 --timeout=60')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground()
    ->onFailure(function () {
        \Log::error('Queue worker failed to run');
    });

// Truncate default application log so the file does not grow forever.
// Runs about every 5 days (03:15 on days 1, 6, 11, 16, 21, 26 of each month — standard cron */5 step on day-of-month).
Schedule::command('logs:clear-laravel')
    ->cron('15 3 */5 * *');

// Dedupe keys are hour-scoped; prune so the table does not grow without bound.
Schedule::call(function () {
    if (! Schema::hasTable('notification_email_dedupe_keys')) {
        return;
    }
    DB::table('notification_email_dedupe_keys')->where('created_at', '<', now()->subDays(14))->delete();
})->daily();
