<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Project budget line items - material, transportation, admin, labor.
     */
    public function up(): void
    {
        Schema::create('project_budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->enum('category', ['material', 'transportation', 'admin', 'labor']);
            $table->string('item_name');
            $table->decimal('quantity', 12, 2)->default(1);
            $table->decimal('unit_cost', 15, 2);
            $table->decimal('total_cost', 15, 2);
            $table->timestamps();

            $table->index('project_id');
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_budgets');
    }
};
