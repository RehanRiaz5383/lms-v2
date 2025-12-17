<?php

namespace App\Jobs;

use App\Models\SmtpSetting;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

class SendLoginLogoutEmailPhpMailer implements ShouldQueue
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

        try {
            Log::info('Attempting to send login/logout email with PHPMailer', [
                'to' => $this->to,
                'subject' => $this->subject,
                'from' => $smtpSettings->from_address,
                'host' => $smtpSettings->host,
                'port' => $smtpSettings->port,
            ]);

            // Create PHPMailer instance
            $mail = new PHPMailer(true);

            // Server settings
            $mail->isSMTP();
            $mail->Host = $smtpSettings->host;
            $mail->SMTPAuth = true;
            $mail->Username = $smtpSettings->username;
            $mail->Password = $smtpSettings->password;
            
            // Map encryption type
            $encryption = strtolower($smtpSettings->encryption ?? 'tls');
            if ($encryption === 'ssl') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            } else {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            }
            
            $mail->Port = $smtpSettings->port;
            $mail->CharSet = 'UTF-8';
            $mail->SMTPDebug = 0; // Set to 2 for debugging

            // Recipients
            $mail->setFrom($smtpSettings->from_address, $smtpSettings->from_name ?? 'LMS System');
            $mail->addAddress($this->to);

            // Content
            $mail->isHTML(true);
            $mail->Subject = $this->subject;
            $mail->Body = $this->htmlContent;
            $mail->AltBody = strip_tags($this->htmlContent);

            // Send email
            $mail->send();

            Log::info('Login/logout email sent successfully with PHPMailer', [
                'to' => $this->to,
                'subject' => $this->subject,
            ]);
        } catch (PHPMailerException $e) {
            $errorInfo = isset($mail) ? $mail->ErrorInfo : $e->getMessage();
            Log::error('PHPMailer failed to send login/logout email: ' . $errorInfo, [
                'to' => $this->to,
                'subject' => $this->subject,
                'exception' => get_class($e),
                'error' => $errorInfo,
                'trace' => $e->getTraceAsString(),
            ]);
            throw new \Exception('Failed to send email: ' . $errorInfo);
        } catch (\Exception $e) {
            Log::error('Failed to send login/logout email: ' . $e->getMessage(), [
                'to' => $this->to,
                'subject' => $this->subject,
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }
}

