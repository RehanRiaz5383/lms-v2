<?php

namespace App\Http\Controllers;

use App\Models\CloudflareTurnstileSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CloudflareTurnstileController extends ApiController
{
    /**
     * Get Cloudflare Turnstile settings (public endpoint - for signup page).
     *
     * @return JsonResponse
     */
    public function getSettings(): JsonResponse
    {
        try {
            $settings = CloudflareTurnstileSettings::getSettings();
            
            // Don't expose secret key in public response
            return $this->success([
                'site_key' => $settings->site_key,
                'is_enabled' => $settings->is_enabled,
            ], 'Settings retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to retrieve settings', 500);
        }
    }

    /**
     * Get Cloudflare Turnstile settings (admin endpoint - includes secret key).
     *
     * @return JsonResponse
     */
    public function getAdminSettings(): JsonResponse
    {
        try {
            $settings = CloudflareTurnstileSettings::getSettings();
            
            // Include secret key for admin
            return $this->success([
                'site_key' => $settings->site_key,
                'secret_key' => $settings->secret_key,
                'is_enabled' => $settings->is_enabled,
            ], 'Settings retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to retrieve settings', 500);
        }
    }

    /**
     * Update Cloudflare Turnstile settings.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function updateSettings(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'site_key' => 'nullable|string|max:255',
                'secret_key' => 'nullable|string|max:255',
                'is_enabled' => 'required|boolean',
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors(), 'Validation failed');
        }

        try {
            $settings = CloudflareTurnstileSettings::getSettings();
            $settings->update([
                'site_key' => $request->input('site_key'),
                'secret_key' => $request->input('secret_key'),
                'is_enabled' => $request->input('is_enabled', false),
            ]);

            return $this->success([
                'site_key' => $settings->site_key,
                'secret_key' => $settings->secret_key, // Include secret key for admin
                'is_enabled' => $settings->is_enabled,
            ], 'Settings updated successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to update settings', 500);
        }
    }
}
