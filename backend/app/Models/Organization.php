<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'registration_number',
        'tin',
        'verification_tier',
        'logo_path',
        'cover_photo_path',
        'documents_path',
    ];

    protected $casts = [
        'documents_path' => 'array',
    ];

    public const TIER_1 = 'tier_1';
    public const TIER_2 = 'tier_2';
    public const TIER_3 = 'tier_3';

    /** Minimum tier to publish projects > GHS 5,000 */
    public const MIN_TIER_FOR_LARGE_PROJECT = self::TIER_2;

    public const TIER_LABELS = [
        self::TIER_1 => 'Tier 1 - Upload RG to unlock Tier 2',
        self::TIER_2 => 'Tier 2 - Verified',
        self::TIER_3 => 'Tier 3 - Fully Verified',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    public function canPublishLargeProject(float $amount): bool
    {
        if ($amount <= 5000) {
            return true;
        }
        return in_array($this->verification_tier, [self::TIER_2, self::TIER_3]);
    }

    public function getTierLabelAttribute(): string
    {
        return self::TIER_LABELS[$this->verification_tier] ?? $this->verification_tier;
    }
}
