<?php

namespace App\Http\Controllers;

use App\Models\NotificationSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class NotificationSettingsController extends ApiController
{
    /**
     * Get notification settings
     */
    public function index()
    {
        try {
            $settings = NotificationSetting::first();
            
            if (!$settings) {
                // Return default settings if none exist
                return $this->success([
                    'id' => null,
                    'new_student_registration' => false,
                    'block_student_registration' => false,
                    'user_update' => false,
                    'user_login_logout' => false,
                    'notify_on_new_signup' => false,
                    'notify_on_payment_proof_submission' => false,
                ], 'Notification settings retrieved successfully');
            }

            return $this->success($settings, 'Notification settings retrieved successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to retrieve notification settings: ' . $e->getMessage());
        }
    }

    /**
     * Update or create notification settings
     */
    public function update(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'new_student_registration' => 'boolean',
                'block_student_registration' => 'boolean',
                'user_update' => 'boolean',
                'user_login_logout' => 'boolean',
                'notify_on_new_signup' => 'boolean',
                'notify_on_payment_proof_submission' => 'boolean',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors());
            }

            $settings = NotificationSetting::first();

            $data = $request->only([
                'new_student_registration',
                'block_student_registration',
                'user_update',
                'user_login_logout',
                'notify_on_new_signup',
                'notify_on_payment_proof_submission',
            ]);

            if ($settings) {
                $settings->update($data);
            } else {
                $settings = NotificationSetting::create($data);
            }

            return $this->success($settings, 'Notification settings saved successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to save notification settings: ' . $e->getMessage());
        }
    }
}

