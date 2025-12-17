<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'scheduled_job_id',
        'job_name',
        'job_class',
        'status',
        'message',
        'output',
        'error',
        'metadata',
        'started_at',
        'completed_at',
        'execution_time_ms',
    ];

    protected $casts = [
        'metadata' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    /**
     * Get the scheduled job that owns this log.
     */
    public function scheduledJob(): BelongsTo
    {
        return $this->belongsTo(ScheduledJob::class);
    }
}
