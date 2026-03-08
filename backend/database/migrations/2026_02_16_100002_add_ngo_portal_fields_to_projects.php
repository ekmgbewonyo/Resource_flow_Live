<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add NGO Portal fields: organization_id, slug, target_amount, location_gps,
     * cover_photo_path, proof_documents (JSON), status enum expansion.
     */
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->foreignId('organization_id')->nullable()->after('ngo_id')->constrained()->nullOnDelete();
            $table->string('slug')->nullable()->after('title')->unique();
            $table->string('location_gps')->nullable()->after('location');
            $table->decimal('target_amount', 15, 2)->nullable()->after('budget');
            $table->decimal('raised_amount', 15, 2)->default(0)->after('target_amount');
            $table->string('cover_photo_path')->nullable()->after('description');
            $table->json('proof_documents')->nullable()->comment('Past projects, endorsement letters');
        });

        // status column already varchar - new values: draft, pending_approval, active, fully_funded, completed
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
            $table->dropColumn([
                'organization_id', 'slug', 'location_gps', 'target_amount',
                'raised_amount', 'cover_photo_path', 'proof_documents',
            ]);
        });
    }
};
