<?php

namespace App\Http\Controllers;

use App\Models\ScheduledJob;
use App\Mail\TaskReminderMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ScheduledJobController extends ApiController
{
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
                try {
                    // Execute the job based on job_class
                    $this->executeJob($job);
                    
                    // Update last_run_at and calculate next_run_at
                    $job->last_run_at = now();
                    $job->calculateNextRun();
                    $job->save();

                    $executed[] = [
                        'id' => $job->id,
                        'name' => $job->name,
                        'status' => 'success',
                    ];
                } catch (\Exception $e) {
                    Log::error("Scheduled job execution failed: {$job->name}", [
                        'job_id' => $job->id,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                    ]);

                    $errors[] = [
                        'id' => $job->id,
                        'name' => $job->name,
                        'error' => $e->getMessage(),
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
    private function executeJob(ScheduledJob $job): void
    {
        switch ($job->job_class) {
            case 'TaskReminderJob':
                $this->executeTaskReminderJob($job);
                break;
            default:
                throw new \Exception("Unknown job class: {$job->job_class}");
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

        Log::info("Task reminder job completed", [
            'tasks_processed' => $tasks->count(),
            'notifications_sent' => $notifiedCount,
            'emails_sent' => $emailCount,
        ]);
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
        $taskTitle = $task->title ?? 'Task';
        
        DB::table('notifications')->insert([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'user_id' => $studentId,
            'type' => 'task_reminder',
            'title' => "Task Reminder: {$reminderHours} Hours Remaining",
            'message' => "Your task '{$taskTitle}' is due in {$reminderHours} hours (Due: {$formattedDate}). Please submit it before the deadline.",
            'data' => json_encode([
                'task_id' => $task->id,
                'reminder_hours' => $reminderHours,
                'expiry_date' => $task->expiry_date,
            ]),
            'read' => false,
            'read_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
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
}

