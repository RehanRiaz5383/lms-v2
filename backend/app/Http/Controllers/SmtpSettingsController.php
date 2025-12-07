<?php

namespace App\Http\Controllers;

use App\Models\SmtpSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

class SmtpSettingsController extends ApiController
{
    /**
     * Get SMTP settings
     */
    public function index()
    {
        try {
            $settings = SmtpSetting::first();
            
            if (!$settings) {
                // Return default settings if none exist
                return $this->success([
                    'id' => null,
                    'mailer' => 'smtp',
                    'host' => '',
                    'port' => 587,
                    'username' => '',
                    'password' => '',
                    'encryption' => 'tls',
                    'from_address' => '',
                    'from_name' => '',
                    'is_active' => false,
                ], 'SMTP settings retrieved successfully');
            }

            return $this->success($settings, 'SMTP settings retrieved successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to retrieve SMTP settings: ' . $e->getMessage());
        }
    }

    /**
     * Update or create SMTP settings
     */
    public function update(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'mailer' => 'required|string|in:smtp',
                'host' => 'required|string|max:255',
                'port' => 'required|integer|min:1|max:65535',
                'username' => 'required|string|max:255',
                'password' => 'required|string',
                'encryption' => 'nullable|string|in:tls,ssl',
                'from_address' => 'required|email|max:255',
                'from_name' => 'required|string|max:255',
                'is_active' => 'boolean',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors());
            }

            $settings = SmtpSetting::first();

            $data = $request->only([
                'mailer',
                'host',
                'port',
                'username',
                'password',
                'encryption',
                'from_address',
                'from_name',
                'is_active',
            ]);

            if ($settings) {
                $settings->update($data);
            } else {
                $settings = SmtpSetting::create($data);
            }

            return $this->success($settings, 'SMTP settings saved successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to save SMTP settings: ' . $e->getMessage());
        }
    }

    /**
     * Test SMTP connection
     */
    public function test(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'host' => 'required|string|max:255',
                'port' => 'required|integer|min:1|max:65535',
                'username' => 'required|string|max:255',
                'password' => 'required|string',
                'encryption' => 'nullable|string|in:tls,ssl',
                'from_address' => 'required|email|max:255',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors());
            }

            // Configure mail settings temporarily
            config([
                'mail.mailers.smtp.host' => $request->host,
                'mail.mailers.smtp.port' => $request->port,
                'mail.mailers.smtp.username' => $request->username,
                'mail.mailers.smtp.password' => $request->password,
                'mail.mailers.smtp.encryption' => $request->encryption ?? 'tls',
                'mail.from.address' => $request->from_address,
            ]);

            // Try to send a test email
            try {
                Mail::raw('This is a test email from LMS SMTP Settings.', function ($message) use ($request) {
                    $message->to($request->from_address)
                            ->subject('SMTP Test Email');
                });

                return $this->success(null, 'Test email sent successfully');
            } catch (\Exception $e) {
                return $this->error('Failed to send test email: ' . $e->getMessage());
            }
        } catch (\Exception $e) {
            return $this->serverError('Failed to test SMTP connection: ' . $e->getMessage());
        }
    }
}

