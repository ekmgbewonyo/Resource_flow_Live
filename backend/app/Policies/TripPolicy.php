<?php

namespace App\Policies;

use App\Models\Trip;
use App\Models\User;

class TripPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isDriver() || $user->isAdmin() || $user->isAuditor() || $user->isSupervisor();
    }

    public function view(User $user, Trip $trip): bool
    {
        return $user->isAdmin() || $user->isAuditor()
            || $trip->driver_id === $user->id
            || ($trip->request && $trip->request->user_id === $user->id);
    }

    public function create(User $user): bool
    {
        return $user->isDriver() || $user->isAdmin();
    }

    public function update(User $user, Trip $trip): bool
    {
        return $trip->driver_id === $user->id || $user->isAdmin();
    }
}
