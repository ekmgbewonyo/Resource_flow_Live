<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    /**
     * Health check endpoint for deployment verification.
     */
    public function __invoke()
    {
        $dbOk = false;
        try {
            DB::connection()->getPdo();
            $dbOk = true;
        } catch (\Throwable $e) {
            // Database not connected
        }

        return response()->json([
            'status' => 'ok',
            'app' => config('app.name'),
            'env' => config('app.env'),
            'database' => $dbOk ? 'connected' : 'disconnected',
        ]);
    }
}
