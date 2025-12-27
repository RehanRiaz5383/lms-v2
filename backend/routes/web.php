<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;
use Illuminate\Http\Request;

Route::get('/', function () {
    return view('welcome');
});

// Scheduled Jobs Endpoint (for cron) - No authentication required for cron calls
// You can add IP whitelist or token authentication if needed
Route::get('/cron/execute-jobs', [\App\Http\Controllers\ScheduledJobController::class, 'execute']);

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

/**
 * Check VAPID key generation capabilities
 * 
 * Usage: GET /check-vapid-capabilities
 */
Route::get('/check-vapid-capabilities', function () {
    $capabilities = [
        'openssl_available' => function_exists('openssl_pkey_new') && function_exists('openssl_pkey_export'),
        'openssl_ec_supported' => false,
        'minishlink_available' => class_exists(\Minishlink\WebPush\VAPID::class),
        'jwkfactory_available' => class_exists(\Jose\Component\KeyManagement\JWKFactory::class),
        'php_version' => PHP_VERSION,
        'openssl_version' => defined('OPENSSL_VERSION_TEXT') ? OPENSSL_VERSION_TEXT : (function_exists('openssl_version_text') ? openssl_version_text() : 'N/A'),
    ];
    
    // Test if OpenSSL EC is actually supported
    if ($capabilities['openssl_available']) {
        try {
            $testConfig = [
                'curve_name' => 'prime256v1',
                'private_key_type' => OPENSSL_KEYTYPE_EC,
            ];
            $testKey = @openssl_pkey_new($testConfig);
            $capabilities['openssl_ec_supported'] = ($testKey !== false);
            if ($testKey) {
                @openssl_free_key($testKey);
            }
        } catch (\Exception $e) {
            $capabilities['openssl_ec_error'] = $e->getMessage();
        }
    }
    
    // Try to generate keys using the helper
    $canGenerate = \App\Helpers\VapidKeyGenerator::isAvailable();
    $availableMethods = \App\Helpers\VapidKeyGenerator::getAvailableMethods();
    
    $capabilities['can_generate'] = $canGenerate;
    $capabilities['available_methods'] = $availableMethods;
    
    // Try actual generation
    if ($canGenerate) {
        try {
            $testKeys = \App\Helpers\VapidKeyGenerator::generate();
            $capabilities['test_generation'] = [
                'success' => ($testKeys !== null),
                'has_public_key' => isset($testKeys['publicKey']),
                'has_private_key' => isset($testKeys['privateKey']),
                'method_used' => $testKeys['method'] ?? null,
            ];
        } catch (\Exception $e) {
            $capabilities['test_generation'] = [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
    
    return response()->json([
        'capabilities' => $capabilities,
        'recommendation' => $canGenerate 
            ? 'VAPID key generation should work on this server'
            : 'VAPID key generation is not available. Use manual generation methods.',
    ], 200);
});

/**
 * Check notifications table structure
 */
Route::get('/check-notifications-table', function () {
    try {
        $columns = DB::select('DESCRIBE notifications');
        $sample = DB::table('notifications')->first();
        return response()->json([
            'columns' => $columns,
            'sample' => $sample,
            'has_user_id' => DB::getSchemaBuilder()->hasColumn('notifications', 'user_id'),
            'has_notifiable_id' => DB::getSchemaBuilder()->hasColumn('notifications', 'notifiable_id'),
            'has_type' => DB::getSchemaBuilder()->hasColumn('notifications', 'type'),
            'has_title' => DB::getSchemaBuilder()->hasColumn('notifications', 'title'),
            'has_message' => DB::getSchemaBuilder()->hasColumn('notifications', 'message'),
        ]);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

/**
 * Database Upgrade Endpoint - Run migrations and seeders
 * 
 * This endpoint runs all pending migrations and seeders (if not already in DB).
 * No high-end security, just a simple GET URL.
 * 
 * Usage: GET /upgrade-db
 * 
 * IMPORTANT: This is a simple endpoint without authentication.
 * Consider adding basic security in production if needed.
 */
Route::get('/upgrade-db', function () {
    try {
        $results = [
            'migrations' => null,
            'seeders' => null,
            'timestamp' => now()->toDateTimeString(),
        ];

        // Run migrations
        try {
            \Artisan::call('migrate', [
                '--force' => true,
            ]);
            $results['migrations'] = [
                'success' => true,
                'output' => \Artisan::output(),
            ];
        } catch (\Exception $e) {
            $results['migrations'] = [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }

        // Run seeders
        $seederResults = [];
        try {
            // Run UserTypeSeeder if needed
            $crRoleExists = \DB::table('user_types')
                ->where('title', 'Class Representative (CR)')
                ->exists();
            
            if (!$crRoleExists) {
                \Artisan::call('db:seed', [
                    '--class' => 'UserTypeSeeder',
                    '--force' => true,
                ]);
                $seederResults[] = [
                    'seeder' => 'UserTypeSeeder',
                    'success' => true,
                    'message' => 'CR role added',
                ];
            } else {
                $allRolesExist = \DB::table('user_types')
                    ->whereIn('title', ['Admin', 'Student', 'Teacher', 'Class Representative (CR)'])
                    ->count() >= 4;
                
                if (!$allRolesExist) {
                    \Artisan::call('db:seed', [
                        '--class' => 'UserTypeSeeder',
                        '--force' => true,
                    ]);
                    $seederResults[] = [
                        'seeder' => 'UserTypeSeeder',
                        'success' => true,
                        'message' => 'Missing roles added',
                    ];
                }
            }

            // Run ScheduledJobSeeder if scheduled_jobs table exists
            if (\Schema::hasTable('scheduled_jobs')) {
                // Check for all expected jobs
                $expectedJobs = [
                    'TaskReminderJob',
                    'VoucherGenerationJob',
                    'VoucherOverdueNotificationJob',
                    'VoucherAutoBlockJob',
                ];
                
                $missingJobs = [];
                foreach ($expectedJobs as $jobClass) {
                    $exists = \DB::table('scheduled_jobs')
                        ->where('job_class', $jobClass)
                        ->exists();
                    if (!$exists) {
                        $missingJobs[] = $jobClass;
                    }
                }
                
                // Run seeder if any jobs are missing (firstOrCreate will only create missing ones)
                if (!empty($missingJobs)) {
                    \Artisan::call('db:seed', [
                        '--class' => 'ScheduledJobSeeder',
                        '--force' => true,
                    ]);
                    $seederResults[] = [
                        'seeder' => 'ScheduledJobSeeder',
                        'success' => true,
                        'message' => 'Missing scheduled jobs added: ' . implode(', ', $missingJobs),
                    ];
                }
            }

            // Update notification_settings table if new columns are missing
            if (\Schema::hasTable('notification_settings')) {
                $hasNotifyOnNewSignup = \Schema::hasColumn('notification_settings', 'notify_on_new_signup');
                $hasNotifyOnPaymentProof = \Schema::hasColumn('notification_settings', 'notify_on_payment_proof_submission');
                
                if (!$hasNotifyOnNewSignup || !$hasNotifyOnPaymentProof) {
                    try {
                        if (!$hasNotifyOnNewSignup) {
                            \DB::statement('ALTER TABLE notification_settings ADD COLUMN notify_on_new_signup BOOLEAN DEFAULT FALSE');
                        }
                        if (!$hasNotifyOnPaymentProof) {
                            \DB::statement('ALTER TABLE notification_settings ADD COLUMN notify_on_payment_proof_submission BOOLEAN DEFAULT FALSE');
                        }
                        $seederResults[] = [
                            'seeder' => 'NotificationSettingsMigration',
                            'success' => true,
                            'message' => 'Added new notification settings columns',
                        ];
                    } catch (\Exception $e) {
                        $seederResults[] = [
                            'seeder' => 'NotificationSettingsMigration',
                            'success' => false,
                            'message' => 'Failed to add notification settings columns: ' . $e->getMessage(),
                        ];
                    }
                }
            }
            
            $results['seeders'] = [
                'success' => true,
                'message' => count($seederResults) > 0 ? 'Seeders executed' : 'All seeders up to date',
                'details' => $seederResults,
            ];
        } catch (\Exception $e) {
            $results['seeders'] = [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }

        // Generate VAPID keys for push notifications if not already set
        $results['vapid_keys'] = null;
        try {
            $vapidPublicKey = env('VAPID_PUBLIC_KEY');
            $vapidPrivateKey = env('VAPID_PRIVATE_KEY');
            
            if (empty($vapidPublicKey) || empty($vapidPrivateKey)) {
                // Use the VapidKeyGenerator helper
                $generatedKeys = \App\Helpers\VapidKeyGenerator::generate();
                $availableMethods = \App\Helpers\VapidKeyGenerator::getAvailableMethods();
                $isAvailable = \App\Helpers\VapidKeyGenerator::isAvailable();
                
                if ($generatedKeys && isset($generatedKeys['publicKey']) && isset($generatedKeys['privateKey'])) {
                    $results['vapid_keys'] = [
                        'success' => true,
                        'generated' => true,
                        'message' => 'VAPID keys generated successfully using ' . ($generatedKeys['method'] ?? 'unknown method') . '. Add these to your .env file:',
                        'public_key' => $generatedKeys['publicKey'],
                        'private_key' => $generatedKeys['privateKey'],
                        'method_used' => $generatedKeys['method'] ?? 'unknown',
                        'instructions' => [
                            '1. Open your .env file',
                            '2. Add the following lines:',
                            'VAPID_PUBLIC_KEY=' . $generatedKeys['publicKey'],
                            'VAPID_PRIVATE_KEY=' . $generatedKeys['privateKey'],
                            '3. Save the file and restart your application server',
                            '4. After restarting, push notifications will be enabled'
                        ],
                        'env_lines' => [
                            'VAPID_PUBLIC_KEY=' . $generatedKeys['publicKey'],
                            'VAPID_PRIVATE_KEY=' . $generatedKeys['privateKey'],
                        ]
                    ];
                } else {
                    $results['vapid_keys'] = [
                        'success' => false,
                        'generated' => false,
                        'message' => 'VAPID keys not configured. Automatic generation is not available on this server.',
                        'available_methods' => $availableMethods,
                        'is_available' => $isAvailable,
                        'instructions' => [
                            'Automatic VAPID key generation is not available. Use one of these methods:',
                            '',
                            'Method 1 - Node.js (Recommended):',
                            '  npm install -g web-push',
                            '  web-push generate-vapid-keys',
                            '',
                            'Method 2 - Online Generator:',
                            '  Visit: https://web-push-codelab.glitch.me/',
                            '  Generate keys and copy them',
                            '',
                            'Method 3 - PHP Script (if you have shell access):',
                            '  cd backend',
                            '  php generate-vapid-keys.php',
                            '',
                            'After generating, add to .env:',
                            '  VAPID_PUBLIC_KEY=your_public_key_here',
                            '  VAPID_PRIVATE_KEY=your_private_key_here',
                            '',
                            'Then restart your application server.'
                        ],
                        'php_info' => [
                            'openssl_available' => function_exists('openssl_pkey_new'),
                            'minishlink_available' => class_exists(\Minishlink\WebPush\VAPID::class),
                            'jwkfactory_available' => class_exists(\Jose\Component\KeyManagement\JWKFactory::class),
                        ]
                    ];
                }
            } else {
                $results['vapid_keys'] = [
                    'success' => true,
                    'generated' => false,
                    'message' => 'VAPID keys are already configured in .env',
                    'public_key_set' => !empty($vapidPublicKey),
                    'private_key_set' => !empty($vapidPrivateKey),
                ];
            }
        } catch (\Exception $e) {
            $results['vapid_keys'] = [
                'success' => false,
                'error' => $e->getMessage(),
                'message' => 'Error checking VAPID keys configuration',
                'trace' => config('app.debug') ? $e->getTraceAsString() : null,
            ];
        }

        // Clear application cache
        try {
            \Artisan::call('optimize:clear');
            $results['cache_clear'] = [
                'success' => true,
                'message' => 'Application cache cleared successfully',
                'output' => \Artisan::output(),
            ];
        } catch (\Exception $e) {
            $results['cache_clear'] = [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }

        return response()->json([
            'success' => true,
            'message' => 'Database upgrade completed',
            'results' => $results,
        ], 200);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Database upgrade failed: ' . $e->getMessage(),
            'error' => config('app.debug') ? [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ] : 'Upgrade error occurred'
        ], 500);
    }
})->name('upgrade-db');
