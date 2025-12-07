<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Video;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StudentVideoController extends ApiController
{
    /**
     * Get videos assigned to the authenticated student.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();

        // Get user's assigned batches
        $userBatchIds = DB::table('user_batches')
            ->where('user_id', $user->id)
            ->pluck('batch_id')
            ->toArray();

        if (empty($userBatchIds)) {
            return $this->success([
                'videos' => [],
                'batches' => [],
                'subjects' => [],
            ], 'No videos assigned');
        }

        // Build query for videos assigned to user's batches
        $query = DB::table('batch_subjects_video')
            ->join('videos', 'batch_subjects_video.video_id', '=', 'videos.id')
            ->join('batches', 'batch_subjects_video.batch_id', '=', 'batches.id')
            ->join('subjects', 'batch_subjects_video.subject_id', '=', 'subjects.id')
            ->whereIn('batch_subjects_video.batch_id', $userBatchIds)
            ->whereNull('videos.deleted_at')
            ->select(
                'videos.*',
                'batch_subjects_video.batch_id',
                'batch_subjects_video.subject_id',
                'batch_subjects_video.sort_order',
                'batches.title as batch_title',
                'subjects.title as subject_title'
            );

        // Filter by batch if provided
        if ($request->has('batch_id') && !empty($request->get('batch_id'))) {
            $query->where('batch_subjects_video.batch_id', $request->get('batch_id'));
        }

        // Filter by subject if provided
        if ($request->has('subject_id') && !empty($request->get('subject_id'))) {
            $query->where('batch_subjects_video.subject_id', $request->get('subject_id'));
        }

        // Order by sort_order if exists, otherwise by updated_at (ascending)
        // Videos with sort_order are ordered by sort_order ASC
        // Videos without sort_order (NULL) are ordered by updated_at ASC
        $videos = $query
            ->orderByRaw('COALESCE(batch_subjects_video.sort_order, 999999) ASC')
            ->orderBy('videos.updated_at', 'asc')
            ->get();

        // Get available batches for filter
        $availableBatches = DB::table('batches')
            ->whereIn('id', $userBatchIds)
            ->where('active', true)
            ->select('id', 'title')
            ->get();

        // Get available subjects for filter (subjects that have videos assigned to user's batches)
        $availableSubjects = DB::table('subjects')
            ->join('batch_subjects_video', 'subjects.id', '=', 'batch_subjects_video.subject_id')
            ->whereIn('batch_subjects_video.batch_id', $userBatchIds)
            ->where('subjects.active', true)
            ->distinct()
            ->select('subjects.id', 'subjects.title')
            ->get();

        return $this->success([
            'videos' => $videos,
            'batches' => $availableBatches,
            'subjects' => $availableSubjects,
        ], 'Videos retrieved successfully');
    }

    /**
     * Download a video file.
     *
     * @param int $id
     * @return \Illuminate\Http\Response|\Illuminate\Http\JsonResponse
     */
    public function download(int $id)
    {
        $user = auth()->user();

        // Get user's assigned batches
        $userBatchIds = DB::table('user_batches')
            ->where('user_id', $user->id)
            ->pluck('batch_id')
            ->toArray();

        if (empty($userBatchIds)) {
            return $this->unauthorized('No videos assigned');
        }

        // Find video and verify it's assigned to user's batch
        $video = DB::table('batch_subjects_video')
            ->join('videos', 'batch_subjects_video.video_id', '=', 'videos.id')
            ->where('videos.id', $id)
            ->whereIn('batch_subjects_video.batch_id', $userBatchIds)
            ->whereNull('videos.deleted_at')
            ->where('videos.source_type', 'internal')
            ->select('videos.*')
            ->first();

        if (!$video) {
            return $this->notFound('Video not found or not accessible');
        }

        // Get video path
        $videoPath = $video->path ?? $video->internal_path;
        
        if (!$videoPath) {
            return $this->error('Video file not found', 404);
        }

        // Check if file exists
        $filePath = storage_path('app/public/' . $videoPath);
        
        if (!file_exists($filePath)) {
            return $this->notFound('Video file not found on server');
        }

        // Return file download with proper headers
        return response()->download($filePath, $video->title . '.' . pathinfo($videoPath, PATHINFO_EXTENSION));
    }
}

