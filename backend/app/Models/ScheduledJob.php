<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class ScheduledJob extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'job_class',
        'schedule_type',
        'schedule_config',
        'enabled',
        'last_run_at',
        'next_run_at',
        'metadata',
    ];

    protected $casts = [
        'schedule_config' => 'array',
        'metadata' => 'array',
        'enabled' => 'boolean',
        'last_run_at' => 'datetime',
        'next_run_at' => 'datetime',
    ];

    /**
     * Calculate next run time based on schedule type
     */
    public function calculateNextRun(): void
    {
        $now = now();
        
        switch ($this->schedule_type) {
            case 'hourly':
                $this->next_run_at = $now->addHour();
                break;
            case 'daily':
                $this->next_run_at = $now->addDay()->startOfDay();
                break;
            case 'twice_daily':
                // Run at 9 AM and 6 PM
                $nextRun = $now->copy();
                if ($now->hour < 9) {
                    $nextRun->setTime(9, 0, 0);
                } elseif ($now->hour < 18) {
                    $nextRun->setTime(18, 0, 0);
                } else {
                    $nextRun->addDay()->setTime(9, 0, 0);
                }
                $this->next_run_at = $nextRun;
                break;
            case 'weekly':
                $this->next_run_at = $now->addWeek()->startOfWeek();
                break;
            case 'monthly':
                $this->next_run_at = $now->addMonth()->startOfMonth();
                break;
            case 'custom':
                // Use schedule_config for custom schedules
                if ($this->schedule_config) {
                    $interval = $this->schedule_config['interval'] ?? 1;
                    $unit = $this->schedule_config['unit'] ?? 'day';
                    $this->next_run_at = $now->add($unit, $interval);
                } else {
                    $this->next_run_at = $now->addDay();
                }
                break;
            default:
                $this->next_run_at = $now->addDay();
        }
    }

    /**
     * Check if job is due to run
     */
    public function isDue(): bool
    {
        if (!$this->enabled) {
            return false;
        }

        if (!$this->next_run_at) {
            return true; // Never run, schedule it now
        }

        return now() >= $this->next_run_at;
    }
}

