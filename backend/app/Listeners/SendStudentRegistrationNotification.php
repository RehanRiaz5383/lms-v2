<?php

namespace App\Listeners;

use App\Events\StudentRegistered;
use App\Jobs\SendNotificationEmail;
use App\Models\NotificationSetting;
use App\Models\SmtpSetting;
use App\Models\User;

class SendStudentRegistrationNotification
{
    /**
     * Handle the event.
     */
    public function handle(StudentRegistered $event): void
    {
        // Check if notification is enabled
        $settings = NotificationSetting::first();
        if (!$settings || !$settings->new_student_registration) {
            return;
        }

        // Get active SMTP settings
        $smtpSettings = SmtpSetting::where('is_active', true)->first();
        if (!$smtpSettings) {
            \Log::warning('Cannot send student registration notification: No active SMTP settings');
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
            $subject = 'New Student Registration';
            $message = "A new student has been registered:\n\n";
            $message .= "Name: {$event->student->name}\n";
            $message .= "Email: {$event->student->email}\n";
            $message .= "Registration Date: " . now()->format('Y-m-d H:i:s') . "\n";

            SendNotificationEmail::dispatch($admin->email, $subject, $message, $smtpSettings);
        }
    }
}

