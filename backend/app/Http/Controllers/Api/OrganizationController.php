<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganizationController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $org = $user->organization;

        if (!$org) {
            return response()->json(['organization' => null, 'message' => 'No organization profile yet']);
        }

        return response()->json($org);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isNGO()) {
            return response()->json(['message' => 'Only NGOs can create organizations.'], 403);
        }

        if ($user->organization) {
            return response()->json(['message' => 'Organization already exists. Use update.'], 422);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'registration_number' => 'nullable|string|max:100',
            'tin' => 'nullable|string|max:50',
            'logo_path' => 'nullable|string|max:500',
            'cover_photo_path' => 'nullable|string|max:500',
            'documents_path' => 'nullable|array',
            'documents_path.*' => 'string|max:500',
        ]);

        $org = Organization::create([
            'user_id' => $user->id,
            'name' => $validated['name'],
            'registration_number' => $validated['registration_number'] ?? null,
            'tin' => $validated['tin'] ?? null,
            'verification_tier' => 'tier_1',
            'logo_path' => $validated['logo_path'] ?? null,
            'cover_photo_path' => $validated['cover_photo_path'] ?? null,
            'documents_path' => $validated['documents_path'] ?? null,
        ]);

        return response()->json($org, 201);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $org = $user->organization;

        if (!$org) {
            return response()->json(['message' => 'Create organization first.'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'registration_number' => 'nullable|string|max:100',
            'tin' => 'nullable|string|max:50',
            'logo_path' => 'nullable|string|max:500',
            'cover_photo_path' => 'nullable|string|max:500',
            'documents_path' => 'nullable|array',
            'documents_path.*' => 'string|max:500',
        ]);

        $org->update($validated);
        return response()->json($org);
    }
}
