<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryProof extends Model
{
    protected $fillable = [
        'trip_id',
        'recipient_photo_path',
        'gha_card_path',
        'signature_path',
        'recipient_comments',
        'recipient_confirmed_at',
        'recipient_ghana_card_verified',
        'recipient_ghana_card_number',
        'verified_at',
        'verified_by',
    ];

    protected $casts = [
        'verified_at' => 'datetime',
        'recipient_confirmed_at' => 'datetime',
        'recipient_ghana_card_verified' => 'boolean',
    ];

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
