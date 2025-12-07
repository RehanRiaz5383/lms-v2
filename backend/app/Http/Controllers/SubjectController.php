<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SubjectController extends ApiController
{
    /**
     * Get list of subjects with pagination, filters, and sorting.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $query = Subject::query();

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
        $subjects = $query->paginate($perPage);

        return $this->success($subjects, 'Subjects retrieved successfully');
    }

    /**
     * Get a single subject by ID.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        $subject = Subject::find($id);

        if (!$subject) {
            return $this->notFound('Subject not found');
        }

        return $this->success($subject, 'Subject retrieved successfully');
    }

    /**
     * Create a new subject.
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

        $subject = Subject::create($validated);

        return $this->success($subject, 'Subject created successfully', 201);
    }

    /**
     * Update a subject.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $subject = Subject::find($id);

        if (!$subject) {
            return $this->notFound('Subject not found');
        }

        try {
            $validated = $request->validate([
                'title' => 'sometimes|string|max:255',
                'active' => 'sometimes|boolean',
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors(), 'Validation failed');
        }

        $subject->update($validated);

        return $this->success($subject, 'Subject updated successfully');
    }

    /**
     * Delete a subject (soft delete).
     *
     * @param int $id
     * @return JsonResponse
     */
    public function destroy(int $id): JsonResponse
    {
        $subject = Subject::find($id);

        if (!$subject) {
            return $this->notFound('Subject not found');
        }

        $subject->delete();

        return $this->success(null, 'Subject deleted successfully');
    }
}

