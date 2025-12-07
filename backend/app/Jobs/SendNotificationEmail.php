<?php

namespace App\Jobs;

use App\Models\SmtpSetting;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;

class SendNotificationEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $to;
    public $subject;
    public $message;
    public $smtpSettings;

    /**
     * Create a new job instance.
     */
    public function __construct($to, $subject, $message, $smtpSettings = null)
    {
        $this->to = $to;
        $this->subject = $subject;
        $this->message = $message;
        $this->smtpSettings = $smtpSettings;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // Get SMTP settings if not provided
        if (!$this->smtpSettings) {
            $smtpSettings = SmtpSetting::where('is_active', true)->first();
        } else {
            $smtpSettings = $this->smtpSettings;
        }

        // If no active SMTP settings, skip sending
        if (!$smtpSettings || !$smtpSettings->is_active) {
            \Log::warning('Cannot send notification email: No active SMTP settings found');
            return;
        }

        // Configure mail settings - set default mailer to smtp
        Config::set('mail.default', 'smtp');
        Config::set('mail.mailers.smtp.transport', 'smtp');
        Config::set('mail.mailers.smtp.host', $smtpSettings->host);
        Config::set('mail.mailers.smtp.port', $smtpSettings->port);
        Config::set('mail.mailers.smtp.username', $smtpSettings->username);
        Config::set('mail.mailers.smtp.password', $smtpSettings->password);
        Config::set('mail.mailers.smtp.encryption', $smtpSettings->encryption ?? 'tls');
        Config::set('mail.mailers.smtp.timeout', null);
        Config::set('mail.from.address', $smtpSettings->from_address);
        Config::set('mail.from.name', $smtpSettings->from_name);

        // Send email
        try {
            \Log::info('Attempting to send email', [
                'to' => $this->to,
                'subject' => $this->subject,
                'from' => $smtpSettings->from_address,
                'host' => $smtpSettings->host,
                'port' => $smtpSettings->port,
            ]);

            Mail::raw($this->message, function ($message) use ($smtpSettings) {
                $message->to($this->to)
                        ->from($smtpSettings->from_address, $smtpSettings->from_name)
                        ->subject($this->subject);
            });

            \Log::info('Email sent successfully', ['to' => $this->to]);
        } catch (\Exception $e) {
            \Log::error('Failed to send notification email', [
                'to' => $this->to,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }
}

