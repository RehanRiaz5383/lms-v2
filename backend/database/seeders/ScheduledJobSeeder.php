<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ScheduledJob;
use Carbon\Carbon;

class ScheduledJobSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Task Reminder Job (24 hours before deadline)
        $taskReminderJob = ScheduledJob::firstOrCreate(
            ['job_class' => 'TaskReminderJob'],
            [
                'name' => 'Task Reminder (24h)',
                'description' => 'Sends notifications and emails to students 24 hours before task deadline',
                'job_class' => 'TaskReminderJob',
                'schedule_type' => 'hourly', // Check every hour for tasks due in 24h
                'schedule_config' => null,
                'enabled' => true,
                'metadata' => [
                    'reminder_hours' => 24,
                ],
            ]
        );

        // Calculate next run time
        if (!$taskReminderJob->next_run_at) {
            $taskReminderJob->calculateNextRun();
            $taskReminderJob->save();
        }

        // Voucher Generation Job (Daily - generates vouchers 10 days before promise date)
        $voucherGenerationJob = ScheduledJob::firstOrCreate(
            ['job_class' => 'VoucherGenerationJob'],
            [
                'name' => 'Voucher Generation (Daily)',
                'description' => 'Generates fee vouchers for students 10 days before their promise date',
                'job_class' => 'VoucherGenerationJob',
                'schedule_type' => 'daily',
                'schedule_config' => null,
                'enabled' => true,
                'metadata' => [
                    'days_before' => 10,
                ],
            ]
        );

        // Calculate next run time
        if (!$voucherGenerationJob->next_run_at) {
            $voucherGenerationJob->calculateNextRun();
            $voucherGenerationJob->save();
        }

        // Voucher Overdue Notification Job (Daily - notifies students about crossed due dates)
        $voucherOverdueNotificationJob = ScheduledJob::firstOrCreate(
            ['job_class' => 'VoucherOverdueNotificationJob'],
            [
                'name' => 'Voucher Overdue Notification (Daily)',
                'description' => 'Sends notifications to students about vouchers with crossed due dates',
                'job_class' => 'VoucherOverdueNotificationJob',
                'schedule_type' => 'daily',
                'schedule_config' => null,
                'enabled' => true,
                'metadata' => [],
            ]
        );

        // Calculate next run time
        if (!$voucherOverdueNotificationJob->next_run_at) {
            $voucherOverdueNotificationJob->calculateNextRun();
            $voucherOverdueNotificationJob->save();
        }

        // Voucher Auto-Block Job (Daily at midnight - auto-blocks students after 3 days overdue)
        $voucherAutoBlockJob = ScheduledJob::firstOrCreate(
            ['job_class' => 'VoucherAutoBlockJob'],
            [
                'name' => 'Voucher Auto-Block (Daily at Midnight)',
                'description' => 'Auto-blocks students with vouchers overdue by 3+ days',
                'job_class' => 'VoucherAutoBlockJob',
                'schedule_type' => 'custom',
                'schedule_config' => [
                    'interval' => 1,
                    'unit' => 'day',
                    'time' => '00:00:00', // Midnight
                ],
                'enabled' => true,
                'metadata' => [
                    'overdue_days' => 3,
                ],
            ]
        );

        // Calculate next run time (midnight)
        if (!$voucherAutoBlockJob->next_run_at) {
            $nextMidnight = Carbon::now()->setTimezone('Asia/Karachi')->addDay()->startOfDay();
            $voucherAutoBlockJob->next_run_at = $nextMidnight;
            $voucherAutoBlockJob->save();
        }

        $this->command->info('Scheduled jobs seeded successfully!');
    }
}

