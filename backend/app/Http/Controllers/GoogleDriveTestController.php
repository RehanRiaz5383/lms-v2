<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class GoogleDriveTestController extends Controller
{
    /**
     * Test endpoint to list files from Google Drive
     */
    public function testListFiles(Request $request): JsonResponse
    {
        try {
            $folderPath = $request->query('folder', ''); // Default to root
            $limit = (int) $request->query('limit', 50);

            // First, try to list root contents to see what's available
            try {
                $allContents = Storage::disk('google')->listContents($folderPath);
            } catch (\Exception $e) {
                // If folder path fails, try listing root
                if ($folderPath !== '') {
                    Log::warning('Failed to list folder, trying root', [
                        'folder' => $folderPath,
                        'error' => $e->getMessage()
                    ]);
                    $folderPath = '';
                    $allContents = Storage::disk('google')->listContents('');
                } else {
                    throw $e;
                }
            }
            
            // Separate files and folders
            $files = [];
            $folders = [];
            $totalCount = 0;
            
            // DirectoryListing is iterable, so we can foreach over it
            foreach ($allContents as $item) {
                $totalCount++;
                
                // Handle both array and object formats
                $itemPath = is_array($item) ? ($item['path'] ?? '') : ($item->path() ?? '');
                $itemType = is_array($item) ? ($item['type'] ?? 'file') : ($item->isFile() ? 'file' : 'dir');
                
                $itemData = [
                    'path' => $itemPath,
                    'name' => basename($itemPath),
                    'type' => $itemType,
                ];
                
                // Try to get size
                if (is_array($item) && isset($item['size'])) {
                    $itemData['size'] = $item['size'];
                } elseif (method_exists($item, 'fileSize')) {
                    $itemData['size'] = $item->fileSize();
                }
                
                // Try to get timestamp
                if (is_array($item) && isset($item['timestamp'])) {
                    $itemData['modified_time'] = date('Y-m-d H:i:s', $item['timestamp']);
                } elseif (method_exists($item, 'lastModified')) {
                    $itemData['modified_time'] = date('Y-m-d H:i:s', $item->lastModified());
                }
                
                if ($itemType === 'dir') {
                    $folders[] = $itemData;
                } else {
                    $files[] = $itemData;
                }
                
                // Limit results
                if (count($files) + count($folders) >= $limit) {
                    break;
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Google Drive API is working correctly',
                'data' => [
                    'folder_path' => $folderPath ?: 'root',
                    'folders' => $folders,
                    'files' => $files,
                    'files_count' => count($files),
                    'folders_count' => count($folders),
                    'total_count' => $totalCount,
                    'note' => 'If you don\'t see the "lms" folder, check that the service account has access to it, or try listing root with ?folder='
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Google Drive test failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to connect to Google Drive',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test endpoint to get base folder info
     */
    public function testBaseFolder(): JsonResponse
    {
        try {
            // List contents of the root to see what folders are available
            $rootContents = Storage::disk('google')->listContents('');
            
            $folders = [];
            $files = [];
            
            foreach ($rootContents as $item) {
                // Handle both array and object formats
                $itemPath = is_array($item) ? ($item['path'] ?? '') : ($item->path() ?? '');
                $itemType = is_array($item) ? ($item['type'] ?? 'file') : ($item->isFile() ? 'file' : 'dir');
                
                $itemData = [
                    'path' => $itemPath,
                    'name' => basename($itemPath),
                ];
                
                if ($itemType === 'dir') {
                    $folders[] = $itemData;
                } else {
                    $files[] = $itemData;
                }
            }

            // Check if 'lms' folder exists
            $lmsFolderExists = false;
            $lmsFolderPath = null;
            foreach ($folders as $folder) {
                if (strtolower($folder['name']) === 'lms') {
                    $lmsFolderExists = true;
                    $lmsFolderPath = $folder['path'];
                    break;
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Root folder listing successful',
                'data' => [
                    'root_folders' => $folders,
                    'root_files' => $files,
                    'folders_count' => count($folders),
                    'files_count' => count($files),
                    'lms_folder_exists' => $lmsFolderExists,
                    'lms_folder_path' => $lmsFolderPath,
                    'note' => $lmsFolderExists 
                        ? 'LMS folder found! You can access it using the path above.'
                        : 'LMS folder not found in root. Make sure the service account has access to it, or it might be in a shared folder/team drive.'
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Google Drive base folder test failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get base folder',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test endpoint to search files
     */
    public function testSearchFiles(Request $request): JsonResponse
    {
        try {
            $searchTerm = $request->query('q', '');
            $folderPath = $request->query('folder', 'lms');

            if (empty($searchTerm)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Search term (q) is required'
                ], 400);
            }

            // List all contents and filter by search term
            $allContents = Storage::disk('google')->listContents($folderPath);
            
            $matchedFiles = [];
            foreach ($allContents as $item) {
                // Handle both array and object formats
                $itemPath = is_array($item) ? ($item['path'] ?? '') : ($item->path() ?? '');
                $itemType = is_array($item) ? ($item['type'] ?? 'file') : ($item->isFile() ? 'file' : 'dir');
                
                if ($itemType === 'file' && stripos(basename($itemPath), $searchTerm) !== false) {
                    $fileData = [
                        'path' => $itemPath,
                        'name' => basename($itemPath),
                    ];
                    
                    // Try to get size
                    if (is_array($item) && isset($item['size'])) {
                        $fileData['size'] = $item['size'];
                    } elseif (method_exists($item, 'fileSize')) {
                        $fileData['size'] = $item->fileSize();
                    } else {
                        $fileData['size'] = null;
                    }
                    
                    // Try to get timestamp
                    if (is_array($item) && isset($item['timestamp'])) {
                        $fileData['modified_time'] = date('Y-m-d H:i:s', $item['timestamp']);
                    } elseif (method_exists($item, 'lastModified')) {
                        $fileData['modified_time'] = date('Y-m-d H:i:s', $item->lastModified());
                    } else {
                        $fileData['modified_time'] = null;
                    }
                    
                    $matchedFiles[] = $fileData;
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Search completed',
                'data' => [
                    'search_term' => $searchTerm,
                    'folder_path' => $folderPath,
                    'files' => $matchedFiles,
                    'count' => count($matchedFiles),
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Google Drive search test failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Search failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test endpoint to get folder ID from Google Drive URL
     * This helps identify the folder ID needed for sharedFolderId configuration
     */
    public function testGetFolderInfo(Request $request): JsonResponse
    {
        try {
            $folderUrl = $request->query('url', '');
            
            if (empty($folderUrl)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Google Drive folder URL is required',
                    'instructions' => [
                        '1. Open the "lms" folder in Google Drive',
                        '2. Copy the URL from your browser',
                        '3. The URL format is: https://drive.google.com/drive/folders/FOLDER_ID',
                        '4. Call this endpoint with: ?url=YOUR_FOLDER_URL',
                        '5. Or extract the folder ID and add to .env: GOOGLE_DRIVE_SHARED_FOLDER_ID=your_folder_id'
                    ]
                ], 400);
            }

            // Extract folder ID from Google Drive URL
            // Format: https://drive.google.com/drive/folders/FOLDER_ID
            preg_match('/\/folders\/([a-zA-Z0-9_-]+)/', $folderUrl, $matches);
            
            if (empty($matches[1])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Could not extract folder ID from URL',
                    'url_provided' => $folderUrl,
                    'instructions' => 'Make sure the URL is in format: https://drive.google.com/drive/folders/FOLDER_ID'
                ], 400);
            }

            $folderId = $matches[1];

            return response()->json([
                'success' => true,
                'message' => 'Folder ID extracted successfully',
                'data' => [
                    'folder_id' => $folderId,
                    'folder_url' => $folderUrl,
                    'instructions' => [
                        'Add this to your .env file:',
                        "GOOGLE_DRIVE_SHARED_FOLDER_ID={$folderId}",
                        '',
                        'Then clear config cache:',
                        'php artisan config:clear',
                        '',
                        'After that, the folder should be accessible via the Storage facade.'
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Google Drive folder info test failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to extract folder info',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

