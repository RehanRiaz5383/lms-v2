<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends ApiController
{
    /**
     * Get notifications for the authenticated user.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            $perPage = $request->input('per_page', 10);
            $page = $request->input('page', 1);

            // Check which column structure exists
            $hasUserIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'user_id');
            $hasNotifiableIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'notifiable_id');

            $query = DB::table('notifications');

            if ($hasUserIdColumn) {
                $query->where('user_id', $user->id);
            } else if ($hasNotifiableIdColumn) {
                $query->where('notifiable_id', $user->id)
                      ->where('notifiable_type', 'App\\Models\\User');
            } else {
                return $this->error(null, 'Notifications table structure not recognized', 500);
            }

            $query->orderBy('created_at', 'desc');

            $total = $query->count();
            $notifications = $query->skip(($page - 1) * $perPage)
                ->take($perPage)
                ->get();

            return $this->success([
                'notifications' => $notifications,
                'pagination' => [
                    'current_page' => (int) $page,
                    'per_page' => (int) $perPage,
                    'total' => $total,
                    'last_page' => ceil($total / $perPage),
                    'has_more' => ($page * $perPage) < $total,
                ],
            ], 'Notifications retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to retrieve notifications', 500);
        }
    }

    /**
     * Get a specific notification by ID.
     *
     * @param string $id
     * @return JsonResponse
     */
    public function show(string $id): JsonResponse
    {
        try {
            $user = auth()->user();
            
            // Check which column structure exists
            $hasUserIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'user_id');
            $hasNotifiableIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'notifiable_id');

            $query = DB::table('notifications')->where('id', $id);

            if ($hasUserIdColumn) {
                $query->where('user_id', $user->id);
            } else if ($hasNotifiableIdColumn) {
                $query->where('notifiable_id', $user->id)
                      ->where('notifiable_type', 'App\\Models\\User');
            } else {
                return $this->notFound('Notification not found');
            }

            $notification = $query->first();

            if (!$notification) {
                return $this->notFound('Notification not found');
            }

            return $this->success($notification, 'Notification retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to retrieve notification', 500);
        }
    }

    /**
     * Get unread notifications count.
     *
     * @return JsonResponse
     */
    public function unreadCount(): JsonResponse
    {
        try {
            $user = auth()->user();
            
            // Check which column structure exists
            $hasUserIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'user_id');
            $hasNotifiableIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'notifiable_id');
            $hasReadColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'read');
            $hasReadAtColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'read_at');

            $query = DB::table('notifications');

            if ($hasUserIdColumn) {
                $query->where('user_id', $user->id);
            } else if ($hasNotifiableIdColumn) {
                $query->where('notifiable_id', $user->id)
                      ->where('notifiable_type', 'App\\Models\\User');
            } else {
                return $this->success(['count' => 0], 'Unread count retrieved successfully');
            }

            // Check read status
            if ($hasReadColumn) {
                $query->where('read', false);
            } else if ($hasReadAtColumn) {
                $query->whereNull('read_at');
            }

            $count = $query->count();

            return $this->success(['count' => $count], 'Unread count retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to retrieve unread count', 500);
        }
    }

    /**
     * Mark notification as read.
     *
     * @param string $id (UUID or integer)
     * @return JsonResponse
     */
    public function markAsRead(string $id): JsonResponse
    {
        try {
            $user = auth()->user();
            
            // Check which column structure exists
            $hasUserIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'user_id');
            $hasNotifiableIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'notifiable_id');
            $hasReadColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'read');
            $hasReadAtColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'read_at');

            $query = DB::table('notifications')->where('id', $id);

            if ($hasUserIdColumn) {
                $query->where('user_id', $user->id);
            } else if ($hasNotifiableIdColumn) {
                $query->where('notifiable_id', $user->id)
                      ->where('notifiable_type', 'App\\Models\\User');
            } else {
                return $this->notFound('Notification not found');
            }

            $notification = $query->first();

            if (!$notification) {
                return $this->notFound('Notification not found');
            }

            // Update read status
            $updateData = [];
            if ($hasReadColumn) {
                $updateData['read'] = true;
            }
            if ($hasReadAtColumn) {
                $updateData['read_at'] = now();
            }
            $updateData['updated_at'] = now();

            if (!empty($updateData)) {
                DB::table('notifications')
                    ->where('id', $id)
                    ->update($updateData);
            }

            // Get updated notification
            $updatedNotification = DB::table('notifications')->where('id', $id)->first();

            return $this->success($updatedNotification, 'Notification marked as read');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to mark notification as read', 500);
        }
    }

    /**
     * Mark all notifications as read.
     *
     * @return JsonResponse
     */
    public function markAllAsRead(): JsonResponse
    {
        try {
            $user = auth()->user();
            
            // Check which column structure exists
            $hasUserIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'user_id');
            $hasNotifiableIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'notifiable_id');
            $hasReadColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'read');
            $hasReadAtColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'read_at');

            $query = DB::table('notifications');

            if ($hasUserIdColumn) {
                $query->where('user_id', $user->id);
            } else if ($hasNotifiableIdColumn) {
                $query->where('notifiable_id', $user->id)
                      ->where('notifiable_type', 'App\\Models\\User');
            } else {
                return $this->success(['updated' => 0], 'All notifications marked as read');
            }

            // Check read status
            if ($hasReadColumn) {
                $query->where('read', false);
            } else if ($hasReadAtColumn) {
                $query->whereNull('read_at');
            }

            // Update read status
            $updateData = [];
            if ($hasReadColumn) {
                $updateData['read'] = true;
            }
            if ($hasReadAtColumn) {
                $updateData['read_at'] = now();
            }
            $updateData['updated_at'] = now();

            $updated = 0;
            if (!empty($updateData)) {
                $updated = $query->update($updateData);
            }

            return $this->success(['updated' => $updated], 'All notifications marked as read');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to mark all notifications as read', 500);
        }
    }
}
