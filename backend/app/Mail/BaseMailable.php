<?php

namespace App\Mail;

use App\Models\SmtpSetting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;

abstract class BaseMailable extends Mailable
{
    use Queueable, SerializesModels;

    protected $headerTitle = 'LMS System';
    protected $title = 'Notification';

    /**
     * Get the message envelope.
     * Configure SMTP from database when the envelope is being built (when email is sent).
     */
    public function envelope(): Envelope
    {
        // Configure SMTP from database when the email is being sent
        // This ensures SMTP settings are loaded when the queued job executes
        $this->configureSmtpFromDatabase();
        
        return new Envelope(
            subject: $this->getSubject(),
        );
    }

    /**
     * Configure SMTP settings from database.
     */
    protected function configureSmtpFromDatabase(): void
    {
        try {
            $smtpSettings = SmtpSetting::where('is_active', true)->first();
            
            if ($smtpSettings) {
                // Clear mailer instances first to force re-instantiation
                if (app()->bound('mail.manager')) {
                    app()->forgetInstance('mail.manager');
                }
                if (app()->bound('mailer')) {
                    app()->forgetInstance('mailer');
                }
                
                // Set configuration
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
                
                Log::info('SMTP configured from database in BaseMailable', [
                    'host' => $smtpSettings->host,
                    'port' => $smtpSettings->port,
                ]);
            } else {
                Log::warning('No active SMTP settings found in BaseMailable');
            }
        } catch (\Exception $e) {
            Log::error('Failed to configure SMTP from database in BaseMailable: ' . $e->getMessage(), [
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: $this->getView(),
            with: array_merge($this->getViewData(), [
                'headerTitle' => $this->headerTitle,
                'title' => $this->title,
            ]),
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }

    /**
     * Get the email subject.
     * Override this in child classes.
     */
    abstract protected function getSubject(): string;

    /**
     * Get the view name.
     * Override this in child classes.
     */
    abstract protected function getView(): string;

    /**
     * Get the view data.
     * Override this in child classes.
     */
    abstract protected function getViewData(): array;
}

