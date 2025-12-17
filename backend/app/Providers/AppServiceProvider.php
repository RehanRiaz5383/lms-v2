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
    }
}
