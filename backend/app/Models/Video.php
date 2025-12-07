<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Video extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'title',
        'short_description',
        'source_type',
        'path', // Internal path for videos
        'internal_path', // Also support internal_path for backward compatibility
        'external_url',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'source_type' => 'string',
        ];
    }

    /**
     * Get the video URL based on source type.
     */
    public function getVideoUrlAttribute(): ?string
    {
        if ($this->source_type === 'internal') {
            // Use path column first, fallback to internal_path for backward compatibility
            $videoPath = $this->path ?? $this->internal_path;
            return $videoPath ? url('/load-storage/' . $videoPath) : null;
        }
        
        return $this->external_url;
    }

    /**
     * Get the internal video path (path or internal_path).
     */
    public function getInternalVideoPathAttribute(): ?string
    {
        return $this->path ?? $this->internal_path;
    }
}
