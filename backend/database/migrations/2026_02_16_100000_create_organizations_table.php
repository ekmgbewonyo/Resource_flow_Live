<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Organizations table - NGO profile with verification tier.
     */
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('registration_number', 100)->nullable()->comment('RG - Registrar General');
            $table->string('tin', 50)->nullable()->comment('Tax Identification Number');
            $table->enum('verification_tier', ['tier_1', 'tier_2', 'tier_3'])->default('tier_1');
            $table->string('logo_path')->nullable();
            $table->string('cover_photo_path')->nullable();
            $table->json('documents_path')->nullable()->comment('Paths to Cert of Incorporation, etc.');
            $table->timestamps();

            $table->index('user_id');
            $table->index('verification_tier');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organizations');
    }
};
