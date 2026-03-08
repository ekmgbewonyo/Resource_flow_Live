<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Backfill receipt_confirmed for existing Goods donations so they remain visible in inventory.
     */
    public function up(): void
    {
        $adminId = DB::table('users')->where('role', 'admin')->value('id');
        if (!$adminId) {
            return;
        }

        DB::table('donations')
            ->where('type', 'Goods')
            ->whereNull('receipt_confirmed_at')
            ->update([
                'receipt_confirmed_at' => DB::raw('COALESCE(date_received, created_at)'),
                'receipt_confirmed_by' => $adminId,
            ]);
    }

    public function down(): void
    {
        // No-op
    }
};
