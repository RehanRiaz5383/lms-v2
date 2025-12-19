<?php

namespace App\Listeners;

use App\Events\UserUpdated;
use App\Jobs\SendNotificationEmail;
use App\Models\NotificationSetting;
use App\Models\SmtpSetting;
use App\Models\User;

class SendUserUpdateNotification
{
    /**
     * Handle the event.
     */
    public function handle(UserUpdated $event): void
    {
        // Check if notification is enabled
        $settings = NotificationSetting::first();
        if (!$settings || !$settings->user_update) {
            return;
        }

        // Get active SMTP settings
        $smtpSettings = SmtpSetting::where('is_active', true)->first();
        if (!$smtpSettings) {
            \Log::warning('Cannot send user update notification: No active SMTP settings');
            return;
        }

        // Send notification to the updated user
        $changesText = '';
        if (!empty($event->changes)) {
            $changesText = "\n\nYour account information has been updated:\n";
            foreach ($event->changes as $field => $value) {
                $changesText .= "- " . ucfirst(str_replace('_', ' ', $field)) . ": {$value}\n";
            }
        }

        $subject = 'Your Account Information Has Been Updated';
        $message = "Hello {$event->user->name},\n\n";
        $message .= "Your account information has been updated.\n\n";
        $message .= "Account Details:\n";
        $message .= "Name: {$event->user->name}\n";
        $message .= "Email: {$event->user->email}\n";
        $message .= $changesText;
        $message .= "\nUpdate Date: " . now()->format('Y-m-d H:i:s') . "\n";
        $message .= "\nIf you did not make these changes, please contact support immediately.\n";

        // Send email notification
        SendNotificationEmail::dispatch($event->user->email, $subject, $message, $smtpSettings);

        // Create in-app notification for the user
        $event->user->sendCrmNotification(
            'account_updated',
            'Account Information Updated',
            "Your account information has been updated" . (!empty($event->changes) ? ". Changes: " . implode(', ', array_keys($event->changes)) : ''),
            [
                'changes' => $event->changes ?? [],
            ]
        );
    }
}

