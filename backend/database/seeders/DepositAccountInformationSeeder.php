<?php

namespace Database\Seeders;

use App\Models\DepositAccountInformation;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DepositAccountInformationSeeder extends Seeder
{
    public function run(): void
    {
        if (! DB::getSchemaBuilder()->hasTable('deposit_account_informations')) {
            $this->command?->warn('deposit_account_informations table missing — run migrations first.');
            return;
        }

        DepositAccountInformation::query()->firstOrCreate(
            ['id' => 1],
            [
                'content_html' => '<p>Add your deposit account instructions here.</p>',
                'updated_by_user_id' => null,
            ]
        );

        $this->command?->info('Deposit account information seeded.');
    }
}

