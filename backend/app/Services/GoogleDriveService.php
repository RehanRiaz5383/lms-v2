<?php

namespace App\Services;

use Google\Client;
use Google\Service\Drive;
use Google\Service\Drive\DriveFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class GoogleDriveService
{
    private $client;
    private $drive;
    private $serviceAccountPath;
    private $baseFolderName = 'lms';

    public function __construct()
    {
        $this->serviceAccountPath = storage_path('app/possible-post-485911-b5-8f45772724d4.json');
        $this->initializeClient();
    }

    /**
     * Initialize Google Client and Drive Service
     */
    private function initializeClient()
    {
        try {
            $this->client = new Client();
            $this->client->setAuthConfig($this->serviceAccountPath);
            $this->client->addScope(Drive::DRIVE);
            $this->client->setAccessType('offline');
            
            $this->drive = new Drive($this->client);
        } catch (\Exception $e) {
            Log::error('Failed to initialize Google Drive client', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Get the base folder ID (lms directory)
     */
    public function getBaseFolderId()
    {
        try {
            $response = $this->drive->files->listFiles([
                'q' => "name='{$this->baseFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false",
                'fields' => 'files(id, name)',
                'pageSize' => 1
            ]);

            if (empty($response->getFiles())) {
                throw new \Exception("Base folder '{$this->baseFolderName}' not found in Google Drive");
            }

            return $response->getFiles()[0]->getId();
        } catch (\Exception $e) {
            Log::error('Failed to get base folder ID', [
                'error' => $e->getMessage(),
                'folder_name' => $this->baseFolderName
            ]);
            throw $e;
        }
    }

    /**
     * Get folder ID by name within the base folder
     */
    public function getFolderId($folderName, $parentFolderId = null)
    {
        try {
            if (!$parentFolderId) {
                $parentFolderId = $this->getBaseFolderId();
            }

            $query = "name='{$folderName}' and mimeType='application/vnd.google-apps.folder' and '{$parentFolderId}' in parents and trashed=false";
            
            $response = $this->drive->files->listFiles([
                'q' => $query,
                'fields' => 'files(id, name)',
                'pageSize' => 1
            ]);

            if (empty($response->getFiles())) {
                return null;
            }

            return $response->getFiles()[0]->getId();
        } catch (\Exception $e) {
            Log::error('Failed to get folder ID', [
                'error' => $e->getMessage(),
                'folder_name' => $folderName,
                'parent_folder_id' => $parentFolderId
            ]);
            throw $e;
        }
    }

    /**
     * List files in a folder
     */
    public function listFiles($folderName = null, $limit = 100)
    {
        try {
            $query = "trashed=false";
            
            if ($folderName) {
                $folderId = $this->getFolderId($folderName);
                if (!$folderId) {
                    return [];
                }
                $query .= " and '{$folderId}' in parents";
            } else {
                // List files in base folder
                $baseFolderId = $this->getBaseFolderId();
                $query .= " and '{$baseFolderId}' in parents";
            }

            $response = $this->drive->files->listFiles([
                'q' => $query,
                'fields' => 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink)',
                'pageSize' => $limit,
                'orderBy' => 'modifiedTime desc'
            ]);

            $files = [];
            foreach ($response->getFiles() as $file) {
                $files[] = [
                    'id' => $file->getId(),
                    'name' => $file->getName(),
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                    'created_time' => $file->getCreatedTime(),
                    'modified_time' => $file->getModifiedTime(),
                    'web_view_link' => $file->getWebViewLink(),
                    'web_content_link' => $file->getWebContentLink(),
                ];
            }

            return $files;
        } catch (\Exception $e) {
            Log::error('Failed to list files', [
                'error' => $e->getMessage(),
                'folder_name' => $folderName
            ]);
            throw $e;
        }
    }

    /**
     * List folders in the base directory
     */
    public function listFolders()
    {
        try {
            $baseFolderId = $this->getBaseFolderId();
            
            $response = $this->drive->files->listFiles([
                'q' => "mimeType='application/vnd.google-apps.folder' and '{$baseFolderId}' in parents and trashed=false",
                'fields' => 'files(id, name, createdTime, modifiedTime)',
                'orderBy' => 'name'
            ]);

            $folders = [];
            foreach ($response->getFiles() as $folder) {
                $folders[] = [
                    'id' => $folder->getId(),
                    'name' => $folder->getName(),
                    'created_time' => $folder->getCreatedTime(),
                    'modified_time' => $folder->getModifiedTime(),
                ];
            }

            return $folders;
        } catch (\Exception $e) {
            Log::error('Failed to list folders', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Get file by ID
     */
    public function getFile($fileId)
    {
        try {
            $file = $this->drive->files->get($fileId, [
                'fields' => 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink'
            ]);

            return [
                'id' => $file->getId(),
                'name' => $file->getName(),
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
                'created_time' => $file->getCreatedTime(),
                'modified_time' => $file->getModifiedTime(),
                'web_view_link' => $file->getWebViewLink(),
                'web_content_link' => $file->getWebContentLink(),
            ];
        } catch (\Exception $e) {
            Log::error('Failed to get file', [
                'error' => $e->getMessage(),
                'file_id' => $fileId
            ]);
            throw $e;
        }
    }

    /**
     * Get file download URL (temporary)
     */
    public function getFileDownloadUrl($fileId)
    {
        try {
            $file = $this->drive->files->get($fileId, [
                'fields' => 'webContentLink, webViewLink'
            ]);

            return $file->getWebContentLink() ?? $file->getWebViewLink();
        } catch (\Exception $e) {
            Log::error('Failed to get file download URL', [
                'error' => $e->getMessage(),
                'file_id' => $fileId
            ]);
            throw $e;
        }
    }

    /**
     * Upload a file to Google Drive
     */
    public function uploadFile($filePath, $fileName, $folderName = null, $mimeType = null)
    {
        try {
            $fileMetadata = new DriveFile([
                'name' => $fileName
            ]);

            // Determine parent folder
            if ($folderName) {
                $folderId = $this->getFolderId($folderName);
                if ($folderId) {
                    $fileMetadata->setParents([$folderId]);
                } else {
                    // Create folder if it doesn't exist
                    $folderId = $this->createFolder($folderName);
                    $fileMetadata->setParents([$folderId]);
                }
            } else {
                $baseFolderId = $this->getBaseFolderId();
                $fileMetadata->setParents([$baseFolderId]);
            }

            // If no MIME type provided, try to detect it
            if (!$mimeType) {
                $mimeType = mime_content_type($filePath);
            }

            $content = file_get_contents($filePath);
            $file = $this->drive->files->create($fileMetadata, [
                'data' => $content,
                'mimeType' => $mimeType,
                'uploadType' => 'multipart',
                'fields' => 'id, name, webViewLink, webContentLink'
            ]);

            return [
                'id' => $file->getId(),
                'name' => $file->getName(),
                'web_view_link' => $file->getWebViewLink(),
                'web_content_link' => $file->getWebContentLink(),
            ];
        } catch (\Exception $e) {
            Log::error('Failed to upload file', [
                'error' => $e->getMessage(),
                'file_path' => $filePath,
                'file_name' => $fileName,
                'folder_name' => $folderName
            ]);
            throw $e;
        }
    }

    /**
     * Create a folder in Google Drive
     */
    public function createFolder($folderName, $parentFolderId = null)
    {
        try {
            if (!$parentFolderId) {
                $parentFolderId = $this->getBaseFolderId();
            }

            $fileMetadata = new DriveFile([
                'name' => $folderName,
                'mimeType' => 'application/vnd.google-apps.folder',
                'parents' => [$parentFolderId]
            ]);

            $folder = $this->drive->files->create($fileMetadata, [
                'fields' => 'id, name'
            ]);

            return $folder->getId();
        } catch (\Exception $e) {
            Log::error('Failed to create folder', [
                'error' => $e->getMessage(),
                'folder_name' => $folderName
            ]);
            throw $e;
        }
    }

    /**
     * Delete a file from Google Drive
     */
    public function deleteFile($fileId)
    {
        try {
            $this->drive->files->delete($fileId);
            return true;
        } catch (\Exception $e) {
            Log::error('Failed to delete file', [
                'error' => $e->getMessage(),
                'file_id' => $fileId
            ]);
            throw $e;
        }
    }

    /**
     * Search for files by name
     */
    public function searchFiles($searchTerm, $folderName = null)
    {
        try {
            $query = "name contains '{$searchTerm}' and trashed=false";
            
            if ($folderName) {
                $folderId = $this->getFolderId($folderName);
                if ($folderId) {
                    $query .= " and '{$folderId}' in parents";
                } else {
                    return [];
                }
            } else {
                $baseFolderId = $this->getBaseFolderId();
                $query .= " and '{$baseFolderId}' in parents";
            }

            $response = $this->drive->files->listFiles([
                'q' => $query,
                'fields' => 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink)',
                'pageSize' => 50
            ]);

            $files = [];
            foreach ($response->getFiles() as $file) {
                $files[] = [
                    'id' => $file->getId(),
                    'name' => $file->getName(),
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                    'created_time' => $file->getCreatedTime(),
                    'modified_time' => $file->getModifiedTime(),
                    'web_view_link' => $file->getWebViewLink(),
                    'web_content_link' => $file->getWebContentLink(),
                ];
            }

            return $files;
        } catch (\Exception $e) {
            Log::error('Failed to search files', [
                'error' => $e->getMessage(),
                'search_term' => $searchTerm,
                'folder_name' => $folderName
            ]);
            throw $e;
        }
    }
}

