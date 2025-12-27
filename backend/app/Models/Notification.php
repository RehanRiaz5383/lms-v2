<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'data',
        'read',
        'read_at',
    ];

    protected $casts = [
        'data' => 'array',
        'read' => 'boolean',
        'read_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user that owns the notification.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Mark notification as read.
     */
    public function markAsRead()
    {
        if (!$this->read) {
            $this->update([
                'read' => true,
                'read_at' => now(),
            ]);
        }
    }

    /**
     * Mark notification as unread.
     */
    public function markAsUnread()
    {
        $this->update([
            'read' => false,
            'read_at' => null,
        ]);
    }

    /**
     * Generic method to create a notification for a user.
     * This is the standard way to create notifications in the application.
     *
     * @param int $userId
     * @param string $type
     * @param string $title
     * @param string $message
     * @param array|null $data
     * @return bool
     */
    public static function createNotification(int $userId, string $type, string $title, string $message, ?array $data = null): bool
    {
        try {
            $hasUserIdColumn = \DB::getSchemaBuilder()->hasColumn('notifications', 'user_id');
            $hasNotifiableIdColumn = \DB::getSchemaBuilder()->hasColumn('notifications', 'notifiable_id');
            $hasTypeColumn = \DB::getSchemaBuilder()->hasColumn('notifications', 'type');
            $hasTitleColumn = \DB::getSchemaBuilder()->hasColumn('notifications', 'title');
            $hasMessageColumn = \DB::getSchemaBuilder()->hasColumn('notifications', 'message');
            $hasDataColumn = \DB::getSchemaBuilder()->hasColumn('notifications', 'data');
            $hasReadColumn = \DB::getSchemaBuilder()->hasColumn('notifications', 'read');

            // If neither user_id nor notifiable_id exists, we can't create notification
            if (!$hasUserIdColumn && !$hasNotifiableIdColumn) {
                \Log::warning('Cannot create notification: neither user_id nor notifiable_id column exists');
                return false;
            }

            $notificationData = [];

            if ($hasUserIdColumn && $hasNotifiableIdColumn) {
                $notificationData['user_id'] = $userId;
                $notificationData['notifiable_id'] = $userId;
                $notificationData['notifiable_type'] = 'App\\Models\\User';
            } else if ($hasUserIdColumn) {
                $notificationData['user_id'] = $userId;
            } else if ($hasNotifiableIdColumn) {
                $notificationData['notifiable_id'] = $userId;
                $notificationData['notifiable_type'] = 'App\\Models\\User';
            }

            if ($hasTypeColumn) {
                $notificationData['type'] = $type;
            }

            if ($hasTitleColumn) {
                $notificationData['title'] = $title;
            }

            if ($hasMessageColumn) {
                $notificationData['message'] = $message;
            }

            if ($hasDataColumn && $data !== null) {
                $notificationData['data'] = json_encode($data);
            }

            if ($hasReadColumn) {
                $notificationData['read'] = false;
            }

            $notificationData['created_at'] = now();
            $notificationData['updated_at'] = now();

            // Check if id column is UUID (char(36)) or auto-increment
            $idColumnInfo = \DB::select("SHOW COLUMNS FROM notifications WHERE Field = 'id'");
            $isUuidId = isset($idColumnInfo[0]) && strpos(strtolower($idColumnInfo[0]->Type), 'char') !== false;
            
            if ($isUuidId) {
                // Generate UUID for id
                $notificationData['id'] = \Illuminate\Support\Str::uuid()->toString();
            }

            $inserted = \DB::table('notifications')->insert($notificationData);
            
            \Log::info('Notification created successfully', [
                'inserted' => $inserted,
                'user_id' => $userId,
                'type' => $type,
                'notification_id' => $isUuidId ? ($notificationData['id'] ?? null) : (\DB::getPdo()->lastInsertId() ?? null),
            ]);

            // Send push notification if notification was created successfully
            if ($inserted) {
                try {
                    $pushService = app(\App\Services\PushNotificationService::class);
                    $notificationUrl = $data['url'] ?? '/dashboard/notifications/' . ($isUuidId ? ($notificationData['id'] ?? null) : (\DB::getPdo()->lastInsertId() ?? null));
                    $pushService->sendToUser($userId, $title, $message, $data, $notificationUrl);
                } catch (\Exception $e) {
                    // Log error but don't fail notification creation
                    \Log::warning('Failed to send push notification', [
                        'user_id' => $userId,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            return $inserted;
        } catch (\Exception $e) {
            \Log::error('Failed to create notification', [
                'error' => $e->getMessage(),
                'error_trace' => $e->getTraceAsString(),
                'user_id' => $userId,
                'type' => $type,
            ]);
            return false;
        }
    }
}
