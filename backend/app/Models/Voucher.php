<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Voucher extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'fee_amount',
        'description',
        'due_date',
        'promise_date',
        'status',
        'submitted_at',
        'approved_at',
        'approved_by',
        'submission_file',
        'remarks',
    ];

    protected $casts = [
        'fee_amount' => 'decimal:2',
        'due_date' => 'date',
        'promise_date' => 'date',
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    /**
     * Get the student that owns the voucher.
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * Get the admin who approved the voucher.
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
