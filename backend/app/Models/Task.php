<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'batch_id',
        'subject_id',
        'expiry_date',
    ];

    /**
     * Get description attribute (handle missing column gracefully).
     */
    public function getDescriptionAttribute($value)
    {
        // If description column doesn't exist, return null
        return $value ?? null;
    }

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'expiry_date' => 'date',
    ];

    /**
     * Get expiry_date attribute (handle missing column gracefully).
     */
    public function getExpiryDateAttribute($value)
    {
        return $value ?? null;
    }

    /**
     * Alias for expiry_date to maintain backward compatibility with due_date.
     */
    public function getDueDateAttribute($value)
    {
        return $this->expiry_date ?? null;
    }

    /**
     * Get file URL if file_path exists.
     */
    public function getFileUrlAttribute(): ?string
    {
        // Check if file_path column exists and has value
        if (property_exists($this, 'file_path') || $this->attributes['file_path'] ?? null) {
            $filePath = $this->attributes['file_path'] ?? null;
            if ($filePath) {
                $useDirectStorage = env('USE_DIRECT_STORAGE', false);
                $appUrl = env('APP_URL', 'http://localhost:8000');
                if ($useDirectStorage) {
                    return $appUrl . '/storage.php?file=' . urlencode($filePath);
                }
                return $appUrl . '/load-storage/' . ltrim($filePath, '/');
            }
        }
        return null;
    }

    /**
     * Get the batch that owns the task.
     */
    public function batch()
    {
        return $this->belongsTo(Batch::class);
    }

    /**
     * Get the subject that owns the task.
     */
    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * Get the user that owns the task (if assigned to specific user).
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the user who created the task.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get all submissions for this task.
     */
    public function submissions()
    {
        return $this->hasMany(SubmittedTask::class);
    }

    /**
     * Get submission for a specific user.
     */
    public function submissionForUser($userId)
    {
        return $this->hasOne(SubmittedTask::class)->where('student_id', $userId);
    }

    /**
     * Get files attached to this task (from files table if it exists).
     */
    public function files()
    {
        if (\Illuminate\Support\Facades\DB::getSchemaBuilder()->hasTable('files')) {
            return \Illuminate\Support\Facades\DB::table('files')
                ->where('task_id', $this->id)
                ->get();
        }
        return collect([]);
    }
}

