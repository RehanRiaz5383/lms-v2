<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use App\Services\PushNotificationService;

class PushNotificationController extends ApiController
{
    /**
     * Get VAPID public key
     */
    public function getVapidPublicKey(): JsonResponse
    {
        $publicKey = env('VAPID_PUBLIC_KEY');
        
        if (!$publicKey) {
            return $this->error(null, 'VAPID public key not configured', 500);
        }

        return $this->success(['public_key' => $publicKey], 'VAPID public key retrieved');
    }

    /**
     * Subscribe to push notifications
     */
    public function subscribe(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'endpoint' => 'required|string|max:500',
            'keys' => 'required|array',
            'keys.p256dh' => 'required|string',
            'keys.auth' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors()->toArray());
        }

        try {
            $user = auth()->user();
            
            // Check if subscription already exists
            $existing = DB::table('push_notification_subscriptions')
                ->where('endpoint', $request->input('endpoint'))
                ->first();

            $subscriptionData = [
                'user_id' => $user->id,
                'endpoint' => $request->input('endpoint'),
                'p256dh_key' => $request->input('keys.p256dh'),
                'auth_key' => $request->input('keys.auth'),
                'enabled' => true,
                'updated_at' => now(),
            ];

            if ($existing) {
                // Update existing subscription
                DB::table('push_notification_subscriptions')
                    ->where('id', $existing->id)
                    ->update($subscriptionData);
            } else {
                // Create new subscription
                $subscriptionData['created_at'] = now();
                DB::table('push_notification_subscriptions')->insert($subscriptionData);
            }

            return $this->success(null, 'Push notification subscription saved successfully');
        } catch (\Exception $e) {
            Log::error('Error subscribing to push notifications: ' . $e->getMessage());
            return $this->error($e->getMessage(), 'Failed to subscribe to push notifications', 500);
        }
    }

    /**
     * Unsubscribe from push notifications
     */
    public function unsubscribe(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'endpoint' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors()->toArray());
        }

        try {
            $user = auth()->user();
            
            DB::table('push_notification_subscriptions')
                ->where('user_id', $user->id)
                ->where('endpoint', $request->input('endpoint'))
                ->delete();

            return $this->success(null, 'Push notification subscription removed successfully');
        } catch (\Exception $e) {
            Log::error('Error unsubscribing from push notifications: ' . $e->getMessage());
            return $this->error($e->getMessage(), 'Failed to unsubscribe from push notifications', 500);
        }
    }

    /**
     * Send a test push notification to the current user (Admin only)
     */
    public function sendTest(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return $this->unauthorized('Unauthorized.');
            }

            // Check VAPID keys first
            $vapidPublicKey = env('VAPID_PUBLIC_KEY');
            $vapidPrivateKey = env('VAPID_PRIVATE_KEY');
            
            if (!$vapidPublicKey || !$vapidPrivateKey) {
                return $this->error(
                    null,
                    'VAPID keys are not configured. Please configure VAPID keys in your .env file.',
                    500
                );
            }

            // Check if user has push notification subscription with more details
            $hasEnabledColumn = DB::getSchemaBuilder()->hasColumn('push_notification_subscriptions', 'enabled');
            $query = DB::table('push_notification_subscriptions')
                ->where('user_id', $user->id);
            
            if ($hasEnabledColumn) {
                $query->where('enabled', true);
            }
            
            $subscriptions = $query->get();

            if ($subscriptions->isEmpty()) {
                $allSubscriptions = DB::table('push_notification_subscriptions')
                    ->where('user_id', $user->id)
                    ->get();
                
                if ($allSubscriptions->isEmpty()) {
                    return $this->error(
                        null,
                        'You need to enable push notifications first. Please enable push notifications in your notification settings.',
                        400
                    );
                } else {
                    return $this->error(
                        null,
                        'Your push notification subscription is disabled. Please re-enable push notifications in your notification settings.',
                        400
                    );
                }
            }

            // Log subscription details for debugging
            Log::info('Sending test push notification', [
                'user_id' => $user->id,
                'subscription_count' => $subscriptions->count(),
                'has_p256dh_key' => $subscriptions->first()->p256dh_key ?? 'missing',
                'has_auth_key' => $subscriptions->first()->auth_key ?? 'missing',
            ]);

            // Send test push notification
            $pushService = app(PushNotificationService::class);
            $success = $pushService->sendToUser(
                $user->id,
                'Test Push Notification',
                'This is a test push notification. If you can see this, push notifications are working correctly!',
                ['type' => 'test'],
                '/dashboard/settings/notifications'
            );

            if ($success) {
                return $this->success(null, 'Test push notification sent successfully. Check your device for the notification.');
            } else {
                // Get more detailed error information from logs
                $subscriptionDetails = $subscriptions->first();
                $hasKeys = !empty($subscriptionDetails->p256dh_key) && !empty($subscriptionDetails->auth_key);
                
                // Check recent logs for specific error
                $recentLogs = Log::channel('single')->getLogger()->getHandlers()[0]->getUrl() ?? null;
                
                $errorMessage = 'Failed to send test push notification. ';
                
                if (!$hasKeys) {
                    $errorMessage .= 'Subscription keys are missing. Please re-enable push notifications.';
                } else {
                    $errorMessage .= 'The notification failed to deliver. ';
                    $errorMessage .= 'Possible causes: ';
                    $errorMessage .= '1) Invalid or expired subscription - try disabling and re-enabling push notifications, ';
                    $errorMessage .= '2) VAPID keys mismatch, ';
                    $errorMessage .= '3) Network/SSL issues. ';
                    $errorMessage .= 'Please check server logs for detailed error information.';
                }
                
                Log::error('Test push notification failed - detailed info', [
                    'user_id' => $user->id,
                    'has_keys' => $hasKeys,
                    'subscription_id' => $subscriptionDetails->id ?? null,
                    'endpoint' => substr($subscriptionDetails->endpoint ?? '', 0, 100),
                    'p256dh_key_length' => strlen($subscriptionDetails->p256dh_key ?? ''),
                    'auth_key_length' => strlen($subscriptionDetails->auth_key ?? ''),
                ]);
                
                return $this->error(null, $errorMessage, 500);
            }
        } catch (\Exception $e) {
            Log::error('Error sending test push notification', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $user->id ?? null,
            ]);
            return $this->error($e->getMessage(), 'Failed to send test push notification', 500);
        }
    }

    /**
     * Get subscription details for debugging (Admin only)
     */
    public function getSubscriptionDetails(): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return $this->unauthorized('Unauthorized.');
            }

            $subscriptions = DB::table('push_notification_subscriptions')
                ->where('user_id', $user->id)
                ->get()
                ->map(function ($sub) {
                    return [
                        'id' => $sub->id,
                        'endpoint' => substr($sub->endpoint, 0, 100) . '...',
                        'has_p256dh_key' => !empty($sub->p256dh_key),
                        'has_auth_key' => !empty($sub->auth_key),
                        'p256dh_key_length' => strlen($sub->p256dh_key ?? ''),
                        'auth_key_length' => strlen($sub->auth_key ?? ''),
                        'enabled' => $sub->enabled ?? true,
                        'created_at' => $sub->created_at,
                        'updated_at' => $sub->updated_at,
                    ];
                });

            return $this->success([
                'user_id' => $user->id,
                'subscriptions' => $subscriptions,
                'vapid_configured' => !empty(env('VAPID_PUBLIC_KEY')) && !empty(env('VAPID_PRIVATE_KEY')),
            ], 'Subscription details retrieved');
        } catch (\Exception $e) {
            Log::error('Error getting subscription details: ' . $e->getMessage());
            return $this->error($e->getMessage(), 'Failed to get subscription details', 500);
        }
    }
}
