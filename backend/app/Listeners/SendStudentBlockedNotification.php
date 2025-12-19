<?php

namespace App\Listeners;

use App\Events\StudentBlocked;
use App\Jobs\SendNotificationEmail;
use App\Models\NotificationSetting;
use App\Models\SmtpSetting;
use App\Models\User;

class SendStudentBlockedNotification
{
    /**
     * Handle the event.
     */
    public function handle(StudentBlocked $event): void
    {
        // Check if notification is enabled
        $settings = NotificationSetting::first();
        if (!$settings || !$settings->block_student_registration) {
            return;
        }

        // Get active SMTP settings
        $smtpSettings = SmtpSetting::where('is_active', true)->first();
        if (!$smtpSettings) {
            \Log::warning('Cannot send student blocked notification: No active SMTP settings');
            return;
        }

        // Get admin users to notify (check both user_type and roles)
        $admins = User::where(function($query) {
            $query->where('user_type', 1)
                  ->orWhereHas('roles', function($q) {
                      $q->where('user_types.id', 1);
                  });
        })->get();

        foreach ($admins as $admin) {
            $subject = 'Student Blocked';
            $message = "A student has been blocked:\n\n";
            $message .= "Name: {$event->student->name}\n";
            $message .= "Email: {$event->student->email}\n";
            if ($event->blockReason) {
                $message .= "Reason: {$event->blockReason}\n";
            }
            $message .= "Blocked Date: " . now()->format('Y-m-d H:i:s') . "\n";

            // Send email notification
            SendNotificationEmail::dispatch($admin->email, $subject, $message, $smtpSettings);

            // Create in-app notification for admin
            $admin->sendCrmNotification(
                'student_blocked',
                'Student Blocked',
                "Student {$event->student->name} has been blocked" . ($event->blockReason ? ": {$event->blockReason}" : ''),
                [
                    'student_id' => $event->student->id,
                    'student_name' => $event->student->name,
                    'student_email' => $event->student->email,
                    'block_reason' => $event->blockReason,
                ]
            );
        }
    }
}

