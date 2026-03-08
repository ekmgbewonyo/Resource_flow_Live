<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add recipient confirmation and Ghana Card verification fields for digital signing.
     */
    public function up(): void
    {
        Schema::table('delivery_proofs', function (Blueprint $table) {
            $table->timestamp('recipient_confirmed_at')->nullable()->after('recipient_comments');
            $table->boolean('recipient_ghana_card_verified')->default(false)->after('recipient_confirmed_at');
            $table->string('recipient_ghana_card_number', 50)->nullable()->after('recipient_ghana_card_verified');
        });
    }

    public function down(): void
    {
        Schema::table('delivery_proofs', function (Blueprint $table) {
            $table->dropColumn([
                'recipient_confirmed_at',
                'recipient_ghana_card_verified',
                'recipient_ghana_card_number',
            ]);
        });
    }
};
