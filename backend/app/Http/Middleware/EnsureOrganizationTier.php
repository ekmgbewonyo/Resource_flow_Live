<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOrganizationTier
{
    /**
     * Ensure user's organization meets minimum tier for large projects.
     * Use: ->middleware('org.tier:2') for tier_2+, etc.
     */
    public function handle(Request $request, Closure $next, string $minTier = '2'): Response
    {
        $user = $request->user();
        if (!$user || !$user->isDonorInstitution()) {
            return response()->json(['message' => 'NGO access required.'], 403);
        }

        $org = $user->organization;
        if (!$org) {
            return response()->json([
                'message' => 'Create your organization profile first to publish projects.',
            ], 403);
        }

        $tiers = ['1' => 'tier_1', '2' => 'tier_2', '3' => 'tier_3'];
        $required = $tiers[$minTier] ?? 'tier_2';
        $order = ['tier_1' => 1, 'tier_2' => 2, 'tier_3' => 3];

        if (($order[$org->verification_tier] ?? 0) < ($order[$required] ?? 0)) {
            return response()->json([
                'message' => "Tier {$minTier} verification required. Upload RG and supporting documents to upgrade.",
            ], 403);
        }

        return $next($request);
    }
}
