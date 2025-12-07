<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class StudentBlocked
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $student;
    public $blockReason;

    /**
     * Create a new event instance.
     */
    public function __construct(User $student, $blockReason = null)
    {
        $this->student = $student;
        $this->blockReason = $blockReason;
    }
}

