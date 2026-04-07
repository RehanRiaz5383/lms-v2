<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class ClearLaravelLog extends Command
{
    protected $signature = 'logs:clear-laravel';

    protected $description = 'Truncate storage/logs/laravel.log (used by the scheduler to limit log growth).';

    public function handle(): int
    {
        $path = storage_path('logs/laravel.log');

        if (! File::exists($path)) {
            $this->info('laravel.log does not exist; nothing to clear.');

            return self::SUCCESS;
        }

        File::put($path, '');

        $this->info('laravel.log was cleared.');

        return self::SUCCESS;
    }
}
