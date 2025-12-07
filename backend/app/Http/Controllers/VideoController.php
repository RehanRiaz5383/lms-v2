<?php

namespace App\Http\Controllers;

use App\Models\Video;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class VideoController extends ApiController
{
    /**
     * Get list of videos with pagination, filters, and sorting.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $query = Video::query();

        // Search filter (search in title and short_description)
        if ($request->has('search') && !empty($request->get('search'))) {
            $search = $request->get('search');
            $query->where(function($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('short_description', 'like', "%{$search}%");
            });
        }

        // Source type filter
        if ($request->has('source_type') && !empty($request->get('source_type'))) {
            $query->where('source_type', $request->get('source_type'));
        }

        // Date range filter
        if ($request->has('date_from') && !empty($request->get('date_from'))) {
            $query->whereDate('created_at', '>=', $request->get('date_from'));
        }
        if ($request->has('date_to') && !empty($request->get('date_to'))) {
            $query->whereDate('created_at', '<=', $request->get('date_to'));
        }

        // Sorting (default: latest to oldest)
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        
        if (in_array($sortBy, ['created_at', 'updated_at', 'title'])) {
            $query->orderBy($sortBy, $sortOrder);
        }

        // Pagination
        $perPage = $request->get('per_page', 15);
        $videos = $query->paginate($perPage);

        return $this->success($videos, 'Videos retrieved successfully');
    }

    /**
     * Get a single video by ID.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        $video = Video::find($id);

        if (!$video) {
            return $this->notFound('Video not found');
        }

        return $this->success($video, 'Video retrieved successfully');
    }

    /**
     * Create a new video.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'short_description' => 'nullable|string',
                'source_type' => 'required|in:internal,external',
                'video_file' => 'required_if:source_type,internal|file|mimes:mp4,avi,mov,wmv,flv,webm|max:102400', // 100MB max
                'external_url' => 'required_if:source_type,external|url|max:500',
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors(), 'Validation failed');
        }

        $videoData = [
            'title' => $validated['title'],
            'short_description' => $validated['short_description'] ?? null,
            'source_type' => $validated['source_type'],
        ];

        // Handle internal video upload
        if ($validated['source_type'] === 'internal' && $request->hasFile('video_file')) {
            $file = $request->file('video_file');
            $fileName = time() . '_' . $file->getClientOriginalName();
            $path = $file->storeAs('videos', $fileName, 'public');
            $videoData['path'] = $path; // Use path column for internal videos
            $videoData['internal_path'] = $path; // Also set internal_path for backward compatibility
        }

        // Handle external video URL
        if ($validated['source_type'] === 'external') {
            $videoData['external_url'] = $validated['external_url'];
        }

        $video = Video::create($videoData);

        return $this->success($video, 'Video created successfully', 201);
    }

    /**
     * Update an existing video.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $video = Video::find($id);

        if (!$video) {
            return $this->notFound('Video not found');
        }

        try {
            $validated = $request->validate([
                'title' => 'sometimes|required|string|max:255',
                'short_description' => 'nullable|string',
                'source_type' => 'sometimes|required|in:internal,external',
                'video_file' => 'sometimes|file|mimes:mp4,avi,mov,wmv,flv,webm|max:102400', // 100MB max
                'external_url' => 'required_if:source_type,external|nullable|url|max:500',
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors(), 'Validation failed');
        }

        $updateData = [];

        if (isset($validated['title'])) {
            $updateData['title'] = $validated['title'];
        }

        if (isset($validated['short_description'])) {
            $updateData['short_description'] = $validated['short_description'];
        }

        // Handle source type change
        if (isset($validated['source_type'])) {
            $updateData['source_type'] = $validated['source_type'];
            
            // If changing to external, clear internal path
            if ($validated['source_type'] === 'external') {
                $oldPath = $video->path ?? $video->internal_path;
                if ($oldPath && Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
                $updateData['path'] = null;
                $updateData['internal_path'] = null;
                $updateData['external_url'] = $validated['external_url'] ?? null;
            }
            
            // If changing to internal, clear external URL
            if ($validated['source_type'] === 'internal') {
                $updateData['external_url'] = null;
            }
        }

        // Handle new video file upload (only if source_type is internal)
        if ($request->hasFile('video_file')) {
            // Delete old video file if exists
            $oldPath = $video->path ?? $video->internal_path;
            if ($oldPath && Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }

            $file = $request->file('video_file');
            $fileName = time() . '_' . $file->getClientOriginalName();
            $path = $file->storeAs('videos', $fileName, 'public');
            $updateData['path'] = $path; // Use path column for internal videos
            $updateData['internal_path'] = $path; // Also set internal_path for backward compatibility
            $updateData['source_type'] = 'internal';
            $updateData['external_url'] = null;
        }

        // Handle external URL update
        if (isset($validated['external_url']) && $validated['source_type'] === 'external') {
            $updateData['external_url'] = $validated['external_url'];
        }

        $video->update($updateData);

        return $this->success($video, 'Video updated successfully');
    }

    /**
     * Delete a video.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function destroy(int $id): JsonResponse
    {
        $video = Video::find($id);

        if (!$video) {
            return $this->notFound('Video not found');
        }

        // Delete video file if it's internal
        if ($video->source_type === 'internal') {
            $videoPath = $video->path ?? $video->internal_path;
            if ($videoPath && Storage::disk('public')->exists($videoPath)) {
                Storage::disk('public')->delete($videoPath);
            }
        }

        $video->delete();

        return $this->success(null, 'Video deleted successfully');
    }

    /**
     * Get videos assigned to a batch and subject.
     *
     * @param Request $request
     * @param int $batchId
     * @param int $subjectId
     * @return JsonResponse
     */
    public function getBatchSubjectVideos(Request $request, int $batchId, int $subjectId): JsonResponse
    {
        // Order by sort_order if exists, otherwise by updated_at (ascending)
        $videos = DB::table('batch_subjects_video')
            ->where('batch_id', $batchId)
            ->where('subject_id', $subjectId)
            ->join('videos', 'batch_subjects_video.video_id', '=', 'videos.id')
            ->whereNull('videos.deleted_at')
            ->select('videos.*', 'batch_subjects_video.sort_order', 'batch_subjects_video.id as assignment_id')
            ->orderByRaw('COALESCE(batch_subjects_video.sort_order, 999999) ASC')
            ->orderBy('videos.updated_at', 'asc')
            ->get();

        return $this->success($videos, 'Videos retrieved successfully');
    }

    /**
     * Assign a video to a batch and subject.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function assignToBatchSubject(Request $request, int $id): JsonResponse
    {
        $video = Video::find($id);

        if (!$video) {
            return $this->notFound('Video not found');
        }

        try {
            $validated = $request->validate([
                'batch_id' => 'required|exists:batches,id',
                'subject_id' => 'required|exists:subjects,id',
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors(), 'Validation failed');
        }

        // Check if batch has this subject
        $batchHasSubject = DB::table('batches_subjects')
            ->where('batch_id', $validated['batch_id'])
            ->where('subject_id', $validated['subject_id'])
            ->exists();

        if (!$batchHasSubject) {
            return $this->error('This subject is not assigned to the selected batch', 400);
        }

        // Check if video is already assigned
        $existing = DB::table('batch_subjects_video')
            ->where('batch_id', $validated['batch_id'])
            ->where('subject_id', $validated['subject_id'])
            ->where('video_id', $id)
            ->first();

        if ($existing) {
            return $this->error('Video is already assigned to this batch and subject', 400);
        }

        // Get the maximum sort_order for this batch/subject combination
        $maxSortOrder = DB::table('batch_subjects_video')
            ->where('batch_id', $validated['batch_id'])
            ->where('subject_id', $validated['subject_id'])
            ->max('sort_order') ?? -1;

        // Insert the assignment
        DB::table('batch_subjects_video')->insert([
            'batch_id' => $validated['batch_id'],
            'subject_id' => $validated['subject_id'],
            'video_id' => $id,
            'sort_order' => $maxSortOrder + 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Get the updated list of videos
        $videos = DB::table('batch_subjects_video')
            ->where('batch_id', $validated['batch_id'])
            ->where('subject_id', $validated['subject_id'])
            ->join('videos', 'batch_subjects_video.video_id', '=', 'videos.id')
            ->select('videos.*', 'batch_subjects_video.sort_order', 'batch_subjects_video.id as assignment_id')
            ->orderBy('batch_subjects_video.sort_order', 'asc')
            ->orderBy('batch_subjects_video.created_at', 'asc')
            ->get();

        return $this->success($videos, 'Video assigned successfully');
    }

    /**
     * Reorder videos for a batch and subject.
     *
     * @param Request $request
     * @param int $batchId
     * @param int $subjectId
     * @return JsonResponse
     */
    public function reorderBatchSubjectVideos(Request $request, int $batchId, int $subjectId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'video_ids' => 'required|array',
                'video_ids.*' => 'exists:videos,id',
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors(), 'Validation failed');
        }

        // Update sort_order for each video
        foreach ($validated['video_ids'] as $index => $videoId) {
            DB::table('batch_subjects_video')
                ->where('batch_id', $batchId)
                ->where('subject_id', $subjectId)
                ->where('video_id', $videoId)
                ->update([
                    'sort_order' => $index,
                    'updated_at' => now(),
                ]);
        }

        // Get the updated list of videos
        $videos = DB::table('batch_subjects_video')
            ->where('batch_id', $batchId)
            ->where('subject_id', $subjectId)
            ->join('videos', 'batch_subjects_video.video_id', '=', 'videos.id')
            ->select('videos.*', 'batch_subjects_video.sort_order', 'batch_subjects_video.id as assignment_id')
            ->orderBy('batch_subjects_video.sort_order', 'asc')
            ->orderBy('batch_subjects_video.created_at', 'asc')
            ->get();

        return $this->success($videos, 'Videos reordered successfully');
    }

    /**
     * Remove a video from a batch and subject.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function removeFromBatchSubject(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'batch_id' => 'required|exists:batches,id',
                'subject_id' => 'required|exists:subjects,id',
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors(), 'Validation failed');
        }

        DB::table('batch_subjects_video')
            ->where('batch_id', $validated['batch_id'])
            ->where('subject_id', $validated['subject_id'])
            ->where('video_id', $id)
            ->delete();

        return $this->success(null, 'Video removed from batch and subject successfully');
    }
}
