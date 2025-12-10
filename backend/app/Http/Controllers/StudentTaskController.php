<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\SubmittedTask;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class StudentTaskController extends ApiController
{
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

        // Get user's batch IDs
        $userBatchIds = DB::table('user_batches')
            ->where('student_id', $userId)
            ->pluck('batch_id')
            ->toArray();

        try {
            $query = Task::query();

            // Filter by batch_id if tasks table has batch_id column
            if (DB::getSchemaBuilder()->hasColumn('tasks', 'batch_id')) {
                if (!empty($userBatchIds)) {
                    $query->where(function ($q) use ($userBatchIds) {
                        $q->whereIn('batch_id', $userBatchIds)
                          ->orWhereNull('batch_id');
                    });
                } else {
                    $query->whereNull('batch_id');
                }
            } else if (DB::getSchemaBuilder()->hasColumn('tasks', 'user_id')) {
                // Filter by user_id if tasks table has user_id column
                $query->where('user_id', $userId);
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

            // Order by due date if column exists, otherwise just by created_at
            $hasExpiryDateColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'expiry_date');
            if ($hasExpiryDateColumn) {
                $query->orderBy('expiry_date', 'asc')
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

            // Attach submission status and data
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
                
                // Ensure expiry_date is properly formatted
                if ($task->expiry_date) {
                    $task->expiry_date = is_string($task->expiry_date) ? $task->expiry_date : $task->expiry_date->toDateTimeString();
                    // Also set due_date for frontend compatibility
                    $task->due_date = $task->expiry_date;
                } else {
                    $task->due_date = null;
                }

                return $task;
            });

            return $this->success($tasks, 'Tasks retrieved successfully');
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
            $task = Task::with(['batch', 'subject', 'creator'])
                ->find($id);

            if (!$task) {
                return $this->notFound('Task not found');
            }

            // Check if user has access to this task
            $userBatchIds = DB::table('user_batches')
                ->where('student_id', $userId)
                ->pluck('batch_id')
                ->toArray();

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
            
            // Ensure due_date is properly formatted
            if ($task->due_date) {
                $task->due_date = is_string($task->due_date) ? $task->due_date : $task->due_date->toDateTimeString();
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
            $userBatchIds = DB::table('user_batches')
                ->where('student_id', $userId)
                ->pluck('batch_id')
                ->toArray();

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
                'remarks' => 'nullable|string|max:1000',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors()->toArray());
            }

            // Handle file upload
            $file = $request->file('file');
            $fileName = time() . '_' . $userId . '_' . $file->getClientOriginalName();
            $filePath = $file->storeAs('Task_Submissions', $fileName, 'public');

            // Check if submission already exists
            $submission = SubmittedTask::where('task_id', $task->id)
                ->where('student_id', $userId)
                ->first();

            if ($submission) {
                // Update existing submission
                // Delete old file if exists
                if ($submission->file_path && Storage::disk('public')->exists($submission->file_path)) {
                    Storage::disk('public')->delete($submission->file_path);
                }

                $submission->file_path = $filePath;
                $submission->remarks = $request->input('remarks');
                
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
                    'file_path' => $filePath,
                    'remarks' => $request->input('remarks'),
                ];
                
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
     * Check if a task can be submitted (before or on due date).
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
            $now = now();
            $dueDate = \Carbon\Carbon::parse($task->expiry_date);

            // Can submit if current time is before or equal to due date
            return $now->lte($dueDate);
        } catch (\Exception $e) {
            // If date parsing fails, allow submission
            return true;
        }
    }
}

