<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    protected $fillable = [
        'user_one_id',
        'user_two_id',
        'last_message_at',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
    ];

    /**
     * Get the first user in the conversation
     */
    public function userOne(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_one_id');
    }

    /**
     * Get the second user in the conversation
     */
    public function userTwo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_two_id');
    }

    /**
     * Get all messages in this conversation
     */
    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class)->orderBy('created_at', 'asc');
    }

    /**
     * Get the other user in the conversation (for current user)
     */
    public function getOtherUser(int $currentUserId): ?User
    {
        if ($this->user_one_id === $currentUserId) {
            return $this->userTwo;
        }
        return $this->userOne;
    }

    /**
     * Check if this is a self-chat (notes)
     */
    public function isSelfChat(): bool
    {
        return $this->user_two_id === null || $this->user_one_id === $this->user_two_id;
    }
}
