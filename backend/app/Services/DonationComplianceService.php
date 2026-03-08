<?php

namespace App\Services;

use App\Models\Donation;
use App\Models\User;

class DonationComplianceService
{
    /** 10% of assessable income - GRA tax deductible limit */
    public const TAX_DEDUCTIBLE_RATE = 0.10;

    /** Individual anonymous threshold (GHS) */
    public const INDIVIDUAL_ANONYMOUS_LIMIT = 10000;

    /**
     * Get corporate donor tax stats for the current year.
     */
    public function getCorporateTaxStats(User $user): array
    {
        if (!$user->isDonorInstitution()) {
            return [];
        }

        $assessableIncome = (float) ($user->assessable_annual_income ?? 0);
        $maxDeductibleLimit = $assessableIncome * self::TAX_DEDUCTIBLE_RATE;

        $donationsYtd = (float) Donation::where('user_id', $user->id)
            ->where('type', 'Monetary')
            ->whereIn('status', ['Verified', 'Allocated', 'Delivered'])
            ->whereYear('created_at', now()->year)
            ->sum('quantity');

        $remainingCap = max(0, $maxDeductibleLimit - $donationsYtd);
        $isOverLimit = $donationsYtd >= $maxDeductibleLimit;

        return [
            'assessable_annual_income' => $assessableIncome,
            'max_deductible_limit' => $maxDeductibleLimit,
            'donations_ytd' => $donationsYtd,
            'remaining_deductible_cap' => $remainingCap,
            'is_over_limit' => $isOverLimit,
            'tax_rate_percent' => self::TAX_DEDUCTIBLE_RATE * 100,
        ];
    }

    /**
     * Resolve donor type from user role.
     */
    public function resolveDonorType(User $user): string
    {
        return $user->isDonorInstitution() ? 'corporate' : 'individual';
    }

    /**
     * Determine if donation can be anonymous based on amount and donor type.
     */
    public function canBeAnonymous(User $user, float $amount): bool
    {
        if ($user->isDonorInstitution()) {
            return false; // Corporate donors cannot be anonymous
        }
        return $amount <= self::INDIVIDUAL_ANONYMOUS_LIMIT;
    }
}
