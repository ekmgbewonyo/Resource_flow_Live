<?php

namespace App\Http\Controllers\Api;

use App\Events\TripLocationUpdated;
use App\Http\Controllers\Controller;
use App\Models\Allocation;
use App\Models\DeliveryProof;
use App\Models\Donation;
use App\Models\Trip;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TripController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Trip::with(['driver', 'request', 'allocation', 'deliveryProof']);

        if ($user->isDriver()) {
            $query->where('driver_id', $user->id);
        } elseif (!$user->isAdmin() && !$user->isAuditor()) {
            $query->where('driver_id', $user->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $trips = $query->orderBy('created_at', 'desc')->get();
        return response()->json($trips);
    }

    public function show(Trip $trip): JsonResponse
    {
        $this->authorizeTripAccess($trip);
        $trip->load(['driver', 'request.user', 'allocation.donation', 'deliveryProof']);
        return response()->json($trip);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'request_id' => 'required|exists:requests,id',
            'allocation_id' => 'nullable|exists:allocations,id',
            'delivery_route_id' => 'nullable|exists:delivery_routes,id',
        ]);

        $user = $request->user();
        if (!$user->isDriver() && !$user->isAdmin()) {
            return response()->json(['message' => 'Only drivers can create trips.'], 403);
        }

        $trip = Trip::create([
            'driver_id' => $user->id,
            'request_id' => $validated['request_id'],
            'allocation_id' => $validated['allocation_id'] ?? null,
            'delivery_route_id' => $validated['delivery_route_id'] ?? null,
            'status' => 'pending',
        ]);

        $trip->load(['driver', 'request']);
        return response()->json($trip, 201);
    }

    /**
     * Update driver location - fires TripLocationUpdated broadcast event.
     */
    public function updateLocation(Request $request, Trip $trip): JsonResponse
    {
        $this->authorizeTripAccess($trip);
        if ($trip->driver_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Only the assigned driver can update location.'], 403);
        }

        $validated = $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
        ]);

        $trip->update([
            'current_lat' => $validated['lat'],
            'current_lng' => $validated['lng'],
            'status' => $trip->status === 'pending' ? 'started' : $trip->status,
            'started_at' => $trip->started_at ?? now(),
        ]);

        event(new TripLocationUpdated($trip, (float) $validated['lat'], (float) $validated['lng']));

        return response()->json([
            'trip_id' => $trip->id,
            'lat' => (float) $trip->current_lat,
            'lng' => (float) $trip->current_lng,
            'status' => $trip->status,
        ]);
    }

    /**
     * Mark trip as arrived at destination.
     */
    public function arrive(Request $request, Trip $trip): JsonResponse
    {
        $this->authorizeTripAccess($trip);
        if ($trip->driver_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Only the assigned driver can mark arrival.'], 403);
        }

        $trip->update([
            'status' => 'arrived',
            'arrived_at' => now(),
        ]);

        return response()->json($trip->fresh(['driver', 'request']));
    }

    /**
     * Complete trip with delivery proofs (Ghana Card, recipient photo, signature).
     */
    public function complete(Request $request, Trip $trip): JsonResponse
    {
        $this->authorizeTripAccess($trip);
        if ($trip->driver_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Only the assigned driver can complete the trip.'], 403);
        }

        if ($trip->status === 'completed') {
            return response()->json(['message' => 'Trip already completed.'], 422);
        }

        $validated = $request->validate([
            'gha_card_path' => 'nullable|string|max:500',
            'recipient_photo_path' => 'nullable|string|max:500',
            'signature_path' => 'nullable|string|max:500',
            'recipient_comments' => 'nullable|string|max:2000',
            'recipient_confirmed' => 'nullable|boolean',
            'recipient_ghana_card_verified' => 'required|boolean|accepted',
            'recipient_ghana_card_number' => 'required|string|max:50',
        ], [
            'recipient_ghana_card_verified.accepted' => 'Recipient Ghana Card verification is required to complete delivery.',
            'recipient_ghana_card_number.required' => 'Recipient Ghana Card number is required.',
        ]);

        return DB::transaction(function () use ($trip, $validated) {
            $proof = DeliveryProof::updateOrCreate(
                ['trip_id' => $trip->id],
                [
                    'gha_card_path' => $validated['gha_card_path'] ?? null,
                    'recipient_photo_path' => $validated['recipient_photo_path'] ?? null,
                    'signature_path' => null,
                    'recipient_comments' => $validated['recipient_comments'] ?? null,
                    'recipient_confirmed_at' => now(),
                    'recipient_ghana_card_verified' => true,
                    'recipient_ghana_card_number' => $validated['recipient_ghana_card_number'],
                    'verified_at' => now(),
                    'verified_by' => auth()->id(),
                ]
            );

            $trip->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);

            // Cascade: mark allocation and donation as Delivered
            if ($trip->allocation_id) {
                $allocation = Allocation::find($trip->allocation_id);
                if ($allocation) {
                    $allocation->update([
                        'status' => 'Delivered',
                        'actual_delivery_date' => now(),
                    ]);
                    if ($allocation->donation_id) {
                        Donation::where('id', $allocation->donation_id)->update([
                            'status' => 'Delivered',
                        ]);
                    }
                }
            }

            $aidRequest = $trip->request;
            if ($aidRequest) {
                $aidRequest->update(['status' => 'completed']);
            }

            $trip->load(['driver', 'request', 'allocation', 'deliveryProof']);
            return response()->json($trip);
        });
    }

    public function update(Request $request, Trip $trip): JsonResponse
    {
        $this->authorizeTripAccess($trip);
        return response()->json(['message' => 'Use specific endpoints: update-location, arrive, complete.'], 405);
    }

    public function destroy(Trip $trip): JsonResponse
    {
        $this->authorizeTripAccess($trip);
        if (!auth()->user()->isAdmin()) {
            return response()->json(['message' => 'Only admins can delete trips.'], 403);
        }
        $trip->delete();
        return response()->json(null, 204);
    }

    private function authorizeTripAccess(Trip $trip): void
    {
        $user = request()->user();
        if ($user->isAdmin() || $user->isAuditor() || $trip->driver_id === $user->id) {
            return;
        }
        if ($trip->request && $trip->request->user_id === $user->id) {
            return;
        }
        abort(403, 'Unauthorized to access this trip.');
    }
}
