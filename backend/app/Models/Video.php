<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
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
        'google_drive_file_id', // Google Drive file ID for direct downloads
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = ['video_url'];

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
     * Internal videos with a Google Drive file id open in Drive's viewer.
     */
    public function getVideoUrlAttribute(): ?string
    {
        if ($this->source_type === 'internal') {
            if ($this->google_drive_file_id) {
                return self::googleDriveViewUrl($this->google_drive_file_id);
            }

            $videoPath = $this->path ?? $this->internal_path;

            return $videoPath ? url('/load-storage/' . $videoPath) : null;
        }

        return $this->external_url;
    }

    public static function googleDriveViewUrl(string $fileId): string
    {
        return 'https://drive.google.com/file/d/'.trim($fileId).'/view';
    }

    /**
     * Get the internal video path (path or internal_path).
     */
    public function getInternalVideoPathAttribute(): ?string
    {
        return $this->path ?? $this->internal_path;
    }

    /**
     * Get the resource (ZIP attachment) for this video.
     */
    public function resource(): HasOne
    {
        return $this->hasOne(VideoResource::class);
    }
}
