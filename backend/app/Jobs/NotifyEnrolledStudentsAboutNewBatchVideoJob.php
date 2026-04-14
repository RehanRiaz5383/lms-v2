<?php

namespace App\Jobs;

use App\Models\Batch;
use App\Models\Subject;
use App\Models\User;
use App\Models\Video;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class NotifyEnrolledStudentsAboutNewBatchVideoJob implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;

    /**
     * Retrying the whole job re-queues emails for every student; rely on SendNotificationEmail dedupe if a retry occurs.
     */
    public int $tries = 1;

    public int $uniqueFor = 600;

    public function __construct(
        public int $videoId,
        public int $batchId,
        public int $subjectId
    ) {}

    public function uniqueId(): string
    {
        return "new-batch-video:{$this->videoId}:{$this->batchId}:{$this->subjectId}";
    }

    public function handle(): void
    {
        $video = Video::find($this->videoId);
        if (! $video) {
            Log::warning('NotifyEnrolledStudentsAboutNewBatchVideoJob: video not found', [
                'video_id' => $this->videoId,
            ]);

            return;
        }

        $batch = Batch::find($this->batchId);
        $subject = Subject::find($this->subjectId);

        $batchTitle = $batch?->title ?? 'Your batch';
        $subjectTitle = $subject?->title ?? 'a subject';
        $videoTitle = $video->title ?? 'New video';

        $userIds = DB::table('user_batches')
            ->where('batch_id', $this->batchId)
            ->pluck('user_id')
            ->unique()
            ->all();

        if ($userIds === []) {
            return;
        }

        $reviewUrl = '/dashboard/lecture-videos?batch_id='.$this->batchId.'&subject_id='.$this->subjectId;

        $inAppTitle = 'New lecture video';
        $inAppMessage = "{$videoTitle} is now available for {$subjectTitle} in {$batchTitle}. Please review it in Lecture Videos.";

        $emailSubject = "[Learning Hub] New video: {$subjectTitle} — {$batchTitle}";
        $emailBody = "Hello,\n\n"
            ."A new lecture video has been uploaded for a subject in your batch.\n\n"
            ."Video: {$videoTitle}\n"
            ."Batch: {$batchTitle}\n"
            ."Subject: {$subjectTitle}\n\n"
            ."Please sign in to Learning Hub and open Lecture Videos to review it.\n\n"
            ."Direct link path: {$reviewUrl}\n\n"
            .'— Learning Hub';

        $payload = [
            'video_id' => $video->id,
            'batch_id' => $this->batchId,
            'subject_id' => $this->subjectId,
            'batch_title' => $batchTitle,
            'subject_title' => $subjectTitle,
            'video_title' => $videoTitle,
            'url' => $reviewUrl,
        ];

        User::query()
            ->whereIn('id', $userIds)
            ->where(function ($q) {
                $q->where('user_type', 2)
                    ->orWhereHas('roles', function ($roleQuery) {
                        $roleQuery->where('user_types.id', 2);
                    });
            })
            ->where(function ($q) {
                $q->whereNull('block')->orWhere('block', 0);
            })
            ->whereNotNull('email')
            ->chunkById(75, function ($students) use (
                $inAppTitle,
                $inAppMessage,
                $payload,
                $emailSubject,
                $emailBody
            ) {
                foreach ($students as $student) {
                    try {
                        $student->sendCrmNotification(
                            'new_batch_subject_video',
                            $inAppTitle,
                            $inAppMessage,
                            $payload
                        );
                    } catch (\Throwable $e) {
                        Log::warning('Failed in-app notification for new batch video', [
                            'user_id' => $student->id,
                            'error' => $e->getMessage(),
                        ]);
                    }

                    try {
                        SendNotificationEmail::dispatch($student->email, $emailSubject, $emailBody, null);
                    } catch (\Throwable $e) {
                        Log::warning('Failed to queue email for new batch video', [
                            'user_id' => $student->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            });
    }
}
