<?php

namespace App\Listeners;

use App\Events\StudentLogin;
use App\Events\StudentLogout;
use App\Jobs\SendNotificationEmail;
use App\Models\NotificationSetting;
use App\Models\SmtpSetting;

class SendUserLoginLogoutNotification
{
    /**
     * Handle login event.
     */
    public function handleLogin(StudentLogin $event): void
    {
        $this->sendNotification($event->student, 'login');
    }

    /**
     * Handle logout event.
     */
    public function handleLogout(StudentLogout $event): void
    {
        $this->sendNotification($event->student, 'logout');
    }

    /**
     * Send notification for login/logout.
     */
    private function sendNotification($user, $action): void
    {
        // Check if notification is enabled
        $settings = NotificationSetting::first();
        if (!$settings || !$settings->user_login_logout) {
            return;
        }

        // Get active SMTP settings
        $smtpSettings = SmtpSetting::where('is_active', true)->first();
        if (!$smtpSettings) {
            \Log::warning('Cannot send user login/logout notification: No active SMTP settings');
            return;
        }

        // Send notification to the user who logged in/out
        $actionText = ucfirst($action);
        $subject = "Account {$actionText} Notification";
        
        $message = "Hello {$user->name},\n\n";
        $message .= "Your account has been successfully {$action}ed.\n\n";
        $message .= "Account Details:\n";
        $message .= "Name: {$user->name}\n";
        $message .= "Email: {$user->email}\n";
        $message .= "{$actionText} Date: " . now()->format('Y-m-d H:i:s') . "\n";
        
        if ($action === 'login') {
            $message .= "\nIf you did not perform this login, please secure your account immediately.\n";
        } else {
            $message .= "\nThank you for using our system.\n";
        }

        SendNotificationEmail::dispatch($user->email, $subject, $message, $smtpSettings);
    }
}

