<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\SubmittedTask;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class TaskController extends ApiController
{
    /**
     * Get all tasks for a batch and subject.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            // Check if tasks table exists
            if (!DB::getSchemaBuilder()->hasTable('tasks')) {
                return $this->success([], 'Tasks table does not exist');
            }

            $query = Task::query();

            // Filter by batch_id if provided
            if ($request->has('batch_id')) {
                $query->where('batch_id', $request->input('batch_id'));
            }

            // Filter by subject_id if provided
            if ($request->has('subject_id')) {
                $query->where('subject_id', $request->input('subject_id'));
            }

            // Filter by both batch and subject
            if ($request->has('batch_id') && $request->has('subject_id')) {
                $query->where('batch_id', $request->input('batch_id'))
                      ->where('subject_id', $request->input('subject_id'));
            }

            // Only include creator in eager loading if column exists
            $hasCreatedByColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'created_by');
            $withRelations = ['batch', 'subject'];
            if ($hasCreatedByColumn) {
                $withRelations[] = 'creator';
            }
            
            $tasks = $query->with($withRelations)
                ->orderBy('created_at', 'desc')
                ->get();

            // Check if submitted_tasks table exists for submission counts
            $hasSubmittedTasksTable = DB::getSchemaBuilder()->hasTable('submitted_tasks');
            $hasGradedAtColumn = $hasSubmittedTasksTable && DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'graded_at');

            // Attach submission counts
            $tasks = $tasks->map(function ($task) use ($hasSubmittedTasksTable, $hasGradedAtColumn) {
                if ($hasSubmittedTasksTable) {
                    $task->submissions_count = SubmittedTask::where('task_id', $task->id)->count();
                    
                    // Only check graded_at if column exists
                    if ($hasGradedAtColumn) {
                        $task->graded_count = SubmittedTask::where('task_id', $task->id)
                            ->whereNotNull('graded_at')
                            ->count();
                    } else {
                        $task->graded_count = 0;
                    }
                } else {
                    $task->submissions_count = 0;
                    $task->graded_count = 0;
                }
                
                // Ensure expiry_date and description are properly formatted
                $hasExpiryDateColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'expiry_date');
                if ($hasExpiryDateColumn && $task->expiry_date) {
                    $task->expiry_date = is_string($task->expiry_date) ? $task->expiry_date : $task->expiry_date->toDateTimeString();
                    // Also set due_date for frontend compatibility
                    $task->due_date = $task->expiry_date;
                } else {
                    $task->expiry_date = null;
                    $task->due_date = null;
                }
                
                $hasDescriptionColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'description');
                if (!$hasDescriptionColumn) {
                    $task->description = null;
                }

                return $task;
            });

            return $this->success($tasks, 'Tasks retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to retrieve tasks', 500);
        }
    }

    /**
     * Create a new task.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        // Check if tasks table exists
        if (!DB::getSchemaBuilder()->hasTable('tasks')) {
            return $this->error(null, 'Tasks table does not exist. Please run migrations.', 500);
        }

        // Check which columns exist before validation
        $hasExpiryDateColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'expiry_date');
        
        $validationRules = [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'batch_id' => 'required|exists:batches,id',
            'subject_id' => 'required|exists:subjects,id',
            'user_id' => 'nullable|exists:users,id', // Optional: assign to specific student
            'task_file' => 'nullable|file|max:10240', // 10MB max for task file
        ];
        
        // Only require expiry_date if column exists
        if ($hasExpiryDateColumn) {
            $validationRules['due_date'] = 'required|date'; // Frontend sends as 'due_date'
        }
        
        $validator = Validator::make($request->all(), $validationRules);

        if ($validator->fails()) {
            return $this->validationError($validator->errors()->toArray());
        }

        try {
            $user = auth()->user();

            // Check which columns exist in the tasks table
            $hasDescriptionColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'description');
            $hasUserIdColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'user_id');
            $hasStatusColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'status');
            $hasCreatedByColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'created_by');
            $hasExpiryDateColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'expiry_date');

            $taskData = [
                'title' => $request->input('title'),
                'batch_id' => $request->input('batch_id'),
                'subject_id' => $request->input('subject_id'),
            ];
            
            // Only include created_by if column exists
            if ($hasCreatedByColumn) {
                $taskData['created_by'] = $user->id;
            }
            
            // Only include expiry_date if column exists (map from due_date to expiry_date)
            if ($hasExpiryDateColumn && $request->has('due_date') && $request->input('due_date')) {
                $taskData['expiry_date'] = $request->input('due_date');
            }

            // Only include description if column exists
            if ($hasDescriptionColumn && $request->has('description')) {
                $taskData['description'] = $request->input('description');
            }

            // Only include user_id if column exists
            if ($hasUserIdColumn && $request->has('user_id') && $request->input('user_id')) {
                $taskData['user_id'] = $request->input('user_id');
            }

            // Only include status if column exists
            if ($hasStatusColumn) {
                $taskData['status'] = 'active';
            }

            $task = Task::create($taskData);

            // Handle task file upload if provided
            if ($request->hasFile('task_file')) {
                $file = $request->file('task_file');
                $fileName = time() . '_' . $task->id . '_' . $file->getClientOriginalName();
                $filePath = $file->storeAs('Task_Files', $fileName, 'public');
                
                // Check if task_files table exists or if we need to store in a different way
                // For now, we'll store the file path in a separate table or add a column if it exists
                if (DB::getSchemaBuilder()->hasColumn('tasks', 'file_path')) {
                    $task->file_path = $filePath;
                    $task->save();
                } else if (DB::getSchemaBuilder()->hasTable('task_files')) {
                    // Store in separate task_files table if it exists
                    DB::table('task_files')->insert([
                        'task_id' => $task->id,
                        'file_path' => $filePath,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            // Only load creator if column exists
            $hasCreatedByColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'created_by');
            $loadRelations = ['batch', 'subject'];
            if ($hasCreatedByColumn) {
                $loadRelations[] = 'creator';
            }
            $task->load($loadRelations);

            return $this->success($task, 'Task created successfully', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to create task', 500);
        }
    }

    /**
     * Get a specific task with all submissions.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        try {
            // Check if tasks table exists
            if (!DB::getSchemaBuilder()->hasTable('tasks')) {
                return $this->error(null, 'Tasks table does not exist', 404);
            }

            // Only include creator in eager loading if column exists
            $hasCreatedByColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'created_by');
            $withRelations = ['batch', 'subject'];
            if ($hasCreatedByColumn) {
                $withRelations[] = 'creator';
            }
            
            $task = Task::with($withRelations)
                ->find($id);

            if (!$task) {
                return $this->notFound('Task not found');
            }

            // Get all submissions with user details
            $hasSubmittedTasksTable = DB::getSchemaBuilder()->hasTable('submitted_tasks');
            $submissions = collect([]);
            
            if ($hasSubmittedTasksTable) {
                // Use direct join query to get user data
                $hasSubmittedAtColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'submitted_at');
                $orderByColumn = $hasSubmittedAtColumn ? 'submitted_tasks.submitted_at' : 'submitted_tasks.created_at';
                
                $submissions = DB::table('submitted_tasks')
                    ->join('users', 'users.id', '=', 'submitted_tasks.student_id')
                    ->where('submitted_tasks.task_id', $task->id)
                    ->select(
                        'submitted_tasks.*',
                        'users.name as user_name',
                        'users.first_name',
                        'users.last_name',
                        'users.email as user_email'
                    )
                    ->orderBy($orderByColumn, 'desc')
                    ->get();

                // Convert to collection and add file_url
                $submissions = $submissions->map(function ($submission) {
                    // Generate file_url if answer_file exists (safely check property)
                    // Check for answer_file first, then fallback to file_path for backward compatibility
                    $filePath = isset($submission->answer_file) ? $submission->answer_file : 
                                (isset($submission->file_path) ? $submission->file_path : null);
                    if ($filePath) {
                        $useDirectStorage = env('USE_DIRECT_STORAGE', false);
                        $appUrl = env('APP_URL', 'http://localhost:8000');
                        if ($useDirectStorage) {
                            $submission->file_url = $appUrl . '/storage.php?file=' . urlencode($filePath);
                        } else {
                            $submission->file_url = $appUrl . '/load-storage/' . ltrim($filePath, '/');
                        }
                    } else {
                        $submission->file_url = null;
                    }
                    
                    // Format user name from available fields (safely check properties)
                    $userName = isset($submission->user_name) ? $submission->user_name : null;
                    $firstName = isset($submission->first_name) ? $submission->first_name : '';
                    $lastName = isset($submission->last_name) ? $submission->last_name : '';
                    $userEmail = isset($submission->user_email) ? $submission->user_email : null;
                    
                    $submission->user_name = $userName ?? 
                        trim($firstName . ' ' . $lastName) ?? 
                        $userEmail ?? 
                        'Unknown User';
                    
                    return $submission;
                });
            }

            $task->submissions = $submissions;
            $task->submissions_count = $submissions->count();
            
            // Check if graded_at column exists before counting
            $hasGradedAtColumn = $hasSubmittedTasksTable && DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'graded_at');
            if ($hasGradedAtColumn) {
                $task->graded_count = $submissions->whereNotNull('graded_at')->count();
            } else {
                $task->graded_count = 0;
            }

            // Ensure expiry_date and description are properly formatted
            $hasExpiryDateColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'expiry_date');
            if ($hasExpiryDateColumn && $task->expiry_date) {
                $task->expiry_date = is_string($task->expiry_date) ? $task->expiry_date : $task->expiry_date->toDateTimeString();
                // Also set due_date for frontend compatibility
                $task->due_date = $task->expiry_date;
            } else {
                $task->expiry_date = null;
                $task->due_date = null;
            }
            
            $hasDescriptionColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'description');
            if (!$hasDescriptionColumn) {
                $task->description = null;
            }
            
            // Add file_url if file_path exists
            $hasFilePathColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'file_path');
            if ($hasFilePathColumn && isset($task->file_path) && $task->file_path) {
                $useDirectStorage = env('USE_DIRECT_STORAGE', false);
                $appUrl = env('APP_URL', 'http://localhost:8000');
                if ($useDirectStorage) {
                    $task->file_url = $appUrl . '/storage.php?file=' . urlencode($task->file_path);
                } else {
                    $task->file_url = $appUrl . '/load-storage/' . ltrim($task->file_path, '/');
                }
            } else {
                // Check task_files table if it exists
                if (DB::getSchemaBuilder()->hasTable('task_files')) {
                    $taskFile = DB::table('task_files')->where('task_id', $task->id)->first();
                    if ($taskFile && isset($taskFile->file_path)) {
                        $useDirectStorage = env('USE_DIRECT_STORAGE', false);
                        $appUrl = env('APP_URL', 'http://localhost:8000');
                        if ($useDirectStorage) {
                            $task->file_url = $appUrl . '/storage.php?file=' . urlencode($taskFile->file_path);
                        } else {
                            $task->file_url = $appUrl . '/load-storage/' . ltrim($taskFile->file_path, '/');
                        }
                        $task->file_path = $taskFile->file_path;
                    }
                }
            }

            return $this->success($task, 'Task retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to retrieve task', 500);
        }
    }

    /**
     * Update a task.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, int $id): JsonResponse
    {
        // Check which columns exist before validation
        $hasExpiryDateColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'expiry_date');
        $hasStatusColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'status');
        
        $validationRules = [
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
        ];
        
        // Only validate expiry_date if column exists (map from due_date to expiry_date)
        if ($hasExpiryDateColumn) {
            $validationRules['due_date'] = 'sometimes|required|date'; // Frontend sends as 'due_date'
        }
        
        // Only validate status if column exists
        if ($hasStatusColumn) {
            $validationRules['status'] = 'sometimes|in:active,inactive';
        }
        
        $validator = Validator::make($request->all(), $validationRules);

        if ($validator->fails()) {
            return $this->validationError($validator->errors()->toArray());
        }

        try {
            $task = Task::find($id);

            if (!$task) {
                return $this->notFound('Task not found');
            }

            // Check which columns exist
            $hasDescriptionColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'description');
            $hasExpiryDateColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'expiry_date');
            $hasStatusColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'status');
            
            $updateData = ['title' => $request->input('title')];
            
            // Only include description if column exists
            if ($hasDescriptionColumn && $request->has('description')) {
                $updateData['description'] = $request->input('description');
            }
            
            // Only include expiry_date if column exists (map from due_date to expiry_date)
            if ($hasExpiryDateColumn && $request->has('due_date') && $request->input('due_date')) {
                $updateData['expiry_date'] = $request->input('due_date');
            }
            
            // Only include status if column exists
            if ($hasStatusColumn && $request->has('status')) {
                $updateData['status'] = $request->input('status');
            }

            $task->fill($updateData);
            $task->save();

            // Only load creator if column exists
            $hasCreatedByColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'created_by');
            $loadRelations = ['batch', 'subject'];
            if ($hasCreatedByColumn) {
                $loadRelations[] = 'creator';
            }
            $task->load($loadRelations);

            return $this->success($task, 'Task updated successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to update task', 500);
        }
    }

    /**
     * Delete a task.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $task = Task::find($id);

            if (!$task) {
                return $this->notFound('Task not found');
            }

            // Delete associated submissions and their files
            $submissions = SubmittedTask::where('task_id', $task->id)->get();
            foreach ($submissions as $submission) {
                if ($submission->file_path && Storage::disk('public')->exists($submission->file_path)) {
                    Storage::disk('public')->delete($submission->file_path);
                }
                $submission->delete();
            }

            $task->delete();

            return $this->success(null, 'Task deleted successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to delete task', 500);
        }
    }

    /**
     * Get all submissions for a task.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function getSubmissions(int $id): JsonResponse
    {
        try {
            // Check if tables exist
            if (!DB::getSchemaBuilder()->hasTable('tasks')) {
                return $this->error(null, 'Tasks table does not exist', 404);
            }

            $task = Task::find($id);

            if (!$task) {
                return $this->notFound('Task not found');
            }

            $hasSubmittedTasksTable = DB::getSchemaBuilder()->hasTable('submitted_tasks');
            $submissions = collect([]);
            
            if ($hasSubmittedTasksTable) {
                // Use direct join query to get user data
                $hasSubmittedAtColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'submitted_at');
                $orderByColumn = $hasSubmittedAtColumn ? 'submitted_tasks.submitted_at' : 'submitted_tasks.created_at';
                
                $submissions = DB::table('submitted_tasks')
                    ->join('users', 'users.id', '=', 'submitted_tasks.student_id')
                    ->where('submitted_tasks.task_id', $task->id)
                    ->select(
                        'submitted_tasks.*',
                        'users.name as user_name',
                        'users.first_name',
                        'users.last_name',
                        'users.email as user_email'
                    )
                    ->orderBy($orderByColumn, 'desc')
                    ->get();

                // Convert to collection and add file_url
                $submissions = $submissions->map(function ($submission) {
                    // Generate file_url if answer_file exists (safely check property)
                    // Check for answer_file first, then fallback to file_path for backward compatibility
                    $filePath = isset($submission->answer_file) ? $submission->answer_file : 
                                (isset($submission->file_path) ? $submission->file_path : null);
                    if ($filePath) {
                        $useDirectStorage = env('USE_DIRECT_STORAGE', false);
                        $appUrl = env('APP_URL', 'http://localhost:8000');
                        if ($useDirectStorage) {
                            $submission->file_url = $appUrl . '/storage.php?file=' . urlencode($filePath);
                        } else {
                            $submission->file_url = $appUrl . '/load-storage/' . ltrim($filePath, '/');
                        }
                    } else {
                        $submission->file_url = null;
                    }
                    
                    // Format user name from available fields (safely check properties)
                    $userName = isset($submission->user_name) ? $submission->user_name : null;
                    $firstName = isset($submission->first_name) ? $submission->first_name : '';
                    $lastName = isset($submission->last_name) ? $submission->last_name : '';
                    $userEmail = isset($submission->user_email) ? $submission->user_email : null;
                    
                    $submission->user_name = $userName ?? 
                        trim($firstName . ' ' . $lastName) ?? 
                        $userEmail ?? 
                        'Unknown User';
                    
                    return $submission;
                });
            }

            return $this->success($submissions, 'Submissions retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to retrieve submissions', 500);
        }
    }

    /**
     * Grade a submission (add marks and teacher remarks).
     *
     * @param Request $request
     * @param int $taskId
     * @param int $submissionId
     * @return JsonResponse
     */
    public function gradeSubmission(Request $request, int $taskId, int $submissionId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'marks' => 'nullable|numeric|min:0|max:100',
            'teacher_remarks' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors()->toArray());
        }

        try {
            $task = Task::find($taskId);

            if (!$task) {
                return $this->notFound('Task not found');
            }

            $submission = SubmittedTask::where('task_id', $taskId)
                ->where('id', $submissionId)
                ->first();

            if (!$submission) {
                return $this->notFound('Submission not found');
            }

            // Check which columns exist in submitted_tasks table
            $hasMarksColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'marks');
            $hasTeacherRemarksColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'teacher_remarks');
            $hasGradedAtColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'graded_at');
            $hasStatusColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'status');

            if ($hasMarksColumn) {
                $submission->marks = $request->input('marks');
            }
            if ($hasTeacherRemarksColumn) {
                $submission->teacher_remarks = $request->input('teacher_remarks');
            }
            if ($hasGradedAtColumn) {
                $submission->graded_at = now();
            }
            if ($hasStatusColumn) {
                $submission->status = 'graded';
            }
            $submission->save();

            $submission->load(['user', 'task']);

            return $this->success($submission, 'Submission graded successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to grade submission', 500);
        }
    }
}

