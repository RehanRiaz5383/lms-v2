<?php

namespace App\Http\Controllers;

use App\Models\Batch;
use App\Models\Subject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BatchController extends ApiController
{
    /**
     * Get list of batches with pagination, filters, and sorting.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Batch::with('subjects');

        // If user is a teacher or CR (has teacher/CR role), only show batches assigned to them
        if ($user) {
            $user->load('roles');
            $hasTeacherRole = $user->roles->contains(function ($role) {
                $title = strtolower($role->title);
                return $title === 'teacher' || $title === 'class representative (cr)';
            });
            
            // If user has teacher/CR role but NOT admin role, filter batches
            $hasAdminRole = $user->roles->contains(function ($role) {
                return strtolower($role->title) === 'admin';
            }) || $user->user_type == 1;
            
            if ($hasTeacherRole && !$hasAdminRole) {
                // Only show batches assigned to this teacher/CR
                $query->whereHas('users', function ($q) use ($user) {
                    $q->where('users.id', $user->id);
                });
            }
        }

        // Search filter
        if ($request->has('search') && !empty($request->get('search'))) {
            $search = $request->get('search');
            $query->where('title', 'like', "%{$search}%");
        }

        // Active filter
        if ($request->has('active') && $request->get('active') !== '' && $request->get('active') !== null) {
            $query->where('active', $request->get('active'));
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        
        if (in_array($sortBy, ['created_at', 'updated_at', 'title'])) {
            $query->orderBy($sortBy, $sortOrder);
        }

        // Pagination
        $perPage = $request->get('per_page', 15);
        $batches = $query->paginate($perPage);

        return $this->success($batches, 'Batches retrieved successfully');
    }

    /**
     * Get a single batch by ID.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        $batch = Batch::with('subjects')->find($id);

        if (!$batch) {
            return $this->notFound('Batch not found');
        }

        return $this->success($batch, 'Batch retrieved successfully');
    }

    /**
     * Create a new batch.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'active' => 'sometimes|boolean',
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors(), 'Validation failed');
        }

        $batch = Batch::create($validated);
        $batch->load('subjects');

        return $this->success($batch, 'Batch created successfully', 201);
    }

    /**
     * Update a batch.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $batch = Batch::find($id);

        if (!$batch) {
            return $this->notFound('Batch not found');
        }

        try {
            $validated = $request->validate([
                'title' => 'sometimes|string|max:255',
                'active' => 'sometimes|boolean',
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors(), 'Validation failed');
        }

        $batch->update($validated);
        $batch->load('subjects');

        return $this->success($batch, 'Batch updated successfully');
    }

    /**
     * Delete a batch (soft delete).
     *
     * @param int $id
     * @return JsonResponse
     */
    public function destroy(int $id): JsonResponse
    {
        $batch = Batch::find($id);

        if (!$batch) {
            return $this->notFound('Batch not found');
        }

        $batch->delete();

        return $this->success(null, 'Batch deleted successfully');
    }

    /**
     * Assign subjects to batch.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function assignSubjects(Request $request, int $id): JsonResponse
    {
        $batch = Batch::find($id);

        if (!$batch) {
            return $this->notFound('Batch not found');
        }

        try {
            $validated = $request->validate([
                'subject_ids' => 'required|array',
                'subject_ids.*' => 'exists:subjects,id',
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors(), 'Validation failed');
        }

        $batch->subjects()->sync($validated['subject_ids']);
        $batch->load('subjects');

        return $this->success($batch, 'Subjects assigned successfully');
    }

    /**
     * Get available subjects for assignment (subjects assigned to this batch).
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function getAvailableSubjects(Request $request, int $id): JsonResponse
    {
        $batch = Batch::with('subjects')->find($id);

        if (!$batch) {
            return $this->notFound('Batch not found');
        }

        // Get ALL active subjects (not just assigned ones)
        $query = Subject::where('active', true);

        // Search filter
        if ($request->has('search') && !empty($request->get('search'))) {
            $search = $request->get('search');
            $query->where('title', 'like', "%{$search}%");
        }

        // Get all available subjects
        $subjects = $query->orderBy('title', 'asc')->get();
        
        // Get assigned subject IDs for reference
        $assignedSubjectIds = $batch->subjects->pluck('id')->toArray();

        return $this->success([
            'subjects' => $subjects,
            'assigned_ids' => $assignedSubjectIds,
        ], 'Subjects retrieved successfully');
    }

    /**
     * Get students assigned to a batch.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function getStudents(Request $request, int $id): JsonResponse
    {
        $batch = Batch::find($id);

        if (!$batch) {
            return $this->notFound('Batch not found');
        }

        // Get user IDs assigned to this batch
        $batchUserIds = DB::table('user_batches')
            ->where('batch_id', $id)
            ->pluck('user_id')
            ->toArray();

        if (empty($batchUserIds)) {
            return $this->success([
                'data' => [],
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => 15,
                'total' => 0,
            ], 'Students retrieved successfully');
        }

        // Get students assigned to this batch (users with student role)
        $query = \App\Models\User::whereIn('id', $batchUserIds)
            ->where(function ($q) {
                $q->whereHas('roles', function ($roleQuery) {
                    $roleQuery->where('user_types.title', 'Student');
                })->orWhere(function ($q2) {
                    $q2->where('user_type', 2) // Backward compatibility
                       ->whereDoesntHave('roles'); // Only use user_type if no roles exist
                });
            })
            ->with(['userType', 'roles']);

        // Search filter
        if ($request->has('search') && !empty($request->get('search'))) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%");
            });
        }

        // Block status filter
        if ($request->has('block') && $request->get('block') !== '' && $request->get('block') !== null) {
            $query->where('block', $request->get('block'));
        }

        // Pagination
        $perPage = $request->get('per_page', 15);
        $students = $query->paginate($perPage);

        // Transform students to include picture_url
        $students->getCollection()->transform(function ($student) {
            $student->picture_url = $student->picture_url;
            return $student;
        });

        return $this->success($students, 'Students retrieved successfully');
    }
}

