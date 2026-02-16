<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\ChatMessage;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class ChatController extends ApiController
{
    /**
     * Get or create a conversation with a user (or self for notes)
     */
    public function getOrCreateConversation(Request $request): JsonResponse
    {
        try {
            $currentUser = $request->user();
            $otherUserId = $request->input('user_id'); // null for self-chat

            // For self-chat (notes), use current user as both users
            if ($otherUserId === null || $otherUserId == $currentUser->id) {
                $userOneId = $currentUser->id;
                $userTwoId = null; // null indicates self-chat
            } else {
                // Ensure user_one_id is always smaller for consistency
                $userOneId = min($currentUser->id, $otherUserId);
                $userTwoId = max($currentUser->id, $otherUserId);
            }

            // Find or create conversation
            // For self-chat, we need special handling since user_two_id is null
            if ($userTwoId === null) {
                $conversation = Conversation::where('user_one_id', $userOneId)
                    ->whereNull('user_two_id')
                    ->first();
                
                if (!$conversation) {
                    $conversation = Conversation::create([
                        'user_one_id' => $userOneId,
                        'user_two_id' => null,
                        'last_message_at' => now(),
                    ]);
                }
            } else {
                $conversation = Conversation::firstOrCreate(
                    [
                        'user_one_id' => $userOneId,
                        'user_two_id' => $userTwoId,
                    ],
                    [
                        'last_message_at' => now(),
                    ]
                );
            }

            // Load relationships
            $conversation->load(['userOne', 'userTwo']);

            // Get the other user info
            $otherUser = null;
            if ($conversation->isSelfChat()) {
                $otherUser = [
                    'id' => $currentUser->id,
                    'name' => $currentUser->name,
                    'email' => $currentUser->email,
                    'picture' => $currentUser->picture,
                    'picture_url' => $currentUser->picture_url,
                ];
            } else {
                $otherUserModel = $conversation->getOtherUser($currentUser->id);
                if ($otherUserModel) {
                    $otherUser = [
                        'id' => $otherUserModel->id,
                        'name' => $otherUserModel->name,
                        'email' => $otherUserModel->email,
                        'picture' => $otherUserModel->picture,
                        'picture_url' => $otherUserModel->picture_url,
                    ];
                }
            }

            return $this->success([
                'conversation' => [
                    'id' => $conversation->id,
                    'user_one_id' => $conversation->user_one_id,
                    'user_two_id' => $conversation->user_two_id,
                    'is_self_chat' => $conversation->isSelfChat(),
                    'last_message_at' => $conversation->last_message_at,
                    'other_user' => $otherUser,
                ],
            ], 'Conversation retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to get conversation', 500);
        }
    }

    /**
     * Get all conversations for the current user
     */
    public function getConversations(Request $request): JsonResponse
    {
        try {
            $currentUser = $request->user();

            // Get all conversations where user is involved
            $conversations = Conversation::where(function ($query) use ($currentUser) {
                $query->where('user_one_id', $currentUser->id)
                    ->orWhere('user_two_id', $currentUser->id);
            })
                ->with(['userOne', 'userTwo'])
                ->withCount(['messages as unread_count' => function ($query) use ($currentUser) {
                    $query->where('sender_id', '!=', $currentUser->id)
                        ->where('is_read', false);
                }])
                ->orderBy('last_message_at', 'desc')
                ->get();

            // Format conversations with other user info
            $formattedConversations = $conversations->map(function ($conversation) use ($currentUser) {
                $otherUser = $conversation->getOtherUser($currentUser->id);
                
                return [
                    'id' => $conversation->id,
                    'is_self_chat' => $conversation->isSelfChat(),
                    'other_user' => $otherUser ? [
                        'id' => $otherUser->id,
                        'name' => $otherUser->name,
                        'email' => $otherUser->email,
                        'picture' => $otherUser->picture,
                        'picture_url' => $otherUser->picture_url,
                    ] : [
                        'id' => $currentUser->id,
                        'name' => $currentUser->name . ' (Notes)',
                        'email' => $currentUser->email,
                        'picture' => $currentUser->picture,
                        'picture_url' => $currentUser->picture_url,
                    ],
                    'last_message_at' => $conversation->last_message_at,
                    'unread_count' => $conversation->unread_count,
                ];
            });

            return $this->success($formattedConversations, 'Conversations retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to get conversations', 500);
        }
    }

    /**
     * Get total unread message count for the current user
     */
    public function getUnreadCount(Request $request): JsonResponse
    {
        try {
            $currentUser = $request->user();

            // Get total unread count across all conversations
            $totalUnread = ChatMessage::whereHas('conversation', function ($query) use ($currentUser) {
                $query->where(function ($q) use ($currentUser) {
                    $q->where('user_one_id', $currentUser->id)
                        ->orWhere('user_two_id', $currentUser->id);
                });
            })
                ->where('sender_id', '!=', $currentUser->id)
                ->where('is_read', false)
                ->count();

            return $this->success(['unread_count' => $totalUnread], 'Unread count retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to get unread count', 500);
        }
    }

    /**
     * Get messages for a conversation
     */
    public function getMessages(Request $request, int $conversationId): JsonResponse
    {
        try {
            $currentUser = $request->user();

            // Verify user has access to this conversation
            $conversation = Conversation::where(function ($query) use ($currentUser, $conversationId) {
                $query->where('id', $conversationId)
                    ->where(function ($q) use ($currentUser) {
                        $q->where('user_one_id', $currentUser->id)
                            ->orWhere('user_two_id', $currentUser->id);
                    });
            })->first();

            if (!$conversation) {
                return $this->notFound('Conversation not found');
            }

            // Get messages
            $messages = ChatMessage::where('conversation_id', $conversationId)
                ->with('sender:id,name,email,picture')
                ->orderBy('created_at', 'asc')
                ->get();

            // Format messages
            $formattedMessages = $messages->map(function ($message) use ($currentUser) {
                return [
                    'id' => $message->id,
                    'conversation_id' => $message->conversation_id,
                    'sender_id' => $message->sender_id,
                    'sender' => [
                        'id' => $message->sender->id,
                        'name' => $message->sender->name,
                        'email' => $message->sender->email,
                        'picture' => $message->sender->picture,
                        'picture_url' => $message->sender->picture_url,
                    ],
                    'message' => $message->message,
                    'is_read' => $message->is_read,
                    'read_at' => $message->read_at,
                    'is_own' => $message->sender_id === $currentUser->id,
                    'created_at' => $message->created_at,
                    'updated_at' => $message->updated_at,
                ];
            });

            // Mark messages as read (only messages from other user)
            ChatMessage::where('conversation_id', $conversationId)
                ->where('sender_id', '!=', $currentUser->id)
                ->where('is_read', false)
                ->update([
                    'is_read' => true,
                    'read_at' => now(),
                ]);

            return $this->success($formattedMessages, 'Messages retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to get messages', 500);
        }
    }

    /**
     * Send a message (this will be called from socket server after receiving message)
     */
    public function storeMessage(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'conversation_id' => 'required|exists:conversations,id',
                'message' => 'required|string|max:5000',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors()->toArray());
            }

            $currentUser = $request->user();

            // Verify user has access to this conversation
            $conversation = Conversation::where(function ($query) use ($currentUser, $request) {
                $query->where('id', $request->input('conversation_id'))
                    ->where(function ($q) use ($currentUser) {
                        $q->where('user_one_id', $currentUser->id)
                            ->orWhere('user_two_id', $currentUser->id);
                    });
            })->first();

            if (!$conversation) {
                return $this->notFound('Conversation not found');
            }

            // Create message
            $message = ChatMessage::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $currentUser->id,
                'message' => $request->input('message'),
                'is_read' => false,
            ]);

            // Update conversation's last_message_at
            $conversation->update([
                'last_message_at' => now(),
            ]);

            // Load sender relationship
            $message->load('sender:id,name,email,picture');

            // Load conversation to get participants
            $conversation->load(['userOne', 'userTwo']);

            return $this->success([
                'message' => [
                    'id' => $message->id,
                    'conversation_id' => $message->conversation_id,
                    'sender_id' => $message->sender_id,
                    'sender' => [
                        'id' => $message->sender->id,
                        'name' => $message->sender->name,
                        'email' => $message->sender->email,
                        'picture' => $message->sender->picture,
                        'picture_url' => $message->sender->picture_url,
                    ],
                    'message' => $message->message,
                    'is_read' => $message->is_read,
                    'is_own' => true,
                    'created_at' => $message->created_at,
                    'updated_at' => $message->updated_at,
                ],
                'conversation' => [
                    'id' => $conversation->id,
                    'user_one_id' => $conversation->user_one_id,
                    'user_two_id' => $conversation->user_two_id,
                ],
            ], 'Message sent successfully', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to send message', 500);
        }
    }

    /**
     * Create notifications for offline message recipients
     */
    public function notifyOfflineRecipients(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'conversation_id' => 'required|exists:conversations,id',
                'message_id' => 'required|exists:chat_messages,id',
                'recipient_ids' => 'required|array',
                'recipient_ids.*' => 'required|integer|exists:users,id',
                'sender_id' => 'required|exists:users,id',
                'sender_name' => 'required|string',
                'message' => 'required|string',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors()->toArray());
            }

            $recipientIds = $request->input('recipient_ids');
            $senderId = $request->input('sender_id');
            $senderName = $request->input('sender_name');
            $message = $request->input('message');
            $conversationId = $request->input('conversation_id');

            // Truncate message for notification (max 100 chars)
            $messagePreview = strlen($message) > 100
                ? substr($message, 0, 100) . '...'
                : $message;

            $createdCount = 0;
            foreach ($recipientIds as $recipientId) {
                try {
                    // Format notification message: "Mr. A sent you a message, please check your inbox"
                    $notificationMessage = $senderName . ' sent you a message, please check your inbox';
                    
                    \App\Models\Notification::createNotification(
                        $recipientId,
                        'chat_message',
                        'New Message',
                        $notificationMessage,
                        [
                            'conversation_id' => $conversationId,
                            'message_id' => $request->input('message_id'),
                            'sender_id' => $senderId,
                            'sender_name' => $senderName,
                            'type' => 'chat',
                            'url' => "/dashboard/inbox/{$conversationId}",
                            'redirect_to' => 'inbox',
                        ]
                    );
                    $createdCount++;
                } catch (\Exception $e) {
                    \Log::error('Failed to create notification for recipient', [
                        'recipient_id' => $recipientId,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            return $this->success(
                ['created_count' => $createdCount],
                'Notifications created for offline recipients'
            );
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to create notifications', 500);
        }
    }

    /**
     * Mark messages as read
     */
    public function markAsRead(Request $request, int $conversationId): JsonResponse
    {
        try {
            $currentUser = $request->user();

            // Verify user has access to this conversation
            $conversation = Conversation::where(function ($query) use ($currentUser, $conversationId) {
                $query->where('id', $conversationId)
                    ->where(function ($q) use ($currentUser) {
                        $q->where('user_one_id', $currentUser->id)
                            ->orWhere('user_two_id', $currentUser->id);
                    });
            })->first();

            if (!$conversation) {
                return $this->notFound('Conversation not found');
            }

            // Mark all unread messages as read
            $updated = ChatMessage::where('conversation_id', $conversationId)
                ->where('sender_id', '!=', $currentUser->id)
                ->where('is_read', false)
                ->update([
                    'is_read' => true,
                    'read_at' => now(),
                ]);

            return $this->success(['updated_count' => $updated], 'Messages marked as read');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to mark messages as read', 500);
        }
    }
}
