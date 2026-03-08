<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Seeds the application for fresh deployment.
 * Only the Super Admin user is created – no sample data.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            WarehouseSeeder::class,
            LogisticsSeeder::class,
            NGOSeeder::class,
        ]);
    }
}
