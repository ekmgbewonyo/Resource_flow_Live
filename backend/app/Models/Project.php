<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'ngo_id',
        'organization_id',
        'title',
        'slug',
        'description',
        'need_type',
        'sdg_goals',
        'budget',
        'target_amount',
        'funded_amount',
        'raised_amount',
        'impact_metrics',
        'location',
        'location_gps',
        'cover_photo_path',
        'proof_documents',
        'status',
        'start_date',
        'end_date',
        'is_verified',
        'verified_by',
        'verified_at',
    ];

    protected $casts = [
        'sdg_goals' => 'array',
        'impact_metrics' => 'array',
        'proof_documents' => 'array',
        'budget' => 'decimal:2',
        'target_amount' => 'decimal:2',
        'funded_amount' => 'decimal:2',
        'raised_amount' => 'decimal:2',
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'verified_at' => 'datetime',
        'is_verified' => 'boolean',
    ];

    // Relationships
    public function ngo()
    {
        return $this->belongsTo(User::class, 'ngo_id');
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function projectBudgets()
    {
        return $this->hasMany(ProjectBudget::class);
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function csrPartnerships()
    {
        return $this->hasMany(CSRPartnership::class);
    }

    public function projectItems()
    {
        return $this->hasMany(ProjectItem::class);
    }

    public function impactProofs()
    {
        return $this->hasMany(ImpactProof::class);
    }

    public function itemClaims()
    {
        return $this->hasMany(ItemClaim::class);
    }

    // Helper methods
    public function getFundingProgressAttribute()
    {
        $target = $this->effective_target_amount;
        $raised = $this->effective_raised_amount;
        if (!$target || $target == 0) return 0;
        return min(100, ($raised / $target) * 100);
    }

    public function getRemainingBudgetAttribute()
    {
        return max(0, $this->effective_target_amount - $this->effective_raised_amount);
    }

    public function getEffectiveTargetAmountAttribute(): float
    {
        return (float) ($this->attributes['target_amount'] ?? $this->attributes['budget'] ?? 0);
    }

    public function getEffectiveRaisedAmountAttribute(): float
    {
        return (float) ($this->attributes['raised_amount'] ?? $this->attributes['funded_amount'] ?? 0);
    }
}
