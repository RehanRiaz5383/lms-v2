<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Http\Request;

Route::get('/', function () {
    return view('welcome');
});

/**
 * Test endpoint to debug storage route and server configuration
 */
Route::get('/test-storage', function () {
    $testPath = 'User_Profile';
    $storagePath = storage_path('app/public');
    
    $info = [
        'base_path' => base_path(),
        'storage_path' => $storagePath,
        'storage_exists' => is_dir($storagePath),
        'storage_readable' => is_readable($storagePath),
        'test_directory' => $storagePath . '/' . $testPath,
        'test_directory_exists' => is_dir($storagePath . '/' . $testPath),
        'test_directory_readable' => is_readable($storagePath . '/' . $testPath),
        'files_in_test_dir' => [],
        'storage_disk_path' => Storage::disk('public')->path(''),
        'php_user' => get_current_user(),
        'server_info' => [
            'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'N/A',
            'script_filename' => $_SERVER['SCRIPT_FILENAME'] ?? 'N/A',
            'request_uri' => $_SERVER['REQUEST_URI'] ?? 'N/A',
            'server_name' => $_SERVER['SERVER_NAME'] ?? 'N/A',
        ]
    ];
    
    if (is_dir($storagePath . '/' . $testPath)) {
        $files = scandir($storagePath . '/' . $testPath);
        $info['files_in_test_dir'] = array_values(array_filter($files, function($f) {
            return $f !== '.' && $f !== '..';
        }));
        
        // Check permissions of first file if exists
        if (!empty($info['files_in_test_dir'])) {
            $firstFile = $storagePath . '/' . $testPath . '/' . $info['files_in_test_dir'][0];
            $info['first_file_path'] = $firstFile;
            $info['first_file_exists'] = file_exists($firstFile);
            $info['first_file_readable'] = is_readable($firstFile);
            $info['first_file_permissions'] = file_exists($firstFile) ? substr(sprintf('%o', fileperms($firstFile)), -4) : 'N/A';
        }
    }
    
    return response()->json($info, 200, [], JSON_PRETTY_PRINT);
});

/**
 * Storage Route - Serves files from storage/app/public
 * This route works on shared hosting without symlinks
 * Using /load-storage to avoid conflicts with server configurations
 */
