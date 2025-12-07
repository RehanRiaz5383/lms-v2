<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Batch extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'title',
        'active',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'active' => 'boolean',
        ];
    }

    /**
     * Get the subjects for the batch.
     */
    public function subjects(): BelongsToMany
    {
        return $this->belongsToMany(Subject::class, 'batches_subjects', 'batch_id', 'subject_id')
            ->withTimestamps();
    }

    /**
     * Get the users for the batch.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_batches', 'batch_id', 'user_id')
            ->withTimestamps();
    }
}

