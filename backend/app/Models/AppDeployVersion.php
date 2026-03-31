<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppDeployVersion extends Model
{
    protected $fillable = [
        'version',
    ];

    protected $casts = [
        'version' => 'integer',
    ];

    public static function currentVersion(): int
    {
        $row = self::query()->orderBy('id')->first();
        if (!$row) {
            $row = self::query()->create([
                'version' => 1,
            ]);
        }

        return (int) $row->version;
    }

    public static function bump(): int
    {
        $row = self::query()->orderBy('id')->first();
        if (!$row) {
            $row = self::query()->create(['version' => 1]);
        }
        $row->increment('version');

        return (int) $row->refresh()->version;
    }
}
