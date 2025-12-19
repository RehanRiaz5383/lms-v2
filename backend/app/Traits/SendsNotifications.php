<?php

namespace App\Traits;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

trait SendsNotifications
{
    /**
     * Send a CRM notification to this user.
     * 
     * @param string $type Notification type (e.g., 'task_assigned', 'voucher_generated', 'grade_awarded')
     * @param string $title Notification title
     * @param string $message Notification message
     * @param array|null $data Additional data to store with the notification
     * @return bool|int Returns false on failure, notification ID on success
     */
    public function sendCrmNotification(string $type, string $title, string $message, ?array $data = null): bool|int
    {
        try {
            if (!DB::getSchemaBuilder()->hasTable('notifications')) {
                Log::warning('Notifications table does not exist');
                return false;
            }

            // Check which column structure exists
            $hasUserIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'user_id');
            $hasNotifiableIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'notifiable_id');
            $hasTypeColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'type');
            $hasTitleColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'title');
            $hasMessageColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'message');
            $hasDataColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'data');
            $hasReadColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'read');

            $notificationData = [];

            // Set user/notifiable columns
            // If both columns exist, set both (some servers require notifiable_id/type even when user_id exists)
            if ($hasUserIdColumn && $hasNotifiableIdColumn) {
                $notificationData['user_id'] = $this->id;
                $notificationData['notifiable_id'] = $this->id;
                $notificationData['notifiable_type'] = get_class($this);
            } else if ($hasUserIdColumn) {
                $notificationData['user_id'] = $this->id;
            } else if ($hasNotifiableIdColumn) {
                $notificationData['notifiable_id'] = $this->id;
                $notificationData['notifiable_type'] = get_class($this);
            }

            // Set type, title, message
            if ($hasTypeColumn) {
                $notificationData['type'] = $type;
            }

            if ($hasTitleColumn) {
                $notificationData['title'] = $title;
            }

            if ($hasMessageColumn) {
                $notificationData['message'] = $message;
            }

            // Set data if provided
            if ($hasDataColumn && $data !== null) {
                $notificationData['data'] = json_encode($data);
            }

            // Set read status
            if ($hasReadColumn) {
                $notificationData['read'] = false;
            }

            // Set timestamps
            $notificationData['created_at'] = now();
            $notificationData['updated_at'] = now();

            // Ensure we have required fields before inserting
            if (empty($notificationData)) {
                Log::warning('Notification data is empty, cannot insert', [
                    'user_id' => $this->id,
                    'type' => $type,
                ]);
                return false;
            }

            Log::info('Attempting to insert CRM notification', [
                'user_id' => $this->id,
                'type' => $type,
                'notification_data_keys' => array_keys($notificationData),
                'has_user_id' => $hasUserIdColumn,
                'has_notifiable_id' => $hasNotifiableIdColumn,
            ]);

            $inserted = DB::table('notifications')->insert($notificationData);
            
            if (!$inserted) {
                Log::error('Failed to insert notification - insert returned false', [
                    'user_id' => $this->id,
                    'type' => $type,
                ]);
                return false;
            }

            // Get the inserted ID if available
            $notificationId = null;
            try {
                $notificationId = DB::getPdo()->lastInsertId();
            } catch (\Exception $idException) {
                // Ignore if we can't get the ID
            }
            
            Log::info('CRM notification created successfully', [
                'user_id' => $this->id,
                'type' => $type,
                'notification_id' => $notificationId,
            ]);

            return $notificationId ?: true;
        } catch (\Exception $e) {
            // Log error with full details for debugging
            Log::error('Failed to create CRM notification', [
                'error_message' => $e->getMessage(),
                'error_code' => $e->getCode(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'user_id' => $this->id,
                'type' => $type,
                'trace' => $e->getTraceAsString(),
            ]);
            return false;
        }
    }
}

