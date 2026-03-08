<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\SecurityHelper;
use App\Models\VerificationDocument;
use App\Services\GhanaCardVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GhanaCardVerificationController extends Controller
{
    /**
     * Verify Ghana Card via QoreID API (ID number + name).
     * Can be called before document upload (Verify button) or during upload flow.
     */
    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id_number' => 'required|string|max:50',
            'firstname' => 'required|string|max:100',
            'lastname' => 'required|string|max:100',
            'consent_given' => 'boolean',
        ]);

        $validated['firstname'] = SecurityHelper::sanitizeString($validated['firstname'], 100);
        $validated['lastname'] = SecurityHelper::sanitizeString($validated['lastname'], 100);
        $validated['id_number'] = SecurityHelper::sanitizeString($validated['id_number'], 50);

        $userId = $request->user()?->id;
        $consentGiven = (bool) ($validated['consent_given'] ?? false);

        $result = GhanaCardVerificationService::verifyGhanaCard(
            $validated['id_number'],
            $validated['firstname'],
            $validated['lastname'],
            $userId,
            $consentGiven
        );

        $statusCode = 200;
        $errorCode = $result['error_code'] ?? '';
        if (!empty($errorCode) && in_array($errorCode, ['UNAUTHORIZED', 'SERVER_ERROR', 'EXCEPTION'], true)) {
            $statusCode = 503;
        } elseif ($errorCode === 'NOT_FOUND') {
            $statusCode = 404;
        }

        return response()->json($result, $statusCode);
    }

    /**
     * Verify Ghana Card with images (Ghana Card photo + user selfie).
     * Used for onboarding validation. Accepts base64 or multipart files.
     *
     * @see https://docs.qoreid.com/reference/get-client-token
     * @see https://docs.qoreid.com/docs/ocr-accepted-documents (NATIONAL_ID_GHA)
     */
    public function verifyWithImages(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ghana_card_image' => 'required_without:ghana_card_base64|nullable|file|mimes:jpg,jpeg,png|max:5120',
            'ghana_card_base64' => 'required_without:ghana_card_image|nullable|string|max:7340032',
            'user_photo' => 'required_without:user_photo_base64|nullable|file|mimes:jpg,jpeg,png|max:5120',
            'user_photo_base64' => 'required_without:user_photo|nullable|string|max:7340032',
            'firstname' => 'required|string|max:100',
            'lastname' => 'required|string|max:100',
            'consent_given' => 'boolean',
        ]);

        $consentGiven = (bool) ($validated['consent_given'] ?? false);
        if (!$consentGiven) {
            return response()->json([
                'verified' => false,
                'error' => 'Consent is required for Ghana Card verification under the Ghana Data Protection Act.',
                'error_code' => 'CONSENT_REQUIRED',
            ], 422);
        }

        $ghanaCardBase64 = null;
        if ($request->hasFile('ghana_card_image')) {
            $ghanaCardBase64 = base64_encode(file_get_contents($request->file('ghana_card_image')->getRealPath()));
        } elseif (!empty($validated['ghana_card_base64'])) {
            $ghanaCardBase64 = SecurityHelper::validateBase64Image($validated['ghana_card_base64']);
            if ($ghanaCardBase64 === null) {
                return response()->json([
                    'verified' => false,
                    'error' => 'Invalid Ghana Card image. Please upload a valid JPEG or PNG image (max 5MB).',
                    'error_code' => 'INVALID_IMAGE',
                ], 422);
            }
        }

        $userPhotoBase64 = null;
        if ($request->hasFile('user_photo')) {
            $userPhotoBase64 = base64_encode(file_get_contents($request->file('user_photo')->getRealPath()));
        } elseif (!empty($validated['user_photo_base64'])) {
            $userPhotoBase64 = SecurityHelper::validateBase64Image($validated['user_photo_base64']);
            if ($userPhotoBase64 === null) {
                return response()->json([
                    'verified' => false,
                    'error' => 'Invalid selfie image. Please upload a valid JPEG or PNG image (max 5MB).',
                    'error_code' => 'INVALID_IMAGE',
                ], 422);
            }
        }

        if (empty($ghanaCardBase64) || empty($userPhotoBase64)) {
            return response()->json([
                'verified' => false,
                'error' => 'Both Ghana Card image and your photo (selfie) are required.',
                'error_code' => 'IMAGES_REQUIRED',
            ], 422);
        }

        $firstname = SecurityHelper::sanitizeString($validated['firstname'], 100);
        $lastname = SecurityHelper::sanitizeString($validated['lastname'], 100);

        $workflowId = config('services.qoreid.workflow_id') ?? env('QOREID_WORKFLOW_ID');
        if (empty($workflowId)) {
            if ($request->user()) {
                // Workflow not configured but user is logged in: save for manual review
                $ref = 'manual_' . $request->user()->id . '_' . time();
                VerificationDocument::create([
                    'user_id' => $request->user()->id,
                    'document_type' => 'Ghana Card',
                    'document_number' => null,
                    'file_path' => 'qoreid_images/' . $ref,
                    'file_name' => 'ghana_card_selfie_pending',
                    'mime_type' => 'application/json',
                    'file_size' => 0,
                    'verification_status' => 'Pending',
                    'qoreid_request_id' => $ref,
                    'qoreid_photo' => 'data:image/jpeg;base64,' . $userPhotoBase64,
                    'notes' => 'Image verification (workflow not configured). Ghana Card + selfie submitted for manual review.',
                ]);
                return response()->json([
                    'verified' => false,
                    'error' => 'Image verification is not configured. Your documents have been saved for manual review. You can also use "Verify by ID number" for instant verification.',
                    'error_code' => 'MANUAL_REVIEW',
                    'submitted_for_review' => true,
                ], 200);
            }
            // No user (e.g. registration): suggest Verify by ID number
            return response()->json([
                'verified' => false,
                'error' => 'Image verification requires setup. Please use "Verify by ID number" above for instant verification.',
                'error_code' => 'SERVICE_UNAVAILABLE',
            ], 200);
        }

        $result = GhanaCardVerificationService::verifyWithImages(
            $ghanaCardBase64,
            $userPhotoBase64,
            $firstname,
            $lastname,
            $request->user()?->id,
            $consentGiven
        );

        // If verified and user is logged in, create VerificationDocument
        if (!empty($result['verified']) && $request->user()) {
            $ref = SecurityHelper::sanitizePathComponent(
                $result['request_id'] ?? ('img_' . $request->user()->id . '_' . time()),
                100
            );
            VerificationDocument::create([
                'user_id' => $request->user()->id,
                'document_type' => 'Ghana Card',
                'document_number' => $result['national_id'] ?? null,
                'file_path' => 'qoreid_images/' . $ref,
                'file_name' => 'ghana_card_selfie_verified',
                'mime_type' => 'application/json',
                'file_size' => 0,
                'verification_status' => 'Verified',
                'qoreid_request_id' => $ref,
                'qoreid_verified_at' => now(),
                'verified_at' => now(),
            ]);
        }

        $statusCode = 200;
        $errorCode = $result['error_code'] ?? '';
        if (!empty($errorCode) && in_array($errorCode, ['UNAUTHORIZED', 'SERVER_ERROR', 'EXCEPTION', 'SERVICE_UNAVAILABLE'], true)) {
            $statusCode = 503;
        } elseif (in_array($errorCode, ['NOT_FOUND', 'CONSENT_REQUIRED', 'IMAGES_REQUIRED'], true)) {
            $statusCode = 422;
        }

        return response()->json($result, $statusCode);
    }

    /**
     * Store QoreID SDK verification result (called by frontend after SDK completes).
     * The SDK captures Ghana Card + selfie and verifies via QoreID; we store the result.
     */
    public function storeQoreIdResult(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_reference' => 'required|string|max:255',
            'workflow_id' => 'nullable|string|max:100',
            'status' => 'required|string|in:verified,pending,failed',
            'national_id' => 'nullable|string|max:50',
            'firstname' => 'nullable|string|max:100',
            'lastname' => 'nullable|string|max:100',
        ]);

        $validated['customer_reference'] = SecurityHelper::sanitizeString($validated['customer_reference'], 255);
        $validated['workflow_id'] = $validated['workflow_id'] ? SecurityHelper::sanitizeString($validated['workflow_id'], 100) : null;
        $validated['national_id'] = $validated['national_id'] ? SecurityHelper::sanitizeString($validated['national_id'], 50) : null;
        $validated['firstname'] = $validated['firstname'] ? SecurityHelper::sanitizeString($validated['firstname'], 100) : null;
        $validated['lastname'] = $validated['lastname'] ? SecurityHelper::sanitizeString($validated['lastname'], 100) : null;

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $ref = SecurityHelper::sanitizePathComponent(
            $validated['workflow_id'] ?? $validated['customer_reference'],
            100
        );
        $document = VerificationDocument::create([
            'user_id' => $user->id,
            'document_type' => 'Ghana Card',
            'document_number' => $validated['national_id'] ?? null,
            'file_path' => 'qoreid_sdk/' . $ref,
            'file_name' => 'qoreid_verified',
            'mime_type' => 'application/json',
            'file_size' => 0,
            'verification_status' => $validated['status'] === 'verified' ? 'Verified' : 'Pending',
            'qoreid_request_id' => $ref,
            'qoreid_verified_at' => $validated['status'] === 'verified' ? now() : null,
            'verified_at' => $validated['status'] === 'verified' ? now() : null,
        ]);

        return response()->json([
            'verified' => $validated['status'] === 'verified',
            'document_id' => $document->id,
            'message' => $validated['status'] === 'verified'
                ? 'Ghana Card verified successfully.'
                : 'Verification submitted. Your document will be reviewed.',
        ], 201);
    }
}
