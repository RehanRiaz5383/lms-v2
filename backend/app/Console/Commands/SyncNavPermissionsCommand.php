<?php

namespace App\Console\Commands;

use Database\Seeders\NavPermissionsSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

class SyncNavPermissionsCommand extends Command
{
    protected $signature = 'permissions:sync-nav';

    protected $description = 'Populate nav_permissions and link default roles (Admin, Student, Teacher, CR). Safe to re-run after deploy.';

    public function handle(): int
    {
        if (! Schema::hasTable('nav_permissions')) {
            $this->error('Table nav_permissions is missing. Run migrations first: php artisan migrate --force');

            return self::FAILURE;
        }

        $this->info('Running NavPermissionsSeeder...');
        $this->call('db:seed', [
            '--class' => NavPermissionsSeeder::class,
            '--force' => true,
        ]);
        $this->info('Done. Refresh the Roles & Permissions page in the browser.');

        return self::SUCCESS;
    }
}
