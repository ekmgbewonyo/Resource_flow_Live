<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Trip extends Model
{
    protected $fillable = [
        'driver_id',
        'request_id',
        'allocation_id',
        'delivery_route_id',
        'status',
        'current_lat',
        'current_lng',
        'started_at',
        'arrived_at',
        'completed_at',
    ];

    protected $casts = [
        'current_lat' => 'decimal:8',
        'current_lng' => 'decimal:8',
        'started_at' => 'datetime',
        'arrived_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Request::class);
    }

    public function allocation(): BelongsTo
    {
        return $this->belongsTo(Allocation::class);
    }

    public function deliveryRoute(): BelongsTo
    {
        return $this->belongsTo(DeliveryRoute::class);
    }

    public function deliveryProof(): HasOne
    {
        return $this->hasOne(DeliveryProof::class);
    }
}
