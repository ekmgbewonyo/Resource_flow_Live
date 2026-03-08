<?php

namespace App\Events;

use App\Models\Trip;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TripLocationUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Trip $trip,
        public float $lat,
        public float $lng
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('trip.' . $this->trip->id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'location.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'trip_id' => $this->trip->id,
            'lat' => (float) $this->lat,
            'lng' => (float) $this->lng,
            'status' => $this->trip->status,
            'updated_at' => now()->toIso8601String(),
        ];
    }
}
