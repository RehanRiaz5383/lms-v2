<?php

namespace App\Jobs;

use App\Models\SmtpSetting;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendLoginLogoutEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $to;
    public $subject;
    public $htmlContent;

    /**
     * Create a new job instance.
     */
    public function __construct(string $to, string $subject, string $htmlContent)
    {
        $this->to = $to;
        $this->subject = $subject;
        $this->htmlContent = $htmlContent;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // Get SMTP settings from database
        $smtpSettings = SmtpSetting::where('is_active', true)->first();

        // If no active SMTP settings, skip sending
        if (!$smtpSettings || !$smtpSettings->is_active) {
            Log::warning('Cannot send login/logout email: No active SMTP settings found');
            return;
        }

        // Configure mail settings BEFORE clearing instances
        Config::set('mail.default', 'smtp');
        Config::set('mail.mailers.smtp.transport', 'smtp');
        Config::set('mail.mailers.smtp.host', $smtpSettings->host);
        Config::set('mail.mailers.smtp.port', $smtpSettings->port);
        Config::set('mail.mailers.smtp.username', $smtpSettings->username);
        Config::set('mail.mailers.smtp.password', $smtpSettings->password);
        Config::set('mail.mailers.smtp.encryption', $smtpSettings->encryption ?? 'tls');
        Config::set('mail.mailers.smtp.timeout', null);
        Config::set('mail.from.address', $smtpSettings->from_address);
        Config::set('mail.from.name', $smtpSettings->from_name ?? 'LMS System');

        // Clear mailer instances AFTER setting config to force re-instantiation with new config
        if (app()->bound('mail.manager')) {
            app()->forgetInstance('mail.manager');
        }
        if (app()->bound('mailer')) {
            app()->forgetInstance('mailer');
        }

        // Send email
        try {
            Log::info('Attempting to send login/logout email', [
                'to' => $this->to,
                'subject' => $this->subject,
                'from' => $smtpSettings->from_address,
                'host' => $smtpSettings->host,
                'port' => $smtpSettings->port,
                'encryption' => $smtpSettings->encryption ?? 'tls',
                'config_host' => Config::get('mail.mailers.smtp.host'),
                'config_port' => Config::get('mail.mailers.smtp.port'),
            ]);

            // Get a fresh mailer instance after configuration
            $mailer = Mail::mailer('smtp');
            
            // Use Mail::raw() with HTML content (same pattern as SendNotificationEmail)
            $mailer->raw($this->htmlContent, function ($message) use ($smtpSettings) {
                $message->to($this->to)
                        ->from($smtpSettings->from_address, $smtpSettings->from_name ?? 'LMS System')
                        ->subject($this->subject);
            });

            Log::info('Login/logout email sent successfully', [
                'to' => $this->to,
                'subject' => $this->subject,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send login/logout email: ' . $e->getMessage(), [
                'to' => $this->to,
                'subject' => $this->subject,
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e; // Re-throw to mark job as failed
        }
    }
}

