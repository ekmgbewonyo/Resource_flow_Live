<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add donor compliance & tax management fields.
     * - users: donor_type, assessable_annual_income, kyc_details_submitted
     * - donations: donor_type, is_anonymous, compliance_agreed
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('donor_type', 20)->nullable()->after('role')
                ->comment('individual|corporate - for donor roles');
            $table->decimal('assessable_annual_income', 15, 2)->nullable()->after('donor_type')
                ->comment('For corporate donors - used to calculate 10% tax deductible limit');
            $table->boolean('kyc_details_submitted')->default(false)->after('assessable_annual_income');
        });

        Schema::table('donations', function (Blueprint $table) {
            $table->string('donor_type', 20)->nullable()->after('user_id')
                ->comment('individual|corporate - snapshot at donation time');
            $table->boolean('is_anonymous')->default(false)->after('donor_type');
            $table->boolean('compliance_agreed')->default(false)->after('is_anonymous')
                ->comment('Corporate: wholly and exclusively condition');
        });
    }

    public function down(): void
    {
        Schema::table('donations', function (Blueprint $table) {
            $table->dropColumn(['donor_type', 'is_anonymous', 'compliance_agreed']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['donor_type', 'assessable_annual_income', 'kyc_details_submitted']);
        });
    }
};
