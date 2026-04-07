<?php

namespace App\Listeners;

use App\Events\VideoAssignedToBatchSubject;
use App\Jobs\NotifyEnrolledStudentsAboutNewBatchVideoJob;

class QueueNotifyEnrolledStudentsAboutNewBatchVideo
{
    /**
     * Notify students enrolled in the batch (videos are scoped by batch + subject in LMS).
     */
    public function handle(VideoAssignedToBatchSubject $event): void
    {
        NotifyEnrolledStudentsAboutNewBatchVideoJob::dispatch(
            $event->video->id,
            $event->batchId,
            $event->subjectId
        );
    }
}
