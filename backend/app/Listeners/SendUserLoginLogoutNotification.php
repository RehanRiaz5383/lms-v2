<?php

namespace App\Listeners;

use App\Events\StudentLogin;
use App\Events\StudentLogout;
use App\Mail\UserLoginMail;
use App\Mail\UserLogoutMail;
use App\Models\NotificationSetting;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

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
        try {
            // Check if notification is enabled
            $settings = NotificationSetting::first();
            if (!$settings || !$settings->user_login_logout) {
                Log::info("Login/logout email notification is disabled for user {$user->id}");
                return;
            }

            // Format date
            $dateTime = now()->setTimezone('Asia/Karachi')->format('M d, Y h:i A');
            
            // Get IP address if available (for login)
            $ipAddress = null;
            if ($action === 'login' && request()) {
                $ipAddress = request()->ip();
            }

            // Send email using the new template system
            if ($action === 'login') {
                Mail::to($user->email)->queue(
                    new UserLoginMail($user->name, $user->email, $dateTime, $ipAddress)
                );
                Log::info("Login email queued for user {$user->id} ({$user->email})");
            } else {
                Mail::to($user->email)->queue(
                    new UserLogoutMail($user->name, $user->email, $dateTime)
                );
                Log::info("Logout email queued for user {$user->id} ({$user->email})");
            }
        } catch (\Exception $e) {
            Log::error("Failed to send {$action} email to user {$user->id}: " . $e->getMessage(), [
                'exception' => $e,
                'user_id' => $user->id,
                'user_email' => $user->email,
            ]);
            // Don't throw - we don't want to break login/logout flow
        }
    }
}

