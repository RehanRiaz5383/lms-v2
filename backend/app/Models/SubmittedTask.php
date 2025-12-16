<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SubmittedTask extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'student_id',
        'answer_file', // Use answer_file instead of file_path
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get submitted_at attribute (handle missing column gracefully).
     */
    public function getSubmittedAtAttribute($value)
    {
        return $value ?? null;
    }

    /**
     * Get graded_at attribute (handle missing column gracefully).
     */
    public function getGradedAtAttribute($value)
    {
        return $value ?? null;
    }

    /**
     * Get the task that this submission belongs to.
     */
    public function task()
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Get the user who submitted this task.
     * Uses student_id as the foreign key.
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * Alias for user() to maintain backward compatibility.
     */
    public function student()
    {
        return $this->user();
    }

    /**
     * Get the file URL.
     * Uses answer_file first, then falls back to file_path for backward compatibility.
     */
    public function getFileUrlAttribute(): ?string
    {
        $filePath = $this->answer_file ?? $this->file_path ?? null;
        if ($filePath) {
            $useDirectStorage = env('USE_DIRECT_STORAGE', false);
            $appUrl = env('APP_URL', 'http://localhost:8000');
            if ($useDirectStorage) {
                return $appUrl . '/storage.php?file=' . urlencode($filePath);
            }
            return $appUrl . '/load-storage/' . ltrim($filePath, '/');
        }
        return null;
    }
}

