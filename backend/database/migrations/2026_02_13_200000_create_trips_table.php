<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Trips table for real-time driver tracking and last-mile delivery.
     */
    public function up(): void
    {
        Schema::create('trips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('request_id')->constrained('requests')->cascadeOnDelete()->comment('Requisition/aid request');
            $table->foreignId('allocation_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('delivery_route_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('status', ['pending', 'started', 'arrived', 'completed'])->default('pending');
            $table->decimal('current_lat', 10, 8)->nullable();
            $table->decimal('current_lng', 11, 8)->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('arrived_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index('driver_id');
            $table->index('request_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trips');
    }
};
