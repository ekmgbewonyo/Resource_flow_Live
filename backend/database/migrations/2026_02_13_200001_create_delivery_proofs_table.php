<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Delivery proofs for biometric/photo verification at handover.
     */
    public function up(): void
    {
        Schema::create('delivery_proofs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_id')->constrained()->cascadeOnDelete();
            $table->string('recipient_photo_path')->nullable()->comment('Facial scan / liveness photo');
            $table->string('gha_card_path')->nullable()->comment('Ghana Card image');
            $table->string('signature_path')->nullable()->comment('Digital signature image');
            $table->text('recipient_comments')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('trip_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_proofs');
    }
};
