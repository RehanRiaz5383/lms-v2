<?php

namespace App\Services;

use App\Models\GoogleDriveFolder;
use Google\Client;
use Google\Service\Drive;
use Google\Service\Drive\DriveFile;
use Illuminate\Support\Facades\Log as LaravelLog;
use Illuminate\Support\Str;
use Carbon\Carbon;

class GoogleDriveLogService
{
    private $client;
    private $service;
    private $logsFolder;
    private $baseDirectoryPath;

    public function __construct()
    {
        $this->initializeClient();
        $this->initializeLogsFolder();
    }

    /**
     * Initialize Google Client and Drive Service
     */
    private function initializeClient(): void
    {
        try {
            $client = new Client();
            $client->setClientId(config('services.google.client_id'));
            $client->setClientSecret(config('services.google.client_secret'));
            $client->setDeveloperKey(config('services.google.api_key'));
            $client->addScope(Drive::DRIVE);

            // Authenticate using the Refresh Token
            $client->refreshToken(config('services.google.refresh_token'));

            // Auto-refresh the access token if it's expired
            if ($client->isAccessTokenExpired()) {
                $client->fetchAccessTokenWithRefreshToken($client->getRefreshToken());
            }

            $this->client = $client;
            $this->service = new Drive($client);
        } catch (\Exception $e) {
            // Fallback to local logging if Google Drive fails
            LaravelLog::error('Failed to initialize Google Drive client for logging', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Initialize logs folder from database
     */
    private function initializeLogsFolder(): void
    {
        $folder = GoogleDriveFolder::getByName('logs');
        if (!$folder || empty($folder->folder_id)) {
            throw new \Exception("Google Drive 'logs' folder is not configured. Please configure it in Settings > Google Drive Folders.");
        }
        $this->logsFolder = $folder;
        $this->baseDirectoryPath = $folder->directory_path;
    }

    /**
     * Write log entry to Google Drive
     * 
     * @param string $level Log level (debug, info, warning, error, critical)
     * @param string $message Log message
     * @param array $context Additional context
     * @param string|null $service Service name (e.g., 'api', 'auth', 'payment'). If null, uses 'general'
     * @return bool Success status
     */
    public function write(string $level, string $message, array $context = [], ?string $service = null): bool
    {
        try {
            // Determine service name
            $serviceName = $service ?? $this->extractServiceFromContext($context) ?? 'general';
            $serviceName = Str::slug($serviceName, '_'); // Sanitize service name

            // Get today's date folder
            $dateFolder = date('Y-m-d');
            $dateFolderId = $this->getOrCreateDateFolder($dateFolder);

            // Get or create service log file
            $logFileName = $serviceName . '.log';
            $logFileId = $this->getOrCreateLogFile($dateFolderId, $logFileName);

            // Format log entry
            $logEntry = $this->formatLogEntry($level, $message, $context);

            // Append to log file
            return $this->appendToLogFile($logFileId, $logEntry);

        } catch (\Exception $e) {
            // Fallback to local logging if Google Drive fails
            LaravelLog::error('Failed to write log to Google Drive', [
                'error' => $e->getMessage(),
                'level' => $level,
                'message' => $message,
            ]);
            return false;
        }
    }

    /**
     * Extract service name from context
     */
    private function extractServiceFromContext(array $context): ?string
    {
        // Try to extract service from context
        if (isset($context['service'])) {
            return $context['service'];
        }
        if (isset($context['channel'])) {
            return $context['channel'];
        }
        if (isset($context['facility'])) {
            return $context['facility'];
        }
        
        // Try to extract from stack trace or file path
        if (isset($context['file'])) {
            $file = $context['file'];
            if (strpos($file, 'app/Http/Controllers') !== false) {
                return 'api';
            }
            if (strpos($file, 'app/Console') !== false) {
                return 'console';
            }
            if (strpos($file, 'app/Jobs') !== false) {
                return 'jobs';
            }
        }

        return null;
    }

    /**
     * Get or create date folder (e.g., 2026-01-31)
     */
    private function getOrCreateDateFolder(string $dateFolder): string
    {
        $folderPath = rtrim($this->baseDirectoryPath, '/') . '/' . $dateFolder;
        
        // Check if folder exists
        $existingFolder = $this->findFolderByName($dateFolder, $this->logsFolder->folder_id);
        
        if ($existingFolder) {
            return $existingFolder;
        }

        // Create new date folder
        $fileMetadata = new DriveFile([
            'name' => $dateFolder,
            'parents' => [$this->logsFolder->folder_id],
            'mimeType' => 'application/vnd.google-apps.folder',
        ]);

        $folder = $this->service->files->create($fileMetadata, [
            'fields' => 'id',
        ]);

        return $folder->getId();
    }

    /**
     * Get or create log file in date folder
     */
    private function getOrCreateLogFile(string $dateFolderId, string $fileName): string
    {
        // Check if file exists
        $existingFile = $this->findFileByName($fileName, $dateFolderId);
        
        if ($existingFile) {
            return $existingFile['id'];
        }

        // Create new log file
        $fileMetadata = new DriveFile([
            'name' => $fileName,
            'parents' => [$dateFolderId],
        ]);

        $file = $this->service->files->create($fileMetadata, [
            'data' => '', // Empty file initially
            'mimeType' => 'text/plain',
            'uploadType' => 'multipart',
            'fields' => 'id',
        ]);

        return $file->getId();
    }

    /**
     * Append content to log file
     */
    private function appendToLogFile(string $fileId, string $content): bool
    {
        try {
            // Get current file content
            $currentContent = '';
            try {
                $file = $this->service->files->get($fileId, ['alt' => 'media']);
                $body = $file->getBody();
                if ($body) {
                    // GuzzleHttp\Psr7\Stream has getContents() method, not stream_get_contents()
                    if (method_exists($body, 'getContents')) {
                        $currentContent = $body->getContents();
                    } elseif (is_resource($body)) {
                        // Fallback for PHP resources
                        $currentContent = stream_get_contents($body);
                        if ($currentContent === false) {
                            $currentContent = '';
                        }
                    } else {
                        // Try to read as string
                        $currentContent = (string) $body;
                    }
                    
                    // Ensure we have a string
                    if ($currentContent === false || $currentContent === null) {
                        $currentContent = '';
                    }
                }
            } catch (\Exception $e) {
                // File might be empty or not readable, start with empty content
                $currentContent = '';
            }
            
            // Append new content
            $newContent = $currentContent . $content;

            // Update file
            $fileMetadata = new DriveFile();
            $this->service->files->update($fileId, $fileMetadata, [
                'data' => $newContent,
                'mimeType' => 'text/plain',
                'uploadType' => 'multipart',
            ]);

            return true;
        } catch (\Exception $e) {
            // Use error_log to avoid infinite loop if Google Drive logging fails
            error_log('Failed to append to Google Drive log file: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Format log entry
     */
    private function formatLogEntry(string $level, string $message, array $context = []): string
    {
        $timestamp = date('Y-m-d H:i:s');
        $levelUpper = strtoupper($level);
        
        // Format context if present
        $contextStr = '';
        if (!empty($context)) {
            $contextStr = ' ' . json_encode($context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        }

        return "[{$timestamp}] {$levelUpper}: {$message}{$contextStr}" . PHP_EOL;
    }

    /**
     * Find folder by name in parent folder
     */
    private function findFolderByName(string $folderName, string $parentId): ?string
    {
        try {
            $response = $this->service->files->listFiles([
                'q' => "name='{$folderName}' and mimeType='application/vnd.google-apps.folder' and '{$parentId}' in parents and trashed=false",
                'fields' => 'files(id, name)',
                'pageSize' => 1,
            ]);

            $files = $response->getFiles();
            return !empty($files) ? $files[0]->getId() : null;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Find file by name in parent folder
     */
    private function findFileByName(string $fileName, string $parentId): ?array
    {
        try {
            $response = $this->service->files->listFiles([
                'q' => "name='{$fileName}' and '{$parentId}' in parents and trashed=false",
                'fields' => 'files(id, name)',
                'pageSize' => 1,
            ]);

            $files = $response->getFiles();
            return !empty($files) ? ['id' => $files[0]->getId(), 'name' => $files[0]->getName()] : null;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Clear old log files and directories (older than specified days)
     * 
     * @param int $daysOld Number of days - files/folders older than this will be deleted
     * @return array Statistics about deleted items
     */
    public function clearOldLogs(int $daysOld = 30): array
    {
        $deletedFiles = 0;
        $deletedFolders = 0;
        $errors = [];
        $cutoffDate = Carbon::now()->subDays($daysOld);

        try {
            // Get all folders and files in the logs directory
            $allItems = $this->listAllItemsInLogsFolder();

            foreach ($allItems as $item) {
                try {
                    $itemDate = $this->getItemDate($item);
                    
                    // Check if item is older than cutoff date
                    if ($itemDate && $itemDate->lt($cutoffDate)) {
                        if ($item['mimeType'] === 'application/vnd.google-apps.folder') {
                            // Delete folder (this will also delete all files inside)
                            $this->service->files->delete($item['id']);
                            $deletedFolders++;
                            LaravelLog::info("Deleted old log folder: {$item['name']} (created: {$itemDate->format('Y-m-d')})");
                        } else {
                            // Delete file
                            $this->service->files->delete($item['id']);
                            $deletedFiles++;
                            LaravelLog::info("Deleted old log file: {$item['name']} (created: {$itemDate->format('Y-m-d')})");
                        }
                    }
                } catch (\Exception $e) {
                    $errors[] = "Failed to delete {$item['name']}: " . $e->getMessage();
                    LaravelLog::error("Failed to delete log item: {$item['name']}", [
                        'error' => $e->getMessage(),
                        'item_id' => $item['id'],
                    ]);
                }
            }

            return [
                'deleted_files' => $deletedFiles,
                'deleted_folders' => $deletedFolders,
                'errors' => $errors,
                'cutoff_date' => $cutoffDate->format('Y-m-d'),
            ];
        } catch (\Exception $e) {
            LaravelLog::error('Failed to clear old logs from Google Drive', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * List all items (files and folders) in the logs folder
     */
    private function listAllItemsInLogsFolder(): array
    {
        $allItems = [];
        $pageToken = null;

        do {
            try {
                $params = [
                    'q' => "'{$this->logsFolder->folder_id}' in parents and trashed=false",
                    'fields' => 'nextPageToken, files(id, name, mimeType, createdTime, modifiedTime)',
                    'pageSize' => 1000,
                ];

                if ($pageToken) {
                    $params['pageToken'] = $pageToken;
                }

                $response = $this->service->files->listFiles($params);
                $files = $response->getFiles();

                foreach ($files as $file) {
                    $allItems[] = [
                        'id' => $file->getId(),
                        'name' => $file->getName(),
                        'mimeType' => $file->getMimeType(),
                        'createdTime' => $file->getCreatedTime(),
                        'modifiedTime' => $file->getModifiedTime(),
                    ];
                }

                $pageToken = $response->getNextPageToken();
            } catch (\Exception $e) {
                LaravelLog::error('Failed to list items in logs folder', [
                    'error' => $e->getMessage(),
                ]);
                break;
            }
        } while ($pageToken);

        return $allItems;
    }

    /**
     * Get the date of an item (prefer createdTime, fallback to modifiedTime)
     */
    private function getItemDate(array $item): ?Carbon
    {
        try {
            // Try to parse date from folder name (format: Y-m-d, e.g., 2026-01-15)
            $folderName = $item['name'];
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $folderName)) {
                $parsedDate = Carbon::createFromFormat('Y-m-d', $folderName);
                if ($parsedDate) {
                    return $parsedDate;
                }
            }

            // Fallback to createdTime
            if (!empty($item['createdTime'])) {
                return Carbon::parse($item['createdTime']);
            }

            // Fallback to modifiedTime
            if (!empty($item['modifiedTime'])) {
                return Carbon::parse($item['modifiedTime']);
            }

            return null;
        } catch (\Exception $e) {
            LaravelLog::warning('Failed to parse date for log item', [
                'item_name' => $item['name'],
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }
}