Route::get('/load-storage/{path}', function ($path) {
    try {
        // Security: Prevent directory traversal
        $path = str_replace('..', '', $path);
        $path = ltrim($path, '/');
        
        // Log for debugging (remove in production if needed)
        \Log::info('Storage route accessed', [
            'path' => $path,
            'request_path' => request()->path(),
            'full_url' => request()->fullUrl()
        ]);
        
        // Check if file exists in storage
        if (!Storage::disk('public')->exists($path)) {
            \Log::warning('Storage file not found', ['path' => $path]);
            abort(404, 'File not found');
        }
        
        $filePath = Storage::disk('public')->path($path);
        
        // Verify file is readable
        if (!is_readable($filePath)) {
            \Log::error('Storage file not readable', [
                'path' => $path,
                'file_path' => $filePath,
                'permissions' => substr(sprintf('%o', fileperms($filePath)), -4)
            ]);
            abort(403, 'File access denied');
        }
        
        // Get MIME type
        $mimeType = Storage::disk('public')->mimeType($path);
        
        // If MIME type detection fails, try to guess from extension
        if (!$mimeType) {
            $extension = pathinfo($path, PATHINFO_EXTENSION);
            $mimeTypes = [
                'jpg' => 'image/jpeg',
                'jpeg' => 'image/jpeg',
                'png' => 'image/png',
                'gif' => 'image/gif',
                'pdf' => 'application/pdf',
                'mp4' => 'video/mp4',
                'webm' => 'video/webm',
            ];
            $mimeType = $mimeTypes[strtolower($extension)] ?? 'application/octet-stream';
        }
        
        // Return file with proper headers
        return response()->file($filePath, [
            'Content-Type' => $mimeType,
            'Cache-Control' => 'public, max-age=31536000', // Cache for 1 year
        ]);
    } catch (\Exception $e) {
        \Log::error('Storage route error', [
            'path' => $path,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        abort(500, 'Error serving file: ' . $e->getMessage());
    }
})->where('path', '.*');

/**
 * Migration Endpoint - Run migrations via URL
 * 
 * SECURITY: This endpoint requires a secret token to prevent unauthorized access.
 * Add MIGRATION_TOKEN to your .env file with a strong random string.
 * 
 * Usage: POST /run-migrations?token=YOUR_SECRET_TOKEN
 *        or GET /run-migrations?token=YOUR_SECRET_TOKEN
 * 
 * IMPORTANT: Remove or disable this route in production after migrations are complete!
 */
Route::match(['get', 'post'], '/run-migrations', function (Request $request) {
    // Get token from request (query parameter or header)
    $providedToken = $request->get('token') ?? $request->header('X-Migration-Token');
    $expectedToken = env('MIGRATION_TOKEN');
    
    // Security check: Require token
    if (empty($expectedToken)) {
        return response()->json([
            'success' => false,
            'message' => 'Migration token not configured. Please set MIGRATION_TOKEN in .env file.',
            'error' => 'Configuration missing'
        ], 500);
    }
    
    if (empty($providedToken) || $providedToken !== $expectedToken) {
        return response()->json([
            'success' => false,
            'message' => 'Invalid or missing migration token.',
            'error' => 'Unauthorized'
        ], 401);
    }
    
    // Additional security: Disable in production unless explicitly allowed
    if (app()->environment('production') && !env('ALLOW_MIGRATIONS_IN_PRODUCTION', false)) {
        return response()->json([
            'success' => false,
            'message' => 'Migrations are disabled in production for security. Set ALLOW_MIGRATIONS_IN_PRODUCTION=true in .env to enable.',
            'error' => 'Production mode'
        ], 403);
    }
    
    try {
        // Run migrations
        Artisan::call('migrate', [
            '--force' => true, // Required for production
        ]);
        
        $output = Artisan::output();
        
        return response()->json([
            'success' => true,
            'message' => 'Migrations completed successfully.',
            'output' => $output,
            'timestamp' => now()->toDateTimeString()
        ], 200);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Migration failed: ' . $e->getMessage(),
            'error' => config('app.debug') ? [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ] : 'Migration error occurred'
        ], 500);
    }
})->name('run-migrations');

/**
 * Queue Processing Endpoint - Process queued jobs via URL
 * 
 * SECURITY: This endpoint requires a secret token to prevent unauthorized access.
 * Add QUEUE_TOKEN to your .env file with a strong random string.
 * 
 * Usage: GET /process-queue?token=YOUR_SECRET_TOKEN
 *        or POST /process-queue?token=YOUR_SECRET_TOKEN
 * 
 * This is useful for shared hosting where you can't run long-running queue workers.
 * Set up a cron job to call this URL every minute.
 */
Route::match(['get', 'post'], '/process-queue', function (Request $request) {
    // Get token from request (query parameter or header)
    $providedToken = $request->get('token') ?? $request->header('X-Queue-Token');
    $expectedToken = env('QUEUE_TOKEN');
    
    // Security check: Require token
    if (empty($expectedToken)) {
        return response()->json([
            'success' => false,
            'message' => 'Queue token not configured. Please set QUEUE_TOKEN in .env file.',
            'error' => 'Configuration missing'
        ], 500);
    }
    
    if (empty($providedToken) || $providedToken !== $expectedToken) {
        return response()->json([
            'success' => false,
            'message' => 'Invalid or missing queue token.',
            'error' => 'Unauthorized'
        ], 401);
    }
    
    try {
        // Process one job from the queue
        // Using --once flag to process one job and exit (perfect for cron)
        Artisan::call('queue:work', [
            '--once' => true,
            '--tries' => 3,
            '--timeout' => 60,
        ]);
        
        $output = Artisan::output();
        
        // Count remaining jobs
        $remainingJobs = \DB::table('jobs')->count();
        
        return response()->json([
            'success' => true,
            'message' => 'Queue processed successfully.',
            'remaining_jobs' => $remainingJobs,
            'output' => $output,
            'timestamp' => now()->toDateTimeString()
        ], 200);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Queue processing failed: ' . $e->getMessage(),
            'error' => config('app.debug') ? [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ] : 'Queue processing error occurred'
        ], 500);
    }
})->name('process-queue');
