<?php

namespace App\Observers;

use App\Models\DeliveryRoute;
use App\Models\Logistic;
use App\Models\Trip;
use Illuminate\Support\Str;

class DeliveryRouteObserver
{
    /**
     * Handle the DeliveryRoute "created" event.
     */
    public function created(DeliveryRoute $deliveryRoute): void
    {
        // Auto-create Logistic record when DeliveryRoute is created
        if ($deliveryRoute->allocation_id) {
            $trackingNumber = 'RF-' . strtoupper(Str::random(8)) . '-' . $deliveryRoute->id;

            Logistic::create([
                'allocation_id' => $deliveryRoute->allocation_id,
                'delivery_route_id' => $deliveryRoute->id,
                'status' => 'Scheduled',
                'tracking_number' => $trackingNumber,
                'location_updates' => [],
            ]);
        }

        // Auto-create Trip when DeliveryRoute has driver and allocation (for driver delivery flow)
        if ($deliveryRoute->driver_id && $deliveryRoute->allocation_id) {
            $allocation = $deliveryRoute->allocation;
            $requestId = $allocation?->request_id;
            if ($requestId && !Trip::where('delivery_route_id', $deliveryRoute->id)->exists()) {
                Trip::create([
                    'driver_id' => $deliveryRoute->driver_id,
                    'request_id' => $requestId,
                    'allocation_id' => $deliveryRoute->allocation_id,
                    'delivery_route_id' => $deliveryRoute->id,
                    'status' => 'pending',
                ]);
            }
        }
    }

    /**
     * Handle the DeliveryRoute "updated" event.
     */
    public function updated(DeliveryRoute $deliveryRoute): void
    {
        // Update logistic status when route status changes
        if ($deliveryRoute->isDirty('status')) {
            $logistic = Logistic::where('delivery_route_id', $deliveryRoute->id)->first();
            if ($logistic) {
                $logistic->update(['status' => $deliveryRoute->status]);
            }
        }
    }
}
