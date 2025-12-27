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
            $hasMarksColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'marks');
            $hasTotalMarksColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'total_marks');

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
            // Since validation requires due_date, it should always be present
            if ($hasExpiryDateColumn && $request->has('due_date')) {
                $dueDate = $request->input('due_date');
                // Only set if not empty (validation will catch empty values)
                if (!empty($dueDate)) {
                    $taskData['expiry_date'] = $dueDate;
                }
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

            // Only include marks if column exists (check both marks and total_marks)
            if ($hasMarksColumn && $request->has('marks') && $request->input('marks') !== '') {
                $taskData['marks'] = $request->input('marks');
            } else if ($hasTotalMarksColumn && $request->has('marks') && $request->input('marks') !== '') {
                $taskData['total_marks'] = $request->input('marks');
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
            // Eager load files relationship if files table exists
            if (DB::getSchemaBuilder()->hasTable('files')) {
                $loadRelations[] = 'files';
            }
            $task->load($loadRelations);

            // Create notifications for assigned students
            if ($task->batch_id) {
                // Get all students in the batch
                $studentIds = DB::table('user_batches')
                    ->where('batch_id', $task->batch_id)
                    ->pluck('user_id')
                    ->toArray();

                foreach ($studentIds as $studentId) {
                    $this->createTaskAssignedNotification($task, $studentId);
                }
            } else if ($request->has('user_id') && $request->input('user_id')) {
                // Task assigned to specific student
                $this->createTaskAssignedNotification($task, $request->input('user_id'));
            }

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
            $hasMarksColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'marks');
            $hasTotalMarksColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'total_marks');
            
            $updateData = ['title' => $request->input('title')];
            
            // Only include description if column exists
            if ($hasDescriptionColumn && $request->has('description')) {
                $updateData['description'] = $request->input('description');
            }
            
            // Only include expiry_date if column exists (map from due_date to expiry_date)
            if ($hasExpiryDateColumn && $request->has('due_date')) {
                $dueDate = $request->input('due_date');
                // Only set if not empty (validation will catch empty values)
                if (!empty($dueDate)) {
                    $updateData['expiry_date'] = $dueDate;
                }
            }
            
            // Only include status if column exists
            if ($hasStatusColumn && $request->has('status')) {
                $updateData['status'] = $request->input('status');
            }

            // Only include marks if column exists (check both marks and total_marks)
            if ($hasMarksColumn && $request->has('marks')) {
                $updateData['marks'] = $request->input('marks') !== '' ? $request->input('marks') : null;
            } else if ($hasTotalMarksColumn && $request->has('marks')) {
                $updateData['total_marks'] = $request->input('marks') !== '' ? $request->input('marks') : null;
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
            $hasAnswerFileColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'answer_file');
            $hasFilePathColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'file_path');
            
            foreach ($submissions as $submission) {
                // Check for answer_file first, then file_path
                $filePath = null;
                if ($hasAnswerFileColumn && isset($submission->answer_file)) {
                    $filePath = $submission->answer_file;
                } else if ($hasFilePathColumn && isset($submission->file_path)) {
                    $filePath = $submission->file_path;
                }
                
                if ($filePath && Storage::disk('public')->exists($filePath)) {
                    Storage::disk('public')->delete($filePath);
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
            'obtained_marks' => 'nullable|numeric|min:0',
            'instructor_comments' => 'nullable|string|max:1000',
            'marks' => 'nullable|numeric|min:0|max:100', // Keep for backward compatibility
            'teacher_remarks' => 'nullable|string|max:1000', // Keep for backward compatibility
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors()->toArray());
        }

        try {
            // Load task with relationships
            $task = Task::with(['subject', 'batch'])->find($taskId);

            if (!$task) {
                return $this->notFound('Task not found');
            }

            $submission = SubmittedTask::where('task_id', $taskId)
                ->where('id', $submissionId)
                ->first();

            if (!$submission) {
                return $this->notFound('Submission not found');
            }
            
            // Log submission data for debugging
            \Log::info('Grading submission', [
                'submission_id' => $submissionId,
                'task_id' => $taskId,
                'submission_student_id' => $submission->student_id ?? null,
                'submission_user_id' => $submission->user_id ?? null,
                'submission_attributes' => $submission->getAttributes() ?? null,
            ]);

            // Check which columns exist in submitted_tasks table
            $hasObtainedMarksColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'obtained_marks');
            $hasInstructorCommentsColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'instructor_comments');
            $hasMarksColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'marks');
            $hasTeacherRemarksColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'teacher_remarks');
            $hasGradedAtColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'graded_at');
            $hasStatusColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'status');

            // Use obtained_marks if column exists, otherwise fallback to marks
            if ($hasObtainedMarksColumn) {
                $submission->obtained_marks = $request->input('obtained_marks') ?? $request->input('marks');
            } else if ($hasMarksColumn) {
                $submission->marks = $request->input('obtained_marks') ?? $request->input('marks');
            }

            // Use instructor_comments if column exists, otherwise fallback to teacher_remarks
            if ($hasInstructorCommentsColumn) {
                $submission->instructor_comments = $request->input('instructor_comments') ?? $request->input('teacher_remarks');
            } else if ($hasTeacherRemarksColumn) {
                $submission->teacher_remarks = $request->input('instructor_comments') ?? $request->input('teacher_remarks');
            }

            // Check if this is an update (submission already has grades) BEFORE saving new values
            $isUpdate = false;
            if (DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'obtained_marks')) {
                $isUpdate = !empty($submission->obtained_marks);
            } else if (DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'marks')) {
                $isUpdate = !empty($submission->marks);
            }

            if ($hasGradedAtColumn) {
                $submission->graded_at = now();
            }
            if ($hasStatusColumn) {
                $submission->status = 'graded';
            }
            
            // Set is_checked to 1 if column exists
            $hasIsCheckedColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'is_checked');
            if ($hasIsCheckedColumn) {
                $submission->is_checked = 1;
            }

            $submission->save();

            // Reload task with relationships to ensure they're available for notification
            $task->refresh();
            $task->load(['subject', 'batch']);

            // Create notification for student about grade
            $marks = $request->input('obtained_marks') ?? $request->input('marks');
            $this->createGradeNotification($submission, $task, $marks, $isUpdate);

            $submission->load(['user', 'task']);

            return $this->success($submission, 'Submission graded successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to grade submission', 500);
        }
    }

    /**
     * Upload task submission for a student (Admin/Teacher only).
     * This allows admins to upload task files on behalf of students, even after expiry date.
     *
     * @param Request $request
     * @param int $taskId
     * @return JsonResponse
     */
    public function uploadStudentSubmission(Request $request, int $taskId): JsonResponse
    {
        try {
            $task = Task::find($taskId);

            if (!$task) {
                return $this->notFound('Task not found');
            }

            // Validate request
            $validator = Validator::make($request->all(), [
                'student_id' => 'required|integer|exists:users,id',
                'file' => 'required|file|max:10240', // 10MB max
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors()->toArray());
            }

            $studentId = $request->input('student_id');
            $file = $request->file('file');

            // Verify student exists and is in the same batch as the task
            $student = DB::table('users')->where('id', $studentId)->first();
            if (!$student) {
                return $this->notFound('Student not found');
            }

            // Check if student is in the task's batch
            if (DB::getSchemaBuilder()->hasColumn('tasks', 'batch_id') && $task->batch_id) {
                $isInBatch = DB::table('user_batches')
                    ->where(function($query) use ($studentId) {
                        if (DB::getSchemaBuilder()->hasColumn('user_batches', 'user_id')) {
                            $query->where('user_id', $studentId);
                        } else if (DB::getSchemaBuilder()->hasColumn('user_batches', 'student_id')) {
                            $query->where('student_id', $studentId);
                        }
                    })
                    ->where('batch_id', $task->batch_id)
                    ->exists();

                if (!$isInBatch) {
                    return $this->error('Student is not in the task\'s batch', 'Invalid student', 400);
                }
            }

            // Handle file upload - store in submitted_tasks folder
            $fileName = time() . '_' . $studentId . '_' . $file->getClientOriginalName();
            $filePath = $file->storeAs('submitted_tasks', $fileName, 'public');

            // Check if submission already exists
            $submission = SubmittedTask::where('task_id', $taskId)
                ->where('student_id', $studentId)
                ->first();

            // Check which column exists for file storage
            $hasAnswerFileColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'answer_file');
            $hasFilePathColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'file_path');
            $fileColumn = $hasAnswerFileColumn ? 'answer_file' : ($hasFilePathColumn ? 'file_path' : null);

            if ($submission) {
                // Update existing submission
                // Delete old file if exists
                $oldFilePath = $hasAnswerFileColumn ? $submission->answer_file : ($hasFilePathColumn ? $submission->file_path : null);
                if ($oldFilePath && Storage::disk('public')->exists($oldFilePath)) {
                    Storage::disk('public')->delete($oldFilePath);
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
                    'task_id' => $taskId,
                    'student_id' => $studentId,
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

            return $this->success($submission, 'Task submission uploaded successfully for student');
        } catch (\Exception $e) {
            \Log::error('Error uploading student submission: ' . $e->getMessage(), [
                'exception' => $e,
                'task_id' => $taskId,
            ]);
            return $this->error($e->getMessage(), 'Failed to upload task submission', 500);
        }
    }

    /**
     * Create notification for grade awarded/updated.
     *
     * @param SubmittedTask $submission
     * @param Task $task
     * @param float|null $marks
     * @param bool $isUpdate
     * @return void
     */
    private function createGradeNotification(SubmittedTask $submission, Task $task, $marks = null, $isUpdate = false): void
    {
        try {
            if (!DB::getSchemaBuilder()->hasTable('notifications')) {
                \Log::warning('Notifications table does not exist');
                return;
            }

            // Get student_id - check both student_id and user_id columns
            $studentId = null;
            if (is_object($submission)) {
                // Try multiple ways to get student_id
                if (property_exists($submission, 'student_id') && $submission->student_id) {
                    $studentId = $submission->student_id;
                } else if (property_exists($submission, 'user_id') && $submission->user_id) {
                    $studentId = $submission->user_id;
                } else if (method_exists($submission, 'getAttribute')) {
                    $studentId = $submission->getAttribute('student_id') ?? $submission->getAttribute('user_id') ?? null;
                } else if (method_exists($submission, 'getAttributes')) {
                    $attrs = $submission->getAttributes();
                    $studentId = $attrs['student_id'] ?? $attrs['user_id'] ?? null;
                } else {
                    // Try direct property access
                    $studentId = $submission->student_id ?? $submission->user_id ?? null;
                }
            }
            
            \Log::info('Creating grade notification', [
                'submission_id' => is_object($submission) ? ($submission->id ?? null) : null,
                'student_id' => $studentId,
                'task_id' => $task->id ?? null,
            ]);
            
            if (!$studentId) {
                \Log::warning('Cannot create grade notification: student_id not found', [
                    'submission_id' => is_object($submission) ? ($submission->id ?? null) : null,
                    'submission_class' => get_class($submission),
                ]);
                return;
            }

            // Ensure relationships are loaded
            if (!$task->relationLoaded('subject')) {
                $task->load('subject');
            }

            $taskTitle = $task->title ?? 'Task';
            $subjectTitle = $task->subject->title ?? 'Unknown Subject';
            $type = $isUpdate ? 'grade_updated' : 'grade_awarded';
            $title = $isUpdate ? 'Grade Updated' : 'Grade Awarded';
            $message = $isUpdate 
                ? "Your grade for task '{$taskTitle}' in {$subjectTitle} has been updated."
                : "You have been awarded a grade for task '{$taskTitle}' in {$subjectTitle}.";

            if ($marks !== null) {
                $message .= " Marks: {$marks}";
            }

            // Check which column structure exists
            $hasUserIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'user_id');
            $hasNotifiableIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'notifiable_id');
            $hasTypeColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'type');
            $hasTitleColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'title');
            $hasMessageColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'message');
            $hasDataColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'data');
            $hasReadColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'read');

            // If neither user_id nor notifiable_id exists, we can't create notification
            if (!$hasUserIdColumn && !$hasNotifiableIdColumn) {
                \Log::warning('Cannot create notification: neither user_id nor notifiable_id column exists');
                return;
            }

            $notificationData = [];

            if ($hasUserIdColumn) {
                $notificationData['user_id'] = $studentId;
            } else if ($hasNotifiableIdColumn) {
                $notificationData['notifiable_id'] = $studentId;
                $notificationData['notifiable_type'] = 'App\\Models\\User';
            }

            if ($hasTypeColumn) {
                $notificationData['type'] = $type;
            }

            if ($hasTitleColumn) {
                $notificationData['title'] = $title;
            }

            if ($hasMessageColumn) {
                $notificationData['message'] = $message;
            }

            if ($hasDataColumn) {
                // Store data as JSON string (works for both JSON and TEXT columns)
                $notificationData['data'] = json_encode([
                    'task_id' => $task->id,
                    'task_title' => $taskTitle,
                    'subject_id' => $task->subject_id,
                    'subject_title' => $subjectTitle,
                    'marks' => $marks,
                    'submission_id' => $submission->id,
                ]);
            }

            if ($hasReadColumn) {
                $notificationData['read'] = false;
            } else {
                // If read column doesn't exist, use read_at
                $hasReadAtColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'read_at');
                if ($hasReadAtColumn) {
                    // Leave read_at as null to indicate unread
                }
            }

            $notificationData['created_at'] = now();
            $notificationData['updated_at'] = now();

            // Check if id column is UUID (char(36)) or auto-increment
            $idColumnInfo = DB::select("SHOW COLUMNS FROM notifications WHERE Field = 'id'");
            $isUuidId = isset($idColumnInfo[0]) && strpos(strtolower($idColumnInfo[0]->Type), 'char') !== false;
            
            if ($isUuidId) {
                // Generate UUID for id
                $notificationData['id'] = \Illuminate\Support\Str::uuid()->toString();
            }
            // Otherwise, let database auto-generate the id

            \Log::info('Inserting notification', [
                'notification_data' => $notificationData,
                'has_user_id' => $hasUserIdColumn,
                'has_notifiable_id' => $hasNotifiableIdColumn,
                'is_uuid_id' => $isUuidId,
            ]);

            if (empty($notificationData)) {
                \Log::warning('Notification data is empty, cannot insert');
                return;
            }

            try {
                $inserted = DB::table('notifications')->insert($notificationData);
                
                \Log::info('Notification created successfully', [
                    'inserted' => $inserted,
                    'student_id' => $studentId,
                    'notification_id' => $isUuidId ? ($notificationData['id'] ?? null) : (DB::getPdo()->lastInsertId() ?? null),
                ]);
            } catch (\Exception $insertException) {
                \Log::error('Failed to insert notification', [
                    'error' => $insertException->getMessage(),
                    'error_trace' => $insertException->getTraceAsString(),
                    'notification_data' => $notificationData,
                    'student_id' => $studentId,
                ]);
                throw $insertException; // Re-throw to be caught by outer catch
            }
        } catch (\Exception $e) {
            \Log::error('Failed to create grade notification', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'submission_id' => is_object($submission) ? ($submission->id ?? null) : null,
                'task_id' => $task->id ?? null,
            ]);
        }
    }

    /**
     * Create notification for task assigned.
     *
     * @param Task $task
     * @param int $studentId
     * @return void
     */
    private function createTaskAssignedNotification(Task $task, int $studentId): void
    {
        try {
            if (!DB::getSchemaBuilder()->hasTable('notifications')) {
                return;
            }

            // Ensure relationships are loaded
            if (!$task->relationLoaded('subject')) {
                $task->load('subject');
            }
            if (!$task->relationLoaded('batch')) {
                $task->load('batch');
            }

            $taskTitle = $task->title ?? 'Task';
            $subjectTitle = $task->subject->title ?? 'Unknown Subject';
            $batchTitle = $task->batch->title ?? 'Unknown Batch';

            // Check which column structure exists
            $hasUserIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'user_id');
            $hasNotifiableIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'notifiable_id');
            $hasTypeColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'type');
            $hasTitleColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'title');
            $hasMessageColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'message');
            $hasDataColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'data');
            $hasReadColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'read');

            $notificationData = [];

            if ($hasUserIdColumn) {
                $notificationData['user_id'] = $studentId;
            } else if ($hasNotifiableIdColumn) {
                $notificationData['notifiable_id'] = $studentId;
                $notificationData['notifiable_type'] = 'App\\Models\\User';
            }

            if ($hasTypeColumn) {
                $notificationData['type'] = 'task_assigned';
            }

            if ($hasTitleColumn) {
                $notificationData['title'] = 'New Task Assigned';
            }

            if ($hasMessageColumn) {
                $notificationData['message'] = "A new task '{$taskTitle}' has been assigned to you in {$subjectTitle} ({$batchTitle}).";
            }

            if ($hasDataColumn) {
                $notificationData['data'] = json_encode([
                    'task_id' => $task->id,
                    'task_title' => $taskTitle,
                    'subject_id' => $task->subject_id,
                    'subject_title' => $subjectTitle,
                    'batch_id' => $task->batch_id,
                    'batch_title' => $batchTitle,
                    'expiry_date' => $task->expiry_date,
                ]);
            }

            if ($hasReadColumn) {
                $notificationData['read'] = false;
            }

            $notificationData['created_at'] = now();
            $notificationData['updated_at'] = now();

            DB::table('notifications')->insert($notificationData);
        } catch (\Exception $e) {
            // Silently fail - notifications are not critical
            \Log::error('Failed to create task assigned notification: ' . $e->getMessage());
        }
    }
}

