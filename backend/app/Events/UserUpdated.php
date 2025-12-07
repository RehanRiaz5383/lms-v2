<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserUpdated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $user;
    public $changes;

    /**
     * Create a new event instance.
     */
    public function __construct(User $user, array $changes = [])
    {
        $this->user = $user;
        $this->changes = $changes;
    }
}

