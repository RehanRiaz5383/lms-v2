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

        $this->command->info('Scheduled jobs seeded successfully!');
    }
}

