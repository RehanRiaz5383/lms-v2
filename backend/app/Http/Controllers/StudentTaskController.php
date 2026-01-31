<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\SubmittedTask;
use App\Traits\UploadsToGoogleDrive;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class StudentTaskController extends ApiController
{
    use UploadsToGoogleDrive;
    /**
     * Get all tasks assigned to the authenticated student.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();
        $userId = $user->id;

        // Get user's batch IDs (use user_id for user_batches table)
        $userBatchIds = [];
        if (DB::getSchemaBuilder()->hasColumn('user_batches', 'user_id')) {
            $userBatchIds = DB::table('user_batches')
                ->where('user_id', $userId)
                ->pluck('batch_id')
                ->toArray();
        } else if (DB::getSchemaBuilder()->hasColumn('user_batches', 'student_id')) {
            // Fallback to student_id if user_id doesn't exist
            $userBatchIds = DB::table('user_batches')
                ->where('student_id', $userId)
                ->pluck('batch_id')
                ->toArray();
        }

        if (empty($userBatchIds)) {
            return $this->success([
                'tasks' => [],
                'batches' => [],
                'subjects' => [],
            ], 'No tasks assigned');
        }

        try {
            $query = Task::query();

            // Filter by batch_id if tasks table has batch_id column
            if (DB::getSchemaBuilder()->hasColumn('tasks', 'batch_id')) {
                $query->whereIn('batch_id', $userBatchIds);
                
                // Filter by batch if provided
                if ($request->has('batch_id') && !empty($request->get('batch_id'))) {
                    $query->where('batch_id', $request->get('batch_id'));
                }
            } else if (DB::getSchemaBuilder()->hasColumn('tasks', 'user_id')) {
                // Filter by user_id if tasks table has user_id column
                $query->where('user_id', $userId);
            }

            // Filter by subject if provided
            if ($request->has('subject_id') && !empty($request->get('subject_id'))) {
                if (DB::getSchemaBuilder()->hasColumn('tasks', 'subject_id')) {
                    $query->where('subject_id', $request->get('subject_id'));
                }
            }

            // Filter by status if provided
            if ($request->has('status')) {
                $status = $request->input('status');
                if (in_array($status, ['pending', 'submitted', 'all'])) {
                    if ($status === 'pending') {
                        // Get tasks that don't have submissions
                        $submittedTaskIds = SubmittedTask::where('student_id', $userId)
                            ->pluck('task_id')
                            ->toArray();
                        $query->whereNotIn('id', $submittedTaskIds);
                    } else if ($status === 'submitted') {
                        // Get tasks that have submissions
                        $submittedTaskIds = SubmittedTask::where('student_id', $userId)
                            ->pluck('task_id')
                            ->toArray();
                        $query->whereIn('id', $submittedTaskIds);
                    }
                }
            }

            // Order by expiry_date DESC (most recent due dates first), then by created_at DESC
            $hasExpiryDateColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'expiry_date');
            if ($hasExpiryDateColumn) {
                $query->orderBy('expiry_date', 'desc')
                      ->orderBy('created_at', 'desc');
            } else {
                $query->orderBy('created_at', 'desc');
            }

            // Only include creator in eager loading if column exists
            $hasCreatedByColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'created_by');
            $withRelations = ['batch', 'subject'];
            if ($hasCreatedByColumn) {
                $withRelations[] = 'creator';
            }
            
            $tasks = $query->with($withRelations)
                ->get();

            // Attach submission status and data, and task files
            $tasks = $tasks->map(function ($task) use ($userId) {
                $submission = SubmittedTask::where('task_id', $task->id)
                    ->where('student_id', $userId)
                    ->first();

                if ($submission) {
                    // Add file_url to submission
                    $submission->file_url = $submission->file_url ?? null;
                }

                $task->is_submitted = $submission !== null;
                $task->submission = $submission;
                $task->can_submit = $this->canSubmitTask($task);
                
                // Add sort priority:
                // 0 = pending and not overdue (highest priority)
                // 1 = pending but overdue
                // 2 = submitted
                if ($task->is_submitted) {
                    $task->sort_priority = 2;
                } else {
                    // Check if overdue
                    $isOverdue = false;
                    if ($task->expiry_date) {
                        try {
                            $now = now()->setTimezone('Asia/Karachi');
                            $dueDate = \Carbon\Carbon::parse($task->expiry_date, 'Asia/Karachi')->endOfDay();
                            $isOverdue = $now->gt($dueDate);
                        } catch (\Exception $e) {
                            $isOverdue = false;
                        }
                    }
                    $task->sort_priority = $isOverdue ? 1 : 0;
                }
                
                // Ensure expiry_date is properly formatted
                if ($task->expiry_date) {
                    $task->expiry_date = is_string($task->expiry_date) ? $task->expiry_date : $task->expiry_date->toDateTimeString();
                // Also set due_date for frontend compatibility
                $task->due_date = $task->expiry_date;
                } else {
                    $task->due_date = null;
                }

                // Attach task files from files table if it exists
                if (DB::getSchemaBuilder()->hasTable('files')) {
                    $taskFiles = DB::table('files')
                        ->where('task_id', $task->id)
                        ->get()
                        ->map(function ($file) {
                            $appUrl = config('app.url', 'http://localhost:8000');
                            $filePath = $file->file_path ?? null;
                            if ($filePath) {
                                $file->file_url = $appUrl . '/load-storage/' . ltrim($filePath, '/');
                            } else {
                                $file->file_url = null;
                            }
                            return $file;
                        });
                    $task->attachment_files = $taskFiles;
                } else {
                    $task->attachment_files = [];
                }

                // Also add task file from tasks.file_path if it exists
                $hasFilePathColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'file_path');
                if ($hasFilePathColumn && isset($task->file_path) && $task->file_path) {
                    $appUrl = env('APP_URL', 'http://localhost:8000');
                    $useDirectStorage = env('USE_DIRECT_STORAGE', false);
                    if ($useDirectStorage) {
                        $task->task_file_url = $appUrl . '/storage.php?file=' . urlencode($task->file_path);
                    } else {
                        $task->task_file_url = $appUrl . '/load-storage/' . ltrim($task->file_path, '/');
                    }
                } else {
                    $task->task_file_url = null;
                }

                return $task;
            });

            // Sort tasks: 
            // 1. Pending and not overdue (priority 0) - earliest due date first
            // 2. Pending but overdue (priority 1) - earliest due date first
            // 3. Submitted (priority 2) - latest due date first
            $tasks = $tasks->sort(function ($a, $b) {
                // First, sort by priority (0 < 1 < 2)
                if ($a->sort_priority != $b->sort_priority) {
                    return $a->sort_priority <=> $b->sort_priority;
                }
                
                // If same priority, sort by expiry_date
                // For pending tasks (priority 0 or 1), earliest first
                // For submitted tasks (priority 2), latest first
                if ($a->sort_priority < 2) {
                    // Pending tasks: earliest due date first
                    if ($a->expiry_date && $b->expiry_date) {
                        return strcmp($a->expiry_date, $b->expiry_date);
                    }
                    if ($a->expiry_date) return -1;
                    if ($b->expiry_date) return 1;
                } else {
                    // Submitted tasks: latest due date first
                    if ($a->expiry_date && $b->expiry_date) {
                        return strcmp($b->expiry_date, $a->expiry_date);
                    }
                    if ($a->expiry_date) return -1;
                    if ($b->expiry_date) return 1;
                }
                
                // Finally, sort by created_at (newest first)
                $aCreated = $a->created_at ?? '1970-01-01';
                $bCreated = $b->created_at ?? '1970-01-01';
                return strcmp($bCreated, $aCreated);
            })->values();

            // Get available batches for filter
            $availableBatches = DB::table('batches')
                ->whereIn('id', $userBatchIds)
                ->where('active', true)
                ->select('id', 'title')
                ->get();

            // Get available subjects for filter (subjects that have tasks assigned to user's batches)
            $availableSubjects = [];
            if (DB::getSchemaBuilder()->hasColumn('tasks', 'subject_id')) {
                $availableSubjects = DB::table('subjects')
                    ->join('tasks', 'subjects.id', '=', 'tasks.subject_id')
                    ->whereIn('tasks.batch_id', $userBatchIds)
                    ->where('subjects.active', true)
                    ->distinct()
                    ->select('subjects.id', 'subjects.title')
                    ->get();
            }

            return $this->success([
                'tasks' => $tasks,
                'batches' => $availableBatches,
                'subjects' => $availableSubjects,
            ], 'Tasks retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to retrieve tasks', 500);
        }
    }

    /**
     * Get a specific task with submission details.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        $user = auth()->user();
        $userId = $user->id;

        try {
            // Check which columns exist
            $hasCreatedByColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'created_by');
            
            // Get user's batch IDs (use user_id for user_batches table)
            $userBatchIds = [];
            if (DB::getSchemaBuilder()->hasColumn('user_batches', 'user_id')) {
                $userBatchIds = DB::table('user_batches')
                    ->where('user_id', $userId)
                    ->pluck('batch_id')
                    ->toArray();
            } else if (DB::getSchemaBuilder()->hasColumn('user_batches', 'student_id')) {
                // Fallback to student_id if user_id doesn't exist
                $userBatchIds = DB::table('user_batches')
                    ->where('student_id', $userId)
                    ->pluck('batch_id')
                    ->toArray();
            }

            // Only include creator in eager loading if column exists
            $withRelations = ['batch', 'subject'];
            if ($hasCreatedByColumn) {
                $withRelations[] = 'creator';
            }
            
            $task = Task::with($withRelations)
                ->find($id);

            if (!$task) {
                return $this->notFound('Task not found');
            }

            // Check if user has access to this task
            $hasAccess = false;
            if (DB::getSchemaBuilder()->hasColumn('tasks', 'batch_id')) {
                $hasAccess = in_array($task->batch_id, $userBatchIds) || $task->batch_id === null;
            } else if (DB::getSchemaBuilder()->hasColumn('tasks', 'user_id')) {
                $hasAccess = $task->user_id === $userId;
            }

            if (!$hasAccess) {
                return $this->forbidden('You do not have access to this task');
            }

            // Get submission if exists
            $submission = SubmittedTask::where('task_id', $task->id)
                ->where('student_id', $userId)
                ->first();

            if ($submission) {
                // Add file_url to submission
                $submission->file_url = $submission->file_url ?? null;
            }

            $task->is_submitted = $submission !== null;
            $task->submission = $submission;
            $task->can_submit = $this->canSubmitTask($task);
            
            // Ensure expiry_date is properly formatted (check expiry_date, not due_date)
            $hasExpiryDateColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'expiry_date');
            if ($hasExpiryDateColumn && $task->expiry_date) {
                $task->expiry_date = is_string($task->expiry_date) ? $task->expiry_date : $task->expiry_date->toDateTimeString();
                // Also set due_date for frontend compatibility
                $task->due_date = $task->expiry_date;
            } else {
                $task->expiry_date = null;
                $task->due_date = null;
            }

            // Attach task files from files table if it exists
            if (DB::getSchemaBuilder()->hasTable('files')) {
                $taskFiles = DB::table('files')
                    ->where('task_id', $task->id)
                    ->get()
                    ->map(function ($file) {
                        $appUrl = env('APP_URL', 'http://localhost:8000');
                        $filePath = $file->file_path ?? null;
                        if ($filePath) {
                            $file->file_url = $appUrl . '/load-storage/' . ltrim($filePath, '/');
                        } else {
                            $file->file_url = null;
                        }
                        return $file;
                    });
                $task->attachment_files = $taskFiles;
            } else {
                $task->attachment_files = [];
            }

            // Also add task file from tasks.file_path if it exists
            $hasFilePathColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'file_path');
            if ($hasFilePathColumn && isset($task->file_path) && $task->file_path) {
                $appUrl = env('APP_URL', 'http://localhost:8000');
                $useDirectStorage = env('USE_DIRECT_STORAGE', false);
                if ($useDirectStorage) {
                    $task->task_file_url = $appUrl . '/storage.php?file=' . urlencode($task->file_path);
                } else {
                    $task->task_file_url = $appUrl . '/load-storage/' . ltrim($task->file_path, '/');
                }
            } else {
                $task->task_file_url = null;
            }

            return $this->success($task, 'Task retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to retrieve task', 500);
        }
    }

    /**
     * Submit a task.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function submit(Request $request, int $id): JsonResponse
    {
        $user = auth()->user();
        $userId = $user->id;

        try {
            $task = Task::find($id);

            if (!$task) {
                return $this->notFound('Task not found');
            }

            // Check if user has access to this task
            // Use user_id for user_batches table (students are also users)
            $userBatchIds = [];
            if (DB::getSchemaBuilder()->hasColumn('user_batches', 'user_id')) {
                $userBatchIds = DB::table('user_batches')
                    ->where('user_id', $userId)
                    ->pluck('batch_id')
                    ->toArray();
            } else if (DB::getSchemaBuilder()->hasColumn('user_batches', 'student_id')) {
                // Fallback to student_id if user_id doesn't exist
                $userBatchIds = DB::table('user_batches')
                    ->where('student_id', $userId)
                    ->pluck('batch_id')
                    ->toArray();
            }

            $hasAccess = false;
            if (DB::getSchemaBuilder()->hasColumn('tasks', 'batch_id')) {
                $hasAccess = in_array($task->batch_id, $userBatchIds) || $task->batch_id === null;
            } else if (DB::getSchemaBuilder()->hasColumn('tasks', 'user_id')) {
                $hasAccess = $task->user_id === $userId;
            }

            if (!$hasAccess) {
                return $this->forbidden('You do not have access to this task');
            }

            // Check if task can be submitted
            if (!$this->canSubmitTask($task)) {
                return $this->error(null, 'Task submission deadline has passed', 400);
            }

            // Validate request
            $validator = Validator::make($request->all(), [
                'file' => 'required|file|max:10240', // 10MB max
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors()->toArray());
            }

            // Handle file upload - upload to Google Drive using folder name (from database)
            $file = $request->file('file');
            $filePath = $this->uploadToGoogleDrive($file, 'submitted_tasks');

            // Check if submission already exists
            $submission = SubmittedTask::where('task_id', $task->id)
                ->where('student_id', $userId)
                ->first();

            // Check which column exists for file storage
            $hasAnswerFileColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'answer_file');
            $hasFilePathColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'file_path');
            $fileColumn = $hasAnswerFileColumn ? 'answer_file' : ($hasFilePathColumn ? 'file_path' : null);

            if ($submission) {
                // Update existing submission
                // Delete old file if exists (from Google Drive)
                $oldFilePath = $hasAnswerFileColumn ? $submission->answer_file : ($hasFilePathColumn ? $submission->file_path : null);
                if ($oldFilePath) {
                    $this->deleteFromGoogleDrive($oldFilePath);
                }

                // Update the correct column
                if ($hasAnswerFileColumn) {
                    $submission->answer_file = $filePath;
                } else if ($hasFilePathColumn) {
                    $submission->file_path = $filePath;
                }
                
                // Only set remarks if column exists
                $hasRemarksColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'remarks');
                if ($hasRemarksColumn && $request->has('remarks')) {
                    $submission->remarks = $request->input('remarks');
                }
                
                // Only set submitted_at if column exists
                $hasSubmittedAtColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'submitted_at');
                if ($hasSubmittedAtColumn) {
                    $submission->submitted_at = now();
                }
                
                // Only set status if column exists
                $hasStatusColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'status');
                if ($hasStatusColumn) {
                    $submission->status = 'submitted';
                }
                
                $submission->save();
            } else {
                // Create new submission
                $submissionData = [
                    'task_id' => $task->id,
                    'student_id' => $userId,
                ];
                
                // Use answer_file if it exists, otherwise file_path
                if ($hasAnswerFileColumn) {
                    $submissionData['answer_file'] = $filePath;
                } else if ($hasFilePathColumn) {
                    $submissionData['file_path'] = $filePath;
                }
                
                // Only include remarks if column exists
                $hasRemarksColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'remarks');
                if ($hasRemarksColumn && $request->has('remarks')) {
                    $submissionData['remarks'] = $request->input('remarks');
                }
                
                // Only include submitted_at if column exists
                $hasSubmittedAtColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'submitted_at');
                if ($hasSubmittedAtColumn) {
                    $submissionData['submitted_at'] = now();
                }
                
                // Only include status if column exists
                $hasStatusColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'status');
                if ($hasStatusColumn) {
                    $submissionData['status'] = 'submitted';
                }
                
                $submission = SubmittedTask::create($submissionData);
            }

            $submission->load('task');

            return $this->success($submission, 'Task submitted successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to submit task', 500);
        }
    }

    /**
     * Get all submissions for the authenticated student.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function submissions(Request $request): JsonResponse
    {
        $user = auth()->user();
        $userId = $user->id;

        try {
            $query = SubmittedTask::where('student_id', $userId)
                ->with(['task.batch', 'task.subject', 'task.creator']);

            // Filter by status if provided
            if ($request->has('status')) {
                $status = $request->input('status');
                $hasGradedAtColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'graded_at');
                
                if (in_array($status, ['submitted', 'graded', 'all']) && $hasGradedAtColumn) {
                    if ($status === 'submitted') {
                        $query->whereNull('graded_at');
                    } else if ($status === 'graded') {
                        $query->whereNotNull('graded_at');
                    }
                }
            }

            // Only order by submitted_at if column exists, otherwise use created_at
            $hasSubmittedAtColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'submitted_at');
            if ($hasSubmittedAtColumn) {
                $query->orderBy('submitted_at', 'desc');
            } else {
                $query->orderBy('created_at', 'desc');
            }
            
            $submissions = $query->get();

            return $this->success($submissions, 'Submissions retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to retrieve submissions', 500);
        }
    }

    /**
     * Get count of pending tasks (due_date >= today and not submitted).
     *
     * @return JsonResponse
     */
    public function pendingCount(): JsonResponse
    {
        $user = auth()->user();
        $userId = $user->id;

        try {
            // Get user's batch IDs (use user_id for user_batches table)
            $userBatchIds = [];
            if (DB::getSchemaBuilder()->hasColumn('user_batches', 'user_id')) {
                $userBatchIds = DB::table('user_batches')
                    ->where('user_id', $userId)
                    ->pluck('batch_id')
                    ->toArray();
            } else if (DB::getSchemaBuilder()->hasColumn('user_batches', 'student_id')) {
                // Fallback to student_id if user_id doesn't exist
                $userBatchIds = DB::table('user_batches')
                    ->where('student_id', $userId)
                    ->pluck('batch_id')
                    ->toArray();
            }

            if (empty($userBatchIds)) {
                return $this->success(['count' => 0], 'Pending tasks count retrieved');
            }

            // Get submitted task IDs
            $submittedTaskIds = SubmittedTask::where('student_id', $userId)
                ->pluck('task_id')
                ->toArray();

            // Get tasks that are not submitted and have expiry_date >= today
            $hasExpiryDateColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'expiry_date');
            
            $query = Task::query();
            
            if (DB::getSchemaBuilder()->hasColumn('tasks', 'batch_id')) {
                $query->whereIn('batch_id', $userBatchIds);
            } else if (DB::getSchemaBuilder()->hasColumn('tasks', 'user_id')) {
                $query->where('user_id', $userId);
            }

            // Exclude submitted tasks
            if (!empty($submittedTaskIds)) {
                $query->whereNotIn('id', $submittedTaskIds);
            }

            // Filter by expiry_date >= today (using Asia/Karachi timezone)
            if ($hasExpiryDateColumn) {
                $today = now()->setTimezone('Asia/Karachi')->startOfDay()->format('Y-m-d');
                $query->where('expiry_date', '>=', $today);
            }

            $count = $query->count();

            return $this->success(['count' => $count], 'Pending tasks count retrieved');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to retrieve pending tasks count', 500);
        }
    }

    /**
     * Check if a task can be submitted (before or on due date, up to 23:59:59).
     * Button should be removed on the next day at 00:00:01 AM.
     * Example: If due_date is 26/01/2026, button should be removed on 27/01/2026 00:00:01 AM.
     *
     * @param Task|object $task
     * @return bool
     */
    private function canSubmitTask($task): bool
    {
        if (!$task->expiry_date) {
            return true; // No due date, can always submit
        }

        try {
            // Set timezone to Asia/Karachi
            $now = \Carbon\Carbon::now('Asia/Karachi');
            
            // Parse expiry_date in Asia/Karachi timezone and set to end of day (23:59:59.999)
            $dueDate = \Carbon\Carbon::parse($task->expiry_date, 'Asia/Karachi')
                ->endOfDay(); // Sets to 23:59:59.999

            // Can submit if current time is before or equal to end of due date (23:59:59.999)
            // After 00:00:00 of the next day, submission is no longer allowed
            return $now->lte($dueDate);
        } catch (\Exception $e) {
            // If date parsing fails, allow submission
            \Log::warning('Failed to parse task expiry_date', [
                'task_id' => $task->id ?? null,
                'expiry_date' => $task->expiry_date ?? null,
                'error' => $e->getMessage(),
            ]);
            return true;
        }
    }
}

