<?php

namespace App\Providers;

use App\Events\StudentBlocked;
use App\Events\StudentLogin;
use App\Events\StudentLogout;
use App\Events\StudentRegistered;
use App\Events\UserUpdated;
use App\Listeners\SendStudentBlockedNotification;
use App\Listeners\SendUserLoginLogoutNotification;
use App\Listeners\SendStudentRegistrationNotification;
use App\Listeners\SendUserUpdateNotification;
use App\Mail\BaseMailable;
use App\Models\SmtpSetting;
use Illuminate\Mail\Events\MessageSending;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register event listeners
        Event::listen(
            StudentRegistered::class,
            SendStudentRegistrationNotification::class
        );

        Event::listen(
            StudentBlocked::class,
            SendStudentBlockedNotification::class
        );

        Event::listen(
            UserUpdated::class,
            SendUserUpdateNotification::class
        );

        // Register login/logout listeners separately to ensure single registration
        Event::listen(
            StudentLogin::class,
            SendUserLoginLogoutNotification::class
        );

        Event::listen(
            StudentLogout::class,
            SendUserLoginLogoutNotification::class
        );

        // Configure SMTP settings from database when email is being sent
        // This ensures SMTP settings are loaded when queued emails execute
        Event::listen(MessageSending::class, function (MessageSending $event) {
            try {
                $smtpSettings = SmtpSetting::where('is_active', true)->first();
                
                if (!$smtpSettings) {
                    Log::warning('No active SMTP settings found when trying to send email');
                    return;
                }

                // Get the mail manager and configure it
                $mailManager = app('mail.manager');
                
                // Create or get a custom mailer with database SMTP settings
                $mailManager->extend('database-smtp', function () use ($smtpSettings) {
                    $config = [
                        'transport' => 'smtp',
                        'host' => $smtpSettings->host,
                        'port' => $smtpSettings->port,
                        'username' => $smtpSettings->username,
                        'password' => $smtpSettings->password,
                        'encryption' => $smtpSettings->encryption ?? 'tls',
                        'timeout' => null,
                    ];
                    
                    return app('mail.manager')->createTransport($config);
                });
                
                // Set the mailer to use our custom mailer
                Config::set('mail.default', 'database-smtp');
                Config::set('mail.from.address', $smtpSettings->from_address);
                Config::set('mail.from.name', $smtpSettings->from_name ?? 'LMS System');
                
                Log::info('SMTP configured from database for email sending', [
                    'host' => $smtpSettings->host,
                    'port' => $smtpSettings->port,
                    'from' => $smtpSettings->from_address,
                    'to' => $event->message->getTo(),
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to configure SMTP from database: ' . $e->getMessage(), [
                    'exception' => get_class($e),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        });

        // Register Google Drive filesystem driver
        try {
            Storage::extend('google', function ($app, $config) {
                $options = [];

                if (!empty($config['teamDriveId'] ?? null)) {
                    $options['teamDriveId'] = $config['teamDriveId'];
                }

                if (!empty($config['sharedFolderId'] ?? null)) {
                    $options['sharedFolderId'] = $config['sharedFolderId'];
                }

                // Check if using service account or OAuth2
                // Prioritize OAuth2 if credentials are available (for user quota)
                $client = new \Google\Client();
                
                if (!empty($config['clientId'] ?? null) && !empty($config['clientSecret'] ?? null) && !empty($config['refreshToken'] ?? null)) {
                    // Use OAuth2 authentication (preferred for user quota)
                    $client->setClientId($config['clientId']);
                    $client->setClientSecret($config['clientSecret']);
                    $client->setDeveloperKey($config['apiKey'] ?? null);
                    $client->addScope(\Google\Service\Drive::DRIVE);
                    $client->refreshToken($config['refreshToken']);
                    
                    // Auto-refresh the access token if it's expired
                    if ($client->isAccessTokenExpired()) {
                        $client->fetchAccessTokenWithRefreshToken($config['refreshToken']);
                    }
                } elseif (!empty($config['serviceAccountKey'] ?? null) && file_exists($config['serviceAccountKey'])) {
                    // Fallback to service account authentication
                    $client->setAuthConfig($config['serviceAccountKey']);
                    $client->addScope(\Google\Service\Drive::DRIVE);
                    $client->setAccessType('offline');
                } else {
                    throw new \Exception('Google Drive authentication credentials not found. Please configure either OAuth2 or service account credentials.');
                }
                
                $service = new \Google\Service\Drive($client);
                
                // When using sharedFolderId, the folder parameter should be empty or '/'
                // The adapter will use the sharedFolderId as the root
                $rootFolder = empty($config['sharedFolderId']) ? ($config['folder'] ?? '/') : '/';
                
                $adapter = new \Masbug\Flysystem\GoogleDriveAdapter($service, $rootFolder, $options);
                $driver = new \League\Flysystem\Filesystem($adapter);

                return new \Illuminate\Filesystem\FilesystemAdapter($driver, $adapter);
            });
        } catch (\Exception $e) {
            Log::error('Failed to register Google Drive filesystem driver', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }
}
