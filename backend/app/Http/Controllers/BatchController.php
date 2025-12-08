<?php

namespace App\Http\Controllers;

use App\Models\Batch;
use App\Models\Subject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
        $query = Batch::with('subjects');

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

        // Get only subjects that are assigned to this batch
        $query = $batch->subjects()->where('subjects.active', true);

        // Search filter
        if ($request->has('search') && !empty($request->get('search'))) {
            $search = $request->get('search');
            $query->where('subjects.title', 'like', "%{$search}%");
        }

        // Get subjects assigned to this batch
        $subjects = $query->get();
        
        // Get assigned subject IDs for reference
        $assignedSubjectIds = $subjects->pluck('id')->toArray();

        return $this->success([
            'subjects' => $subjects,
            'assigned_ids' => $assignedSubjectIds,
        ], 'Subjects retrieved successfully');
    }
}

