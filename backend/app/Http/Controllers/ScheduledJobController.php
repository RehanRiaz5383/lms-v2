<?php

namespace App\Http\Controllers;

use App\Models\ScheduledJob;
use App\Models\JobLog;
use App\Models\Voucher;
use App\Models\User;
use App\Mail\TaskReminderMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class ScheduledJobController extends ApiController
{
    /**
     * Current job log reference for use in job execution methods
     * @var JobLog|null
     */
    private $currentJobLog = null;

    /**
     * Execute scheduled jobs (called by cron)
     * This endpoint should be called periodically (e.g., every hour or every 5 minutes)
     */
    public function execute(): JsonResponse
    {
        try {
            $jobs = ScheduledJob::where('enabled', true)
                ->where(function ($query) {
                    $query->whereNull('next_run_at')
                        ->orWhere('next_run_at', '<=', now());
                })
                ->get();

            $executed = [];
            $errors = [];

            foreach ($jobs as $job) {
                $jobLog = null;
                $startTime = microtime(true);
                
                try {
                    // Create job log entry
                    $jobLog = JobLog::create([
                        'scheduled_job_id' => $job->id,
                        'job_name' => $job->name,
                        'job_class' => $job->job_class,
                        'status' => 'running',
                        'started_at' => now(),
                    ]);

                    // Execute the job based on job_class (pass job log for metadata tracking)
                    $this->executeJob($job, $jobLog);
                    
                    // Calculate execution time
                    $executionTime = (microtime(true) - $startTime) * 1000; // Convert to milliseconds
                    
                    // Update last_run_at and calculate next_run_at
                    $job->last_run_at = now();
                    $job->calculateNextRun();
                    $job->save();

                    // Refresh job log to get any metadata updates from job execution
                    $jobLog->refresh();
                    
                    // Update job log with success (preserve any metadata set by job execution)
                    $updateData = [
                        'status' => 'success',
                        'completed_at' => now(),
                        'execution_time_ms' => (int) $executionTime,
                    ];
                    
                    // Only set default message if not already set by job execution
                    if (!$jobLog->message) {
                        $updateData['message'] = 'Job executed successfully';
                    }
                    
                    $jobLog->update($updateData);
                    
                    // Clear current job log reference
                    $this->currentJobLog = null;

                    $executed[] = [
                        'id' => $job->id,
                        'name' => $job->name,
                        'status' => 'success',
                    ];
                } catch (\Exception $e) {
                    // Calculate execution time even on failure
                    $executionTime = (microtime(true) - $startTime) * 1000;
                    
                    $errorMessage = $e->getMessage();
                    $errorTrace = $e->getTraceAsString();
                    
                    Log::error("Scheduled job execution failed: {$job->name}", [
                        'job_id' => $job->id,
                        'error' => $errorMessage,
                        'trace' => $errorTrace,
                    ]);

                    // Update job log with failure
                    if ($jobLog) {
                        $jobLog->update([
                            'status' => 'failed',
                            'message' => 'Job execution failed',
                            'error' => $errorMessage,
                            'output' => $errorTrace,
                            'completed_at' => now(),
                            'execution_time_ms' => (int) $executionTime,
                        ]);
                    } else {
                        // Create log entry if it wasn't created before exception
                        JobLog::create([
                            'scheduled_job_id' => $job->id,
                            'job_name' => $job->name,
                            'job_class' => $job->job_class,
                            'status' => 'failed',
                            'message' => 'Job execution failed',
                            'error' => $errorMessage,
                            'output' => $errorTrace,
                            'started_at' => now(),
                            'completed_at' => now(),
                            'execution_time_ms' => (int) $executionTime,
                        ]);
                    }

                    $errors[] = [
                        'id' => $job->id,
                        'name' => $job->name,
                        'error' => $errorMessage,
                    ];
                }
            }

            return $this->success([
                'executed' => $executed,
                'errors' => $errors,
                'total' => count($executed),
                'timestamp' => now()->toDateTimeString(),
            ], 'Scheduled jobs executed');
        } catch (\Exception $e) {
            Log::error('Scheduled job execution error: ' . $e->getMessage());
            return $this->error($e->getMessage(), 'Failed to execute scheduled jobs', 500);
        }
    }

    /**
     * Execute a specific job based on job_class
     */
    private function executeJob(ScheduledJob $job, JobLog $jobLog = null): void
    {
        // Store job log reference for use in job execution methods
        $previousJobLog = $this->currentJobLog;
        $this->currentJobLog = $jobLog;
        
        try {
            switch ($job->job_class) {
                case 'TaskReminderJob':
                    $this->executeTaskReminderJob($job);
                    break;
                case 'VoucherGenerationJob':
                    $this->executeVoucherGenerationJob($job);
                    break;
                case 'VoucherOverdueNotificationJob':
                    $this->executeVoucherOverdueNotificationJob($job);
                    break;
                case 'VoucherAutoBlockJob':
                    $this->executeVoucherAutoBlockJob($job);
                    break;
                default:
                    throw new \Exception("Unknown job class: {$job->job_class}");
            }
        } finally {
            // Restore previous job log reference
            $this->currentJobLog = $previousJobLog;
        }
    }

    /**
     * Execute Task Reminder Job (24 hours before deadline)
     */
    private function executeTaskReminderJob(ScheduledJob $job): void
    {
        $reminderHours = $job->metadata['reminder_hours'] ?? 24;
        
        // Get all pending tasks with expiry_date exactly in $reminderHours (with 1 hour window)
        $now = now()->setTimezone('Asia/Karachi');
        $targetTimeStart = $now->copy()->addHours($reminderHours)->startOfHour();
        $targetTimeEnd = $targetTimeStart->copy()->addHour();
        
        // Get tasks that expire within the target window (e.g., 24h ± 1 hour)
        $tasks = DB::table('tasks')
            ->whereNotNull('expiry_date')
            ->whereBetween('expiry_date', [
                $targetTimeStart->format('Y-m-d H:i:s'),
                $targetTimeEnd->format('Y-m-d H:i:s')
            ])
            ->get();

        if ($tasks->isEmpty()) {
            Log::info("No tasks found for reminder (24h before deadline)");
            return;
        }

        $notifiedCount = 0;
        $emailCount = 0;

        foreach ($tasks as $task) {
            // Get students assigned to this task's batch
            $batchId = $task->batch_id ?? null;
            
            if (!$batchId) {
                continue;
            }

            // Get students in this batch
            $studentIds = DB::table('user_batches')
                ->where('batch_id', $batchId)
                ->pluck('user_id')
                ->toArray();

            if (empty($studentIds)) {
                continue;
            }

            // Get submitted task IDs to exclude already submitted tasks
            $submittedTaskIds = DB::table('submitted_tasks')
                ->where('task_id', $task->id)
                ->pluck('student_id')
                ->toArray();

            foreach ($studentIds as $studentId) {
                // Skip if task is already submitted
                if (in_array($studentId, $submittedTaskIds)) {
                    continue;
                }

                // Check if reminder was already sent (bookkeeping)
                $reminderType = "{$reminderHours}h";
                if (\App\Models\TaskReminderLog::wasSent($task->id, $studentId, $reminderType)) {
                    continue; // Already sent, skip
                }

                try {
                    // Send notification and queue email
                    $this->sendTaskReminder($task, $studentId, $reminderHours);
                    
                    // Log the reminder (email is queued, so mark as queued)
                    \App\Models\TaskReminderLog::create([
                        'task_id' => $task->id,
                        'student_id' => $studentId,
                        'reminder_type' => $reminderType,
                        'reminder_sent_at' => now(),
                        'notification_sent' => true,
                        'email_sent' => true, // Email is queued successfully
                    ]);

                    $notifiedCount++;
                    $emailCount++; // Email queued successfully
                } catch (\Exception $e) {
                    Log::error("Failed to send reminder for task {$task->id} to student {$studentId}: " . $e->getMessage());
                }
            }
        }

        $metadata = [
            'tasks_processed' => $tasks->count(),
            'notifications_sent' => $notifiedCount,
            'emails_sent' => $emailCount,
        ];

        Log::info("Task reminder job completed", $metadata);
        
        // Store metadata in job log if available
        if (isset($this->currentJobLog)) {
            $this->currentJobLog->update([
                'metadata' => $metadata,
                'message' => "Processed {$tasks->count()} tasks, sent {$notifiedCount} notifications and {$emailCount} emails",
            ]);
        }
    }

    /**
     * Send task reminder (notification + email)
     */
    private function sendTaskReminder($task, int $studentId, int $reminderHours): void
    {
        $student = \App\Models\User::find($studentId);
        if (!$student) {
            return;
        }

        // Get task details
        $taskTitle = $task->title ?? 'Task';
        $expiryDate = \Carbon\Carbon::parse($task->expiry_date)->setTimezone('Asia/Karachi');
        $formattedDate = $expiryDate->format('M d, Y h:i A');

        // Create UI notification
        $this->createTaskReminderNotification($studentId, $task, $reminderHours, $formattedDate);

        // Send email
        $this->sendTaskReminderEmail($student, $task, $reminderHours, $formattedDate);
    }

    /**
     * Create UI notification for task reminder
     */
    private function createTaskReminderNotification(int $studentId, $task, int $reminderHours, string $formattedDate): void
    {
        try {
            if (!DB::getSchemaBuilder()->hasTable('notifications')) {
                return;
            }

            $taskTitle = $task->title ?? 'Task';

            // Check which column structure exists
            $hasUserIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'user_id');
            $hasNotifiableIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'notifiable_id');
            $hasIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'id');

            $notificationData = [];

            // Set ID only if it's a UUID column (not auto-increment)
            if ($hasIdColumn && !DB::getSchemaBuilder()->getColumnType('notifications', 'id') === 'bigint') {
                $notificationData['id'] = \Illuminate\Support\Str::uuid()->toString();
            }

            // If both columns exist, set both
            if ($hasUserIdColumn && $hasNotifiableIdColumn) {
                $notificationData['user_id'] = $studentId;
                $notificationData['notifiable_id'] = $studentId;
                $notificationData['notifiable_type'] = 'App\\Models\\User';
            } else if ($hasUserIdColumn) {
                $notificationData['user_id'] = $studentId;
            } else if ($hasNotifiableIdColumn) {
                $notificationData['notifiable_id'] = $studentId;
                $notificationData['notifiable_type'] = 'App\\Models\\User';
            }

            $notificationData['type'] = 'task_reminder';
            $notificationData['title'] = "Task Reminder: {$reminderHours} Hours Remaining";
            $notificationData['message'] = "Your task '{$taskTitle}' is due in {$reminderHours} hours (Due: {$formattedDate}). Please submit it before the deadline.";
            $notificationData['data'] = json_encode([
                'task_id' => $task->id,
                'reminder_hours' => $reminderHours,
                'expiry_date' => $task->expiry_date,
            ]);
            $notificationData['read'] = false;
            $notificationData['read_at'] = null;
            $notificationData['created_at'] = now();
            $notificationData['updated_at'] = now();

            DB::table('notifications')->insert($notificationData);
        } catch (\Exception $e) {
            Log::error("Failed to create task reminder notification for student {$studentId}: " . $e->getMessage());
        }
    }

    /**
     * Create UI notification for voucher generation
     * Uses the same pattern as TaskController::createTaskAssignedNotification
     */
    private function createVoucherNotification(int $studentId, $voucher): void
    {
        try {
            if (!DB::getSchemaBuilder()->hasTable('notifications')) {
                return;
            }

            $dueDate = Carbon::parse($voucher->due_date)->format('M d, Y');
            $description = $voucher->description ?? 'Fee Voucher';
            $amount = number_format($voucher->fee_amount, 2);

            // Check which column structure exists (same pattern as TaskController)
            $hasUserIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'user_id');
            $hasNotifiableIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'notifiable_id');
            $hasTypeColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'type');
            $hasTitleColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'title');
            $hasMessageColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'message');
            $hasDataColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'data');
            $hasReadColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'read');

            $notificationData = [];

            // If both columns exist, set both (some servers require notifiable_id/type even when user_id exists)
            if ($hasUserIdColumn && $hasNotifiableIdColumn) {
                $notificationData['user_id'] = $studentId;
                $notificationData['notifiable_id'] = $studentId;
                $notificationData['notifiable_type'] = 'App\\Models\\User';
            } else if ($hasUserIdColumn) {
                $notificationData['user_id'] = $studentId;
            } else if ($hasNotifiableIdColumn) {
                $notificationData['notifiable_id'] = $studentId;
                $notificationData['notifiable_type'] = 'App\\Models\\User';
            }

            if ($hasTypeColumn) {
                $notificationData['type'] = 'voucher_generated';
            }

            if ($hasTitleColumn) {
                $notificationData['title'] = 'New Voucher Generated';
            }

            if ($hasMessageColumn) {
                $notificationData['message'] = "A new {$description} (PKR {$amount}) has been generated. Due Date: {$dueDate}. Please go to Account Book and deposit soon to avoid any inconvenience.";
            }

            if ($hasDataColumn) {
                $notificationData['data'] = json_encode([
                    'voucher_id' => $voucher->id,
                    'fee_amount' => $voucher->fee_amount,
                    'description' => $voucher->description,
                    'due_date' => $voucher->due_date,
                ]);
            }

            if ($hasReadColumn) {
                $notificationData['read'] = false;
            }

            $notificationData['created_at'] = now();
            $notificationData['updated_at'] = now();

            // Ensure we have required fields before inserting
            if (empty($notificationData)) {
                Log::warning('Notification data is empty, cannot insert', [
                    'student_id' => $studentId,
                    'voucher_id' => $voucher->id ?? null,
                ]);
                return;
            }

            // Note: id column is now auto-increment, so we don't need to set it

            Log::info('Attempting to insert voucher notification', [
                'student_id' => $studentId,
                'voucher_id' => $voucher->id ?? null,
                'notification_data_keys' => array_keys($notificationData),
                'has_user_id' => $hasUserIdColumn,
                'has_notifiable_id' => $hasNotifiableIdColumn,
            ]);

            $inserted = DB::table('notifications')->insert($notificationData);
            
            $notificationId = null;
            if ($inserted) {
                // Get the inserted ID if available
                try {
                    $notificationId = DB::getPdo()->lastInsertId();
                } catch (\Exception $idException) {
                    // Ignore if we can't get the ID
                }
            }
            
            Log::info('Voucher notification created successfully', [
                'student_id' => $studentId,
                'voucher_id' => $voucher->id ?? null,
                'notification_id' => $notificationId,
                'inserted' => $inserted,
            ]);
        } catch (\Exception $e) {
            // Log error with full details for debugging
            Log::error('Failed to create voucher notification', [
                'error_message' => $e->getMessage(),
                'error_code' => $e->getCode(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'student_id' => $studentId,
                'voucher_id' => $voucher->id ?? null,
                'notification_data' => $notificationData ?? [],
                'has_user_id_column' => $hasUserIdColumn ?? false,
                'has_notifiable_id_column' => $hasNotifiableIdColumn ?? false,
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    /**
     * Send email notification for task reminder (Queue-based)
     */
    private function sendTaskReminderEmail($student, $task, int $reminderHours, string $formattedDate): void
    {
        try {
            $taskTitle = $task->title ?? 'Task';
            $studentName = $student->name ?? $student->email;

            // Queue the email using Mailable class
            Mail::to($student->email, $studentName)
                ->queue(new TaskReminderMail($taskTitle, $reminderHours, $formattedDate, $studentName));

            Log::info("Email reminder queued for {$student->email} for task {$task->id}");
        } catch (\Exception $e) {
            Log::error("Failed to queue email reminder to {$student->email}: " . $e->getMessage());
            // Don't throw - continue with other notifications
        }
    }

    /**
     * Execute Voucher Generation Job
     * Runs daily to generate vouchers for students 10 days before their promise date
     */
    private function executeVoucherGenerationJob(ScheduledJob $job): void
    {
        $now = Carbon::now()->setTimezone('Asia/Karachi');
        $todayPlus10Days = $now->copy()->addDays(10);
        $targetPromiseDay = $todayPlus10Days->day; // The promise date that is 10 days from today
        
        $generatedCount = 0;
        $skippedCount = 0;

        // Get all active students with promise_date matching target day and fees set
        $students = User::where('block', 0)
            ->where('expected_fee_promise_date', $targetPromiseDay)
            ->whereNotNull('fees')
            ->where('fees', '>', 0)
            ->get();

        foreach ($students as $student) {
            try {
                $promiseDay = (int) $student->expected_fee_promise_date; // Day of month (1-31)
                
                // Calculate the due date (promise date in the month that is 10 days from now)
                // Example: Today is Jan 7, promise day is 17, so due date should be Jan 17
                $dueDate = Carbon::create(
                    $todayPlus10Days->year,
                    $todayPlus10Days->month,
                    $promiseDay,
                    0, 0, 0,
                    'Asia/Karachi'
                );

                // Check if voucher already exists for this student and due date (same year and month)
                $existingVoucher = Voucher::where('student_id', $student->id)
                    ->whereYear('due_date', $dueDate->year)
                    ->whereMonth('due_date', $dueDate->month)
                    ->whereDay('due_date', $dueDate->day)
                    ->first();

                if ($existingVoucher) {
                    $skippedCount++;
                    continue; // Voucher already exists for this month
                }

                // Create new voucher
                $voucher = Voucher::create([
                    'student_id' => $student->id,
                    'fee_amount' => $student->fees,
                    'description' => 'Fee Voucher',
                    'due_date' => $dueDate->format('Y-m-d'),
                    'promise_date' => $dueDate->format('Y-m-d'),
                    'status' => 'pending',
                ]);

                // Create notification for student
                $this->createVoucherNotification($student->id, $voucher);

                $generatedCount++;
                Log::info("Voucher generated for student {$student->id} ({$student->email}) with due date {$dueDate->format('Y-m-d')}");
            } catch (\Exception $e) {
                Log::error("Failed to generate voucher for student {$student->id}: " . $e->getMessage(), [
                    'exception' => $e,
                ]);
            }
        }

        $metadata = [
            'target_promise_day' => $targetPromiseDay,
            'students_processed' => $students->count(),
            'vouchers_generated' => $generatedCount,
            'vouchers_skipped' => $skippedCount,
        ];

        Log::info("Voucher generation job completed", $metadata);
        
        // Store metadata in job log if available
        if (isset($this->currentJobLog)) {
            $this->currentJobLog->update([
                'metadata' => $metadata,
                'message' => "Generated {$generatedCount} vouchers, skipped {$skippedCount} existing vouchers",
            ]);
        }
    }

    /**
     * Execute Voucher Overdue Notification Job
     * Runs daily to notify students about vouchers with crossed due dates
     */
    private function executeVoucherOverdueNotificationJob(ScheduledJob $job): void
    {
        $now = Carbon::now()->setTimezone('Asia/Karachi')->startOfDay();
        
        // Get all pending vouchers where due_date has passed
        $overdueVouchers = Voucher::where('status', 'pending')
            ->whereDate('due_date', '<', $now)
            ->with('student')
            ->get();

        if ($overdueVouchers->isEmpty()) {
            Log::info("No overdue vouchers found for notification");
            return;
        }

        $notifiedCount = 0;
        $skippedCount = 0;

        foreach ($overdueVouchers as $voucher) {
            try {
                if (!$voucher->student) {
                    $skippedCount++;
                    continue;
                }

                // Create notification for student
                $this->createVoucherOverdueNotification($voucher->student->id, $voucher);
                $notifiedCount++;

                Log::info("Overdue voucher notification sent to student {$voucher->student->id} for voucher {$voucher->id}");
            } catch (\Exception $e) {
                Log::error("Failed to send overdue notification for voucher {$voucher->id}: " . $e->getMessage());
            }
        }

        $metadata = [
            'overdue_vouchers' => $overdueVouchers->count(),
            'notifications_sent' => $notifiedCount,
            'skipped' => $skippedCount,
        ];

        Log::info("Voucher overdue notification job completed", $metadata);
        
        // Store metadata in job log if available
        if (isset($this->currentJobLog)) {
            $this->currentJobLog->update([
                'metadata' => $metadata,
                'message' => "Found {$overdueVouchers->count()} overdue vouchers, sent {$notifiedCount} notifications",
            ]);
        }
    }

    /**
     * Create UI notification for overdue voucher
     */
    private function createVoucherOverdueNotification(int $studentId, Voucher $voucher): void
    {
        try {
            if (!DB::getSchemaBuilder()->hasTable('notifications')) {
                return;
            }

            $dueDate = Carbon::parse($voucher->due_date)->format('M d, Y');
            $description = $voucher->description ?? 'Fee Voucher';
            $amount = number_format($voucher->fee_amount, 2);

            // Check which column structure exists (same pattern as createVoucherNotification)
            $hasUserIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'user_id');
            $hasNotifiableIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'notifiable_id');
            $hasTypeColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'type');
            $hasTitleColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'title');
            $hasMessageColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'message');
            $hasDataColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'data');
            $hasReadColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'read');

            $notificationData = [];

            // If both columns exist, set both (some servers require notifiable_id/type even when user_id exists)
            if ($hasUserIdColumn && $hasNotifiableIdColumn) {
                $notificationData['user_id'] = $studentId;
                $notificationData['notifiable_id'] = $studentId;
                $notificationData['notifiable_type'] = 'App\\Models\\User';
            } else if ($hasUserIdColumn) {
                $notificationData['user_id'] = $studentId;
            } else if ($hasNotifiableIdColumn) {
                $notificationData['notifiable_id'] = $studentId;
                $notificationData['notifiable_type'] = 'App\\Models\\User';
            }

            if ($hasTypeColumn) {
                $notificationData['type'] = 'voucher_overdue';
            }

            if ($hasTitleColumn) {
                $notificationData['title'] = 'Voucher Due Date Crossed';
            }

            if ($hasMessageColumn) {
                $notificationData['message'] = "Your {$description} (PKR {$amount}) due date ({$dueDate}) has crossed. You must pay the voucher immediately to avoid auto-blocking of your LMS account.";
            }

            if ($hasDataColumn) {
                $notificationData['data'] = json_encode([
                    'voucher_id' => $voucher->id,
                    'fee_amount' => $voucher->fee_amount,
                    'description' => $voucher->description,
                    'due_date' => $voucher->due_date,
                ]);
            }

            if ($hasReadColumn) {
                $notificationData['read'] = false;
            }

            $notificationData['created_at'] = now();
            $notificationData['updated_at'] = now();

            // Ensure we have required fields before inserting
            if (empty($notificationData)) {
                Log::warning('Notification data is empty, cannot insert', [
                    'student_id' => $studentId,
                    'voucher_id' => $voucher->id ?? null,
                ]);
                return;
            }

            Log::info('Attempting to insert overdue voucher notification', [
                'student_id' => $studentId,
                'voucher_id' => $voucher->id ?? null,
                'notification_data_keys' => array_keys($notificationData),
                'has_user_id' => $hasUserIdColumn,
                'has_notifiable_id' => $hasNotifiableIdColumn,
            ]);

            DB::table('notifications')->insert($notificationData);
            
            Log::info('Overdue voucher notification created successfully', [
                'student_id' => $studentId,
                'voucher_id' => $voucher->id ?? null,
            ]);
        } catch (\Exception $e) {
            // Log error with full details for debugging
            Log::error("Failed to create overdue voucher notification for student {$studentId}: " . $e->getMessage(), [
                'error_code' => $e->getCode(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'voucher_id' => $voucher->id ?? null,
                'notification_data' => $notificationData ?? [],
            ]);
        }
    }

    /**
     * Execute Voucher Auto-Block Job
     * Runs daily at midnight to auto-block students with vouchers overdue by 3+ days
     */
    private function executeVoucherAutoBlockJob(ScheduledJob $job): void
    {
        $now = Carbon::now()->setTimezone('Asia/Karachi')->startOfDay();
        $threeDaysAgo = $now->copy()->subDays(3);
        
        // Get all pending vouchers where due_date is 3+ days ago
        $overdueVouchers = Voucher::where('status', 'pending')
            ->whereDate('due_date', '<=', $threeDaysAgo)
            ->with('student')
            ->get();

        if ($overdueVouchers->isEmpty()) {
            Log::info("No vouchers found for auto-blocking (3+ days overdue)");
            return;
        }

        $blockedCount = 0;
        $skippedCount = 0;
        $alreadyBlockedCount = 0;

        foreach ($overdueVouchers as $voucher) {
            try {
                if (!$voucher->student) {
                    $skippedCount++;
                    continue;
                }

                $student = $voucher->student;

                // Skip if already blocked
                if ($student->block == 1) {
                    $alreadyBlockedCount++;
                    continue;
                }

                // Block the student
                $student->block = 1;
                $student->block_reason = 'Auto block by system due to non payment of fee voucher';
                $student->save();

                // Create notification for student
                $this->createAutoBlockNotification($student->id, $voucher);

                $blockedCount++;
                Log::info("Student {$student->id} auto-blocked due to overdue voucher {$voucher->id}");
            } catch (\Exception $e) {
                Log::error("Failed to auto-block student for voucher {$voucher->id}: " . $e->getMessage());
            }
        }

        $metadata = [
            'overdue_vouchers' => $overdueVouchers->count(),
            'students_blocked' => $blockedCount,
            'already_blocked' => $alreadyBlockedCount,
            'skipped' => $skippedCount,
        ];

        Log::info("Voucher auto-block job completed", $metadata);
        
        // Store metadata in job log if available
        if (isset($this->currentJobLog)) {
            $this->currentJobLog->update([
                'metadata' => $metadata,
                'message' => "Blocked {$blockedCount} students, {$alreadyBlockedCount} were already blocked",
            ]);
        }
    }

    /**
     * Create UI notification for auto-block
     */
    private function createAutoBlockNotification(int $studentId, Voucher $voucher): void
    {
        try {
            if (!DB::getSchemaBuilder()->hasTable('notifications')) {
                return;
            }

            $dueDate = Carbon::parse($voucher->due_date)->format('M d, Y');
            $description = $voucher->description ?? 'Fee Voucher';
            $amount = number_format($voucher->fee_amount, 2);

            // Check which column structure exists (same pattern as createVoucherNotification)
            $hasUserIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'user_id');
            $hasNotifiableIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'notifiable_id');
            $hasTypeColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'type');
            $hasTitleColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'title');
            $hasMessageColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'message');
            $hasDataColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'data');
            $hasReadColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'read');

            $notificationData = [];

            // If both columns exist, set both (some servers require notifiable_id/type even when user_id exists)
            if ($hasUserIdColumn && $hasNotifiableIdColumn) {
                $notificationData['user_id'] = $studentId;
                $notificationData['notifiable_id'] = $studentId;
                $notificationData['notifiable_type'] = 'App\\Models\\User';
            } else if ($hasUserIdColumn) {
                $notificationData['user_id'] = $studentId;
            } else if ($hasNotifiableIdColumn) {
                $notificationData['notifiable_id'] = $studentId;
                $notificationData['notifiable_type'] = 'App\\Models\\User';
            }

            if ($hasTypeColumn) {
                $notificationData['type'] = 'account_blocked';
            }

            if ($hasTitleColumn) {
                $notificationData['title'] = 'Account Auto-Blocked';
            }

            if ($hasMessageColumn) {
                $notificationData['message'] = "Your LMS account has been auto-blocked due to non-payment of {$description} (PKR {$amount}) with due date {$dueDate}. Please contact admin to resolve this issue.";
            }

            if ($hasDataColumn) {
                $notificationData['data'] = json_encode([
                    'voucher_id' => $voucher->id,
                    'fee_amount' => $voucher->fee_amount,
                    'description' => $voucher->description,
                    'due_date' => $voucher->due_date,
                    'block_reason' => 'Auto block by system due to non payment of fee voucher',
                ]);
            }

            if ($hasReadColumn) {
                $notificationData['read'] = false;
            }

            $notificationData['created_at'] = now();
            $notificationData['updated_at'] = now();

            // Ensure we have required fields before inserting
            if (empty($notificationData)) {
                Log::warning('Notification data is empty, cannot insert', [
                    'student_id' => $studentId,
                    'voucher_id' => $voucher->id ?? null,
                ]);
                return;
            }

            Log::info('Attempting to insert auto-block notification', [
                'student_id' => $studentId,
                'voucher_id' => $voucher->id ?? null,
                'notification_data_keys' => array_keys($notificationData),
                'has_user_id' => $hasUserIdColumn,
                'has_notifiable_id' => $hasNotifiableIdColumn,
            ]);

            DB::table('notifications')->insert($notificationData);
            
            Log::info('Auto-block notification created successfully', [
                'student_id' => $studentId,
                'voucher_id' => $voucher->id ?? null,
            ]);
        } catch (\Exception $e) {
            // Log error with full details for debugging
            Log::error("Failed to create auto-block notification for student {$studentId}: " . $e->getMessage(), [
                'error_code' => $e->getCode(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'voucher_id' => $voucher->id ?? null,
                'notification_data' => $notificationData ?? [],
            ]);
        }
    }

    /**
     * Get all scheduled jobs (for admin)
     */
    public function index(): JsonResponse
    {
        $jobs = ScheduledJob::orderBy('name')->get();
        return $this->success($jobs, 'Scheduled jobs retrieved successfully');
    }

    /**
     * Create a new scheduled job (for admin)
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'job_class' => 'required|string|max:255',
            'schedule_type' => 'required|in:hourly,daily,twice_daily,weekly,monthly,custom',
            'schedule_config' => 'nullable|array',
            'enabled' => 'sometimes|boolean',
            'metadata' => 'nullable|array',
        ]);

        $job = ScheduledJob::create($validated);
        $job->calculateNextRun();
        $job->save();

        return $this->success($job, 'Scheduled job created successfully', 201);
    }

    /**
     * Update a scheduled job (for admin)
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $job = ScheduledJob::find($id);
        if (!$job) {
            return $this->notFound('Scheduled job not found');
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'job_class' => 'sometimes|string|max:255',
            'schedule_type' => 'sometimes|in:hourly,daily,twice_daily,weekly,monthly,custom',
            'schedule_config' => 'nullable|array',
            'enabled' => 'sometimes|boolean',
            'metadata' => 'nullable|array',
        ]);

        $job->update($validated);
        
        // Recalculate next run if schedule changed
        if ($request->has('schedule_type') || $request->has('schedule_config')) {
            $job->calculateNextRun();
            $job->save();
        }

        return $this->success($job, 'Scheduled job updated successfully');
    }

    /**
     * Delete a scheduled job (for admin)
     */
    public function destroy(int $id): JsonResponse
    {
        $job = ScheduledJob::find($id);
        if (!$job) {
            return $this->notFound('Scheduled job not found');
        }

        $job->delete();
        return $this->success(null, 'Scheduled job deleted successfully');
    }

    /**
     * Get job logs for a specific scheduled job
     *
     * @param Request $request
     * @param int $jobId
     * @return JsonResponse
     */
    public function getJobLogs(Request $request, int $jobId): JsonResponse
    {
        try {
            $job = ScheduledJob::find($jobId);
            if (!$job) {
                return $this->notFound('Scheduled job not found');
            }

            $query = JobLog::where('scheduled_job_id', $jobId)
                ->orderBy('started_at', 'desc');

            // Date range filter
            if ($request->has('date_from') && !empty($request->get('date_from'))) {
                $query->whereDate('started_at', '>=', $request->get('date_from'));
            }
            if ($request->has('date_to') && !empty($request->get('date_to'))) {
                $query->whereDate('started_at', '<=', $request->get('date_to'));
            }

            // Status filter
            if ($request->has('status') && !empty($request->get('status'))) {
                $query->where('status', $request->get('status'));
            }

            // Pagination
            $perPage = $request->get('per_page', 15);
            $logs = $query->paginate($perPage);

            return $this->success([
                'logs' => $logs->items(),
                'pagination' => [
                    'current_page' => $logs->currentPage(),
                    'last_page' => $logs->lastPage(),
                    'per_page' => $logs->perPage(),
                    'total' => $logs->total(),
                    'from' => $logs->firstItem(),
                    'to' => $logs->lastItem(),
                ],
            ], 'Job logs retrieved successfully');
        } catch (\Exception $e) {
            Log::error('Failed to retrieve job logs: ' . $e->getMessage());
            return $this->error($e->getMessage(), 'Failed to retrieve job logs', 500);
        }
    }

    /**
     * Clear job logs for a specific scheduled job
     *
     * @param Request $request
     * @param int $jobId
     * @return JsonResponse
     */
    public function clearJobLogs(Request $request, int $jobId): JsonResponse
    {
        try {
            $job = ScheduledJob::find($jobId);
            if (!$job) {
                return $this->notFound('Scheduled job not found');
            }

            // Delete all logs for this job
            $deletedCount = JobLog::where('scheduled_job_id', $jobId)->delete();

            return $this->success([
                'deleted_count' => $deletedCount,
            ], "Successfully cleared {$deletedCount} log(s) for job: {$job->name}");
        } catch (\Exception $e) {
            Log::error('Failed to clear job logs: ' . $e->getMessage());
            return $this->error($e->getMessage(), 'Failed to clear job logs', 500);
        }
    }
}

