<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CloudflareTurnstileSettings extends Model
{
    protected $fillable = [
        'site_key',
        'secret_key',
        'is_enabled',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
    ];

    /**
     * Get the current settings (singleton pattern)
     */
    public static function getSettings(): self
    {
        $settings = self::first();
        if (!$settings) {
            $settings = self::create([
                'site_key' => null,
                'secret_key' => null,
                'is_enabled' => false,
            ]);
        }
        return $settings;
    }
}
