<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Admin must confirm receipt before donation appears in inventory.
     * Auditor then authorizes prices (including web-scraped market_price).
     */
    public function up(): void
    {
        Schema::table('donations', function (Blueprint $table) {
            $table->timestamp('receipt_confirmed_at')->nullable()->after('date_received');
            $table->foreignId('receipt_confirmed_by')->nullable()->after('receipt_confirmed_at')
                ->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('donations', function (Blueprint $table) {
            $table->dropForeign(['receipt_confirmed_by']);
            $table->dropColumn(['receipt_confirmed_at', 'receipt_confirmed_by']);
        });
    }
};
