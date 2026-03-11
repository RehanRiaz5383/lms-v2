<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VideoResource extends Model
{
    protected $fillable = [
        'video_id',
        'file_path',
        'original_name',
    ];

    protected $appends = ['download_url'];

    /**
     * Get the video that owns the resource.
     */
    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }

    /**
     * Get the download URL for the resource (via load-storage for Google Drive paths).
     */
    public function getDownloadUrlAttribute(): string
    {
        $path = ltrim($this->file_path, '/');
        return url('/load-storage/' . $path);
    }
}
