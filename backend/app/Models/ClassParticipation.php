<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ClassParticipation extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title',
        'batch_id',
        'subject_id',
        'participation_date',
        'description',
        'total_marks',
        'created_by',
    ];

    protected $casts = [
        'participation_date' => 'date',
        'total_marks' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the batch that owns the class participation.
     */
    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }

    /**
     * Get the subject that owns the class participation (nullable for batch-level).
     */
    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * Get the user who created the class participation.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get all marks for this class participation.
     */
    public function marks(): HasMany
    {
        return $this->hasMany(ClassParticipationMark::class);
    }

    /**
     * Get mark for a specific student.
     */
    public function markForStudent(int $studentId): ?ClassParticipationMark
    {
        return $this->hasOne(ClassParticipationMark::class)->where('student_id', $studentId)->first();
    }
}
