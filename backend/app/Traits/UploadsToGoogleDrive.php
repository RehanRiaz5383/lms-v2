<?php

namespace App\Traits;

use App\Models\GoogleDriveFolder;
use Google\Client;
use Google\Service\Drive;
use Google\Service\Drive\DriveFile;
use Google\Service\Drive\Permission;
use Illuminate\Support\Facades\Log;

trait UploadsToGoogleDrive
{
    /**
     * Store the last uploaded file ID for retrieval
     */
    protected static $lastUploadedFileId = null;
    /**
     * Upload a file to Google Drive in a specific folder
     * 
     * @param \Illuminate\Http\UploadedFile $file The uploaded file
     * @param string $folderNameOrId The folder name (from database) or folder ID (for backward compatibility)
     * @param string|null $directoryPath Optional directory path (will be fetched from DB if folder name is used)
     * @return string|null The file path to store in database, or null on failure
     */
    protected function uploadToGoogleDrive($file, string $folderNameOrId, ?string $directoryPath = null): ?string
    {
        try {
            // Get folder info from database if folder name is provided, otherwise use folder ID directly
            $folderId = null;
            $finalDirectoryPath = $directoryPath;
            
            // Check if it's a folder name (from database) or a folder ID
            $folder = GoogleDriveFolder::getByName($folderNameOrId);
            if ($folder) {
                // It's a folder name from database
                if (empty($folder->folder_id)) {
                    throw new \Exception("Google Drive folder ID is not configured for '{$folderNameOrId}'. Please configure it in Settings.");
                }
                $folderId = $folder->folder_id;
                $finalDirectoryPath = $folder->directory_path;
            } else {
                // It's a folder ID (backward compatibility)
                $folderId = $folderNameOrId;
                if (empty($finalDirectoryPath)) {
                    throw new \Exception('Directory path is required when using folder ID directly.');
                }
            }
            
            // 1. Initialize the Google Client with OAuth2
            $client = new Client();
            $client->setClientId(config('services.google.client_id'));
            $client->setClientSecret(config('services.google.client_secret'));
            $client->setDeveloperKey(config('services.google.api_key'));
            $client->addScope(Drive::DRIVE);
            
            // 2. Authenticate using the Refresh Token
            $client->refreshToken(config('services.google.refresh_token'));
            
            // Auto-refresh the access token if it's expired
            if ($client->isAccessTokenExpired()) {
                $client->fetchAccessTokenWithRefreshToken($client->getRefreshToken());
            }
            
            $service = new Drive($client);
            
            // 3. Generate unique filename
            $fileName = time() . '_' . uniqid() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $file->getClientOriginalName());
            
            // 4. Create File Metadata
            $fileMetadata = new DriveFile([
                'name' => $fileName,
                'parents' => [$folderId] // This puts it in YOUR folder (uses your quota)
            ]);
            
            // 5. Get File Content
            $content = file_get_contents($file->getRealPath());
            $mimeType = $file->getMimeType() ?: 'application/octet-stream';
            
            // 6. Execute Upload
            $uploadedFile = $service->files->create($fileMetadata, [
                'data' => $content,
                'mimeType' => $mimeType,
                'uploadType' => 'multipart',
                'fields' => 'id, webViewLink, webContentLink'
            ]);
            
            // 7. Return the path to store in database
            $remoteFilePath = rtrim($finalDirectoryPath, '/') . '/' . $fileName;
            
            Log::info('File uploaded to Google Drive successfully', [
                'saved_path' => $remoteFilePath,
                'file_id' => $uploadedFile->getId(),
                'folder_id' => $folderId,
                'folder_name' => $folder?->name ?? 'direct_id',
            ]);
            
            // Store file ID in a static property so it can be retrieved after upload
            static::$lastUploadedFileId = $uploadedFile->getId();
            
            return $remoteFilePath;
            
        } catch (\Google\Service\Exception $e) {
            Log::error('Google Service Exception during upload', [
                'error' => $e->getMessage(),
                'error_code' => $e->getCode(),
                'folder_name_or_id' => $folderNameOrId,
            ]);
            throw new \Exception('Failed to upload file to Google Drive: ' . $e->getMessage());
        } catch (\Exception $e) {
            Log::error('Error during Google Drive upload', [
                'error' => $e->getMessage(),
                'folder_name_or_id' => $folderNameOrId,
            ]);
            throw new \Exception('Failed to upload file to Google Drive: ' . $e->getMessage());
        }
    }

    /**
     * Get the file ID of the last uploaded file
     * 
     * @return string|null The Google Drive file ID
     */
    protected function getLastUploadedFileId(): ?string
    {
        return static::$lastUploadedFileId;
    }

    /**
     * Get direct download URL for a Google Drive file
     * Makes the file publicly accessible and returns webContentLink for direct download
     * 
     * @param string $fileId The Google Drive file ID
     * @param bool $makePublic Whether to make the file public if it's not already (default: true)
     * @return string|null The direct download URL (webContentLink)
     */
    protected function getGoogleDriveDownloadUrl(string $fileId, bool $makePublic = true): ?string
    {
        try {
            // Initialize the Google Client with OAuth2
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
            
            // 1. Make the file publicly accessible (if requested and not already public)
            if ($makePublic) {
                try {
                    // Check if file already has public permission
                    $permissions = $service->permissions->listPermissions($fileId, [
                        'fields' => 'permissions(id,type,role)'
                    ]);
                    
                    $hasPublicPermission = false;
                    foreach ($permissions->getPermissions() as $permission) {
                        if ($permission->getType() === 'anyone' && $permission->getRole() === 'viewer') {
                            $hasPublicPermission = true;
                            break;
                        }
                    }
                    
                    // If not public, make it public
                    if (!$hasPublicPermission) {
                        $newPermission = new Permission([
                            'type' => 'anyone',
                            'role' => 'viewer',
                        ]);
                        $service->permissions->create($fileId, $newPermission);
                        
                        Log::info('Made Google Drive file public for direct download', [
                            'file_id' => $fileId,
                        ]);
                    }
                } catch (\Exception $e) {
                    // Log but don't fail - file might already be public or permission might exist
                    Log::debug('Could not set public permission (file may already be public)', [
                        'file_id' => $fileId,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
            
            // 2. Fetch the file metadata to get the webContentLink
            $file = $service->files->get($fileId, [
                'fields' => 'webContentLink, webViewLink'
            ]);
            
            // 3. Return the direct download URL (webContentLink)
            // webContentLink is a permanent direct download link that doesn't expire
            $downloadUrl = $file->getWebContentLink();
            
            if (!$downloadUrl) {
                // Fallback to webViewLink if webContentLink is not available
                $downloadUrl = $file->getWebViewLink();
            }
            
            return $downloadUrl;
            
        } catch (\Exception $e) {
            Log::error('Failed to get Google Drive download URL', [
                'error' => $e->getMessage(),
                'file_id' => $fileId,
            ]);
            return null;
        }
    }

    /**
     * Delete a file from Google Drive
     * 
     * @param string $filePath The file path stored in database (e.g., 'lms/Task_Files/filename.pdf')
     * @return bool True if deleted successfully, false otherwise
     */
    protected function deleteFromGoogleDrive(string $filePath): bool
    {
        try {
            // Use the filesystem adapter to delete
            if (\Illuminate\Support\Facades\Storage::disk('google')->exists($filePath)) {
                \Illuminate\Support\Facades\Storage::disk('google')->delete($filePath);
                return true;
            }
            return false;
        } catch (\Exception $e) {
            Log::warning('Error deleting file from Google Drive', [
                'path' => $filePath,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }
}

