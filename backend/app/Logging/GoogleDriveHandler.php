<?php

namespace App\Logging;

use App\Jobs\LogToGoogleDrive;
use App\Services\GoogleDriveLogService;
use Illuminate\Support\Facades\Queue;
use Monolog\Handler\AbstractProcessingHandler;
use Monolog\LogRecord;

class GoogleDriveHandler extends AbstractProcessingHandler
{
    private $googleDriveLogService;
    private $service;
    private $useQueue;

    public function __construct($level = \Monolog\Level::Debug, bool $bubble = true, ?string $service = null, ?bool $useQueue = null)
    {
        parent::__construct($level, $bubble);
        $this->service = $service;
        // Default to using queue (true), but can be disabled via env or handler_with
        // If useQueue is explicitly passed, use it; otherwise check env; otherwise default to true
        $this->useQueue = $useQueue ?? env('LOG_GOOGLE_DRIVE_USE_QUEUE', true);
    }

    /**
     * Get or create GoogleDriveLogService instance
     */
    private function getGoogleDriveLogService(): GoogleDriveLogService
    {
        if (!$this->googleDriveLogService) {
            $this->googleDriveLogService = new GoogleDriveLogService();
        }
        return $this->googleDriveLogService;
    }

    /**
     * Write log record to Google Drive
     */
    protected function write(LogRecord $record): void
    {
        try {
            $service = $this->service ?? $this->extractServiceFromRecord($record);
            $level = strtolower($record->level->getName());
            $message = $record->message;
            $context = $record->context;

            if ($this->useQueue) {
                // Dispatch to queue for asynchronous processing
                Queue::push(new LogToGoogleDrive($level, $message, $context, $service));
            } else {
                // Write directly (synchronous - may slow down API responses)
                $this->getGoogleDriveLogService()->write($level, $message, $context, $service);
            }
        } catch (\Exception $e) {
            // Silently fail to prevent infinite loops
            // If Google Drive logging fails, we don't want to log that failure to Google Drive
            error_log('Google Drive logging failed: ' . $e->getMessage());
        }
    }

    /**
     * Extract service name from log record
     */
    private function extractServiceFromRecord(LogRecord $record): ?string
    {
        // Check context for service/channel
        if (isset($record->context['service'])) {
            return $record->context['service'];
        }
        if (isset($record->context['channel'])) {
            return $record->context['channel'];
        }

        // Check channel name
        if (isset($record->channel)) {
            $channel = $record->channel;
            // Map common Laravel channels to service names
            $channelMap = [
                'api' => 'api',
                'auth' => 'auth',
                'payment' => 'payment',
                'console' => 'console',
                'jobs' => 'jobs',
                'queue' => 'jobs',
            ];
            if (isset($channelMap[$channel])) {
                return $channelMap[$channel];
            }
            return $channel;
        }

        return null;
    }
}

