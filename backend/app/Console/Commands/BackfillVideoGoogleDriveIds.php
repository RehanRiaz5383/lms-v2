<?php

namespace App\Console\Commands;

use App\Models\GoogleDriveFolder;
use App\Models\Video;
use Google\Client;
use Google\Service\Drive;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class BackfillVideoGoogleDriveIds extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'videos:backfill-google-drive-ids 
                            {--dry-run : Run without making changes}
                            {--limit= : Limit the number of videos to process}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Backfill Google Drive file IDs for existing videos that are already on Google Drive';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting Google Drive file ID backfill for videos...');
        $this->newLine();

        // Get videos that need file IDs
        $query = Video::where('source_type', 'internal')
            ->whereNull('google_drive_file_id')
            ->whereNotNull('path');

        $limit = $this->option('limit');
        if ($limit) {
            $query->limit((int) $limit);
        }

        $videos = $query->get();

        if ($videos->isEmpty()) {
            $this->info('No videos found that need file ID backfill.');
            return Command::SUCCESS;
        }

        $this->info("Found {$videos->count()} video(s) to process.");
        $this->newLine();

        // Get videos folder from database
        $videosFolder = GoogleDriveFolder::getByName('videos');
        if (!$videosFolder || empty($videosFolder->folder_id)) {
            $this->error('Videos folder is not configured in Google Drive Folders. Please configure it first.');
            return Command::FAILURE;
        }

        $this->info("Using Google Drive folder: {$videosFolder->display_name} (ID: {$videosFolder->folder_id})");
        $this->newLine();

        // Initialize Google Drive client
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

            $service = new Drive($client);
        } catch (\Exception $e) {
            $this->error('Failed to initialize Google Drive client: ' . $e->getMessage());
            return Command::FAILURE;
        }

        $dryRun = $this->option('dry-run');
        if ($dryRun) {
            $this->warn('DRY RUN MODE - No changes will be made');
            $this->newLine();
        }

        $successCount = 0;
        $failedCount = 0;
        $notFoundCount = 0;

        $progressBar = $this->output->createProgressBar($videos->count());
        $progressBar->start();

        foreach ($videos as $video) {
            try {
                // Extract filename from path
                $videoPath = $video->path ?? $video->internal_path;
                if (!$videoPath) {
                    $progressBar->advance();
                    $failedCount++;
                    continue;
                }

                // Get just the filename (last part of path)
                $fileName = basename($videoPath);
                
                // Remove any path prefixes like 'lms/videos/' or 'videos/'
                if (strpos($videoPath, '/') !== false) {
                    $fileName = basename($videoPath);
                }

                // Search for file in Google Drive videos folder
                $query = "name='{$fileName}' and '{$videosFolder->folder_id}' in parents and trashed=false";
                
                $response = $service->files->listFiles([
                    'q' => $query,
                    'fields' => 'files(id, name)',
                    'pageSize' => 10, // Get multiple matches to find exact one
                ]);

                $files = $response->getFiles();

                if (empty($files)) {
                    // Try searching without exact match (contains)
                    $query = "name contains '{$fileName}' and '{$videosFolder->folder_id}' in parents and trashed=false";
                    $response = $service->files->listFiles([
                        'q' => $query,
                        'fields' => 'files(id, name)',
                        'pageSize' => 10,
                    ]);
                    $files = $response->getFiles();
                }

                if (empty($files)) {
                    $notFoundCount++;
                    $progressBar->advance();
                    continue;
                }

                // Find exact match first, otherwise use first result
                $fileId = null;
                foreach ($files as $file) {
                    if ($file->getName() === $fileName) {
                        $fileId = $file->getId();
                        break;
                    }
                }

                // If no exact match, use first result
                if (!$fileId && !empty($files)) {
                    $fileId = $files[0]->getId();
                }

                if ($fileId) {
                    if (!$dryRun) {
                        $video->google_drive_file_id = $fileId;
                        $video->save();
                    }
                    $successCount++;
                } else {
                    $notFoundCount++;
                }

            } catch (\Exception $e) {
                Log::error('Failed to backfill file ID for video', [
                    'video_id' => $video->id,
                    'video_path' => $video->path ?? $video->internal_path,
                    'error' => $e->getMessage(),
                ]);
                $failedCount++;
            }

            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine(2);

        // Summary
        $this->info('Backfill Summary:');
        $this->table(
            ['Status', 'Count'],
            [
                ['Successfully updated', $successCount],
                ['Not found in Google Drive', $notFoundCount],
                ['Failed', $failedCount],
                ['Total processed', $videos->count()],
            ]
        );

        if ($dryRun) {
            $this->newLine();
            $this->warn('This was a dry run. Run without --dry-run to apply changes.');
        }

        return Command::SUCCESS;
    }
}
