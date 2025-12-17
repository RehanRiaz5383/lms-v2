<?php

namespace App\Listeners;

use App\Events\StudentLogin;
use App\Events\StudentLogout;
use App\Jobs\SendLoginLogoutEmailPhpMailer;
use App\Models\NotificationSetting;
use App\Models\SmtpSetting;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\View;

class SendUserLoginLogoutNotification
{
    /**
     * Handle the event.
     */
    public function handle(StudentLogin|StudentLogout $event): void
    {
        $action = $event instanceof StudentLogin ? 'login' : 'logout';
        Log::info("Student{$action} event received", ['user_id' => $event->student->id]);
        $this->sendNotification($event->student, $action);
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

            // Get active SMTP settings
            $smtpSettings = SmtpSetting::where('is_active', true)->first();
            if (!$smtpSettings) {
                Log::warning("Cannot send {$action} email: No active SMTP settings found");
                return;
            }

            // Format date
            $dateTime = now()->setTimezone('Asia/Karachi')->format('M d, Y h:i A');
            
            // Get IP address if available (for login)
            $ipAddress = null;
            if ($action === 'login' && request()) {
                $ipAddress = request()->ip();
            }

            // Render email HTML from view before queuing
            // Just render the child view - Blade will automatically include the layout via @extends
            $htmlContent = '';
            $subject = '';
            
            if ($action === 'login') {
                $htmlContent = View::make('emails.user-login', [
                    'headerTitle' => 'Account Login Notification',
                    'title' => 'Login Notification',
                    'userName' => $user->name,
                    'userEmail' => $user->email,
                    'loginDate' => $dateTime,
                    'ipAddress' => $ipAddress,
                ])->render();
                
                $subject = 'Account Login Notification - LMS System';
            } else {
                $htmlContent = View::make('emails.user-logout', [
                    'headerTitle' => 'Account Logout Notification',
                    'title' => 'Logout Notification',
                    'userName' => $user->name,
                    'userEmail' => $user->email,
                    'logoutDate' => $dateTime,
                ])->render();
                
                $subject = 'Account Logout Notification - LMS System';
            }

            // Dispatch job to send email with pre-rendered HTML using PHPMailer
            // SMTP settings will be loaded from database in the job
            // Use dispatchSync to prevent duplicate jobs (if queue is not running, it will execute immediately)
            // But we want it queue-based, so we'll use dispatch with a unique job ID
            $jobId = SendLoginLogoutEmailPhpMailer::dispatch($user->email, $subject, $htmlContent);
            
            Log::info("{$action} email queued for user {$user->id} ({$user->email})", [
                'job_id' => $jobId,
                'action' => $action,
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to send {$action} email to user {$user->id}: " . $e->getMessage(), [
                'exception' => get_class($e),
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $user->id,
                'user_email' => $user->email,
            ]);
            // Don't throw - we don't want to break login/logout flow
        }
    }
}

