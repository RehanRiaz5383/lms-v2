<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuizMark extends Model
{
    use HasFactory;

    protected $fillable = [
        'quiz_id',
        'student_id',
        'obtained_marks',
        'total_marks',
        'remarks',
        'created_by',
    ];

    protected $casts = [
        'obtained_marks' => 'decimal:2',
        'total_marks' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the quiz that owns the mark.
     */
    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }

    /**
     * Get the student who received the mark.
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * Get the user who created/assigned the mark.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
