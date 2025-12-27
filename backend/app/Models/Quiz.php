<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quiz extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'batch_id',
        'subject_id',
        'quiz_date',
        'description',
        'total_marks',
        'created_by',
    ];

    /**
     * Get title attribute (handle missing column gracefully).
     */
    public function getTitleAttribute($value)
    {
        // If title column doesn't exist, return description or a default
        if ($value === null && Schema::hasColumn('quizzes', 'description')) {
            return $this->description ?? 'Untitled Quiz';
        }
        return $value ?? 'Untitled Quiz';
    }

    protected $casts = [
        'quiz_date' => 'date',
        'total_marks' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the batch that owns the quiz.
     */
    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }

    /**
     * Get the subject that owns the quiz (nullable for batch-level quizzes).
     */
    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * Get the user who created the quiz.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get all marks for this quiz.
     */
    public function marks(): HasMany
    {
        return $this->hasMany(QuizMark::class);
    }

    /**
     * Get mark for a specific student.
     */
    public function markForStudent(int $studentId): ?QuizMark
    {
        return $this->hasOne(QuizMark::class)->where('student_id', $studentId)->first();
    }
}
