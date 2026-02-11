<?php

namespace App\Jobs;

use App\Services\GoogleDriveLogService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class LogToGoogleDrive implements ShouldQueue
{
    use Queueable, InteractsWithQueue, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     */
    public $backoff = [10, 30, 60];

    /**
     * Log level
     */
    public string $level;

    /**
     * Log message
     */
    public string $message;

    /**
     * Log context
     */
    public array $context;

    /**
     * Service name
     */
    public ?string $service;

    /**
     * Create a new job instance.
     */
    public function __construct(string $level, string $message, array $context = [], ?string $service = null)
    {
        $this->level = $level;
        $this->message = $message;
        $this->context = $context;
        $this->service = $service;
    }

    /**
     * Execute the job.
     */
    public function handle(GoogleDriveLogService $logService): void
    {
        try {
            $logService->write($this->level, $this->message, $this->context, $this->service);
        } catch (\Exception $e) {
            // Log to local file only (to prevent infinite loops)
            // Don't re-throw to prevent job from failing and retrying indefinitely
            Log::channel('single')->error('Failed to write log to Google Drive via queue', [
                'error' => $e->getMessage(),
                'level' => $this->level,
                'message' => $this->message,
                'service' => $this->service,
            ]);
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        // Log the failure to local file only
        Log::channel('single')->error('LogToGoogleDrive job failed after all retries', [
            'error' => $exception->getMessage(),
            'level' => $this->level,
            'message' => $this->message,
            'service' => $this->service,
        ]);
    }
}
