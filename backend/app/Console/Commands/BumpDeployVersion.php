<?php

namespace App\Console\Commands;

use App\Models\AppDeployVersion;
use Illuminate\Console\Command;

class BumpDeployVersion extends Command
{
    protected $signature = 'app:bump-deploy-version';

    protected $description = 'Increment the deploy version stored in the database. Run after each production deploy (e.g. from your deploy script or git post-merge hook on the server).';

    public function handle(): int
    {
        $v = AppDeployVersion::bump();
        $this->info("Deploy version is now: {$v}");

        return self::SUCCESS;
    }
}
