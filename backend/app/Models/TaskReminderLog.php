<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskReminderLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'student_id',
        'reminder_type',
        'reminder_sent_at',
        'notification_sent',
        'email_sent',
        'notes',
    ];

    protected $casts = [
        'reminder_sent_at' => 'datetime',
        'notification_sent' => 'boolean',
        'email_sent' => 'boolean',
    ];

    /**
     * Get the task that this reminder is for
     */
    public function task()
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Get the student that received this reminder
     */
    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * Check if reminder was already sent for this task/student/type
     */
    public static function wasSent(int $taskId, int $studentId, string $reminderType = '24h'): bool
    {
        return self::where('task_id', $taskId)
            ->where('student_id', $studentId)
            ->where('reminder_type', $reminderType)
            ->exists();
    }
}

