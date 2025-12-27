<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

class PushNotificationService
{
    private $webPush;

    public function __construct()
    {
        $publicKey = env('VAPID_PUBLIC_KEY');
        $privateKey = env('VAPID_PRIVATE_KEY');
        $subject = env('APP_URL', 'https://lms-v2.techinnsolutions.net');

        if (!$publicKey || !$privateKey) {
            Log::warning('VAPID keys not configured. Push notifications will not work.');
            return;
        }

        $this->webPush = new WebPush([
            'VAPID' => [
                'subject' => $subject,
                'publicKey' => $publicKey,
                'privateKey' => $privateKey,
            ],
        ]);
    }

    /**
     * Send push notification to a user
     *
     * @param int $userId
     * @param string $title
     * @param string $message
     * @param array|null $data
     * @param string|null $url
     * @return bool
     */
    public function sendToUser(int $userId, string $title, string $message, ?array $data = null, ?string $url = null): bool
    {
        if (!$this->webPush) {
            return false;
        }

        try {
            // Get all active subscriptions for the user
            // Check if 'enabled' column exists, if not, get all subscriptions
            $hasEnabledColumn = DB::getSchemaBuilder()->hasColumn('push_notification_subscriptions', 'enabled');
            $query = DB::table('push_notification_subscriptions')
                ->where('user_id', $userId);
            
            if ($hasEnabledColumn) {
                $query->where('enabled', true);
            }
            
            $subscriptions = $query->get();

            if ($subscriptions->isEmpty()) {
                Log::info("No push notification subscriptions found for user {$userId}", [
                    'user_id' => $userId,
                    'has_enabled_column' => $hasEnabledColumn,
                ]);
                return false;
            }

            Log::info("Found subscriptions for user", [
                'user_id' => $userId,
                'count' => $subscriptions->count(),
            ]);

            $notificationData = [
                'title' => $title,
                'body' => $message,
                'icon' => '/pwa-192x192.png',
                'badge' => '/pwa-192x192.png',
                'tag' => 'lms-notification',
                'data' => array_merge($data ?? [], ['url' => $url ?? '/dashboard']),
            ];

            $sentCount = 0;
            $failedCount = 0;

            foreach ($subscriptions as $subscription) {
                try {
                    // Handle different column name variations
                    $p256dhKey = $subscription->p256dh_key ?? $subscription->public_key ?? null;
                    $authKey = $subscription->auth_key ?? $subscription->auth_token ?? null;
                    
                    if (!$p256dhKey || !$authKey) {
                        Log::warning('Invalid subscription keys', [
                            'subscription_id' => $subscription->id ?? 'unknown',
                            'has_p256dh_key' => !empty($subscription->p256dh_key),
                            'has_public_key' => !empty($subscription->public_key ?? null),
                            'has_auth_key' => !empty($subscription->auth_key),
                            'has_auth_token' => !empty($subscription->auth_token ?? null),
                            'subscription_columns' => array_keys((array)$subscription),
                        ]);
                        $failedCount++;
                        continue;
                    }
                    
                    // The keys are stored as base64 strings from the frontend (using btoa)
                    // WebPush Subscription::create() expects base64url format
                    // Convert standard base64 to base64url
                    $p256dhKeyUrl = str_replace(['+', '/', '='], ['-', '_', ''], $p256dhKey);
                    $authKeyUrl = str_replace(['+', '/', '='], ['-', '_', ''], $authKey);
                    
                    try {
                        $pushSubscription = Subscription::create([
                            'endpoint' => $subscription->endpoint,
                            'keys' => [
                                'p256dh' => $p256dhKeyUrl,
                                'auth' => $authKeyUrl,
                            ],
                        ]);
                    } catch (\Exception $keyError) {
                        // If base64url fails, try with original base64
                        Log::warning('Failed to create subscription with base64url, trying standard base64', [
                            'error' => $keyError->getMessage(),
                            'subscription_id' => $subscription->id ?? 'unknown',
                        ]);
                        
                        $pushSubscription = Subscription::create([
                            'endpoint' => $subscription->endpoint,
                            'keys' => [
                                'p256dh' => $p256dhKey,
                                'auth' => $authKey,
                            ],
                        ]);
                    }

                    $result = $this->webPush->sendOneNotification(
                        $pushSubscription,
                        json_encode($notificationData)
                    );

                    // Check result and get detailed error information
                    if ($result->isSuccess()) {
                        $sentCount++;
                        Log::info('Push notification sent successfully', [
                            'user_id' => $userId,
                            'subscription_id' => $subscription->id,
                        ]);
                    } else {
                        $failedCount++;
                        $statusCode = $result->getStatusCode();
                        $reason = $result->getReason();
                        $expired = $result->isSubscriptionExpired();
                        
                        Log::error('Failed to send push notification', [
                            'user_id' => $userId,
                            'subscription_id' => $subscription->id,
                            'endpoint' => substr($subscription->endpoint, 0, 100) . '...', // Truncate for logging
                            'status_code' => $statusCode,
                            'reason' => $reason,
                            'expired' => $expired,
                            'response' => method_exists($result, 'getResponse') ? $result->getResponse() : null,
                        ]);

                        // If subscription is invalid (410 Gone), delete it or disable if column exists
                        if ($result->getStatusCode() === 410) {
                            $hasEnabledColumn = DB::getSchemaBuilder()->hasColumn('push_notification_subscriptions', 'enabled');
                            if ($hasEnabledColumn) {
                                DB::table('push_notification_subscriptions')
                                    ->where('id', $subscription->id)
                                    ->update(['enabled' => false]);
                            } else {
                                // If no enabled column, delete the invalid subscription
                                DB::table('push_notification_subscriptions')
                                    ->where('id', $subscription->id)
                                    ->delete();
                            }
                        }
                    }
                } catch (\Exception $e) {
                    $failedCount++;
                    Log::error('Error sending push notification to subscription', [
                        'user_id' => $userId,
                        'subscription_id' => $subscription->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // Flush any pending notifications
            $this->webPush->flush();

            Log::info("Push notifications sent", [
                'user_id' => $userId,
                'sent' => $sentCount,
                'failed' => $failedCount,
            ]);

            return $sentCount > 0;
        } catch (\Exception $e) {
            Log::error('Error in sendToUser', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Send push notification to multiple users
     *
     * @param array $userIds
     * @param string $title
     * @param string $message
     * @param array|null $data
     * @param string|null $url
     * @return int Number of successful sends
     */
    public function sendToUsers(array $userIds, string $title, string $message, ?array $data = null, ?string $url = null): int
    {
        $successCount = 0;
        foreach ($userIds as $userId) {
            if ($this->sendToUser($userId, $title, $message, $data, $url)) {
                $successCount++;
            }
        }
        return $successCount;
    }
}

