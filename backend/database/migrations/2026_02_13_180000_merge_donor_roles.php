<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Merge supplier, ngo, donor, corporate into donor_institution.
 * Add donor_individual for individual donors.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')
            ->whereIn('role', ['supplier', 'ngo', 'donor', 'corporate'])
            ->update(['role' => 'donor_institution']);
    }

    public function down(): void
    {
        // Cannot reliably reverse - original roles are lost
    }
};
