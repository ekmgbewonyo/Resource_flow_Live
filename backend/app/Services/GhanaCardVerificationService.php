<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Ghana Card verification via QoreID API.
 * Supports token auth (clientId + secret) and legacy secret_key.
 * Compliant with Ghana Data Protection Act - only verification status and request_id are logged.
 *
 * @see https://docs.qoreid.com/reference/get-client-token
 * @see https://docs.qoreid.com/docs/ghana-card
 */
class GhanaCardVerificationService
{
    private const FORMAT_REGEX = '/^GHA-\d{9}-\d$/';

    private const BASE_URL = 'https://api.qoreid.com';

    private const TOKEN_CACHE_KEY = 'qoreid_access_token';

    private const TOKEN_CACHE_TTL = 7000; // 7200 secs - 200 buffer

    /**
     * Get Guzzle verify option: false to disable, or path to CA bundle.
     * Guzzle on Windows may not pick up php.ini curl.cainfo, so we pass it explicitly.
     */
    protected static function getVerifyOption()
    {
        if (config('services.qoreid.verify_ssl') === false) {
            return false;
        }
        $cainfo = config('services.qoreid.cainfo') ?: ini_get('curl.cainfo');
        if ($cainfo && file_exists($cainfo)) {
            return $cainfo;
        }
        return null; // Let Guzzle use its default
    }

    /**
     * Get Bearer token for QoreID API.
     * Uses token endpoint when clientId and secret are configured.
     */
    public static function getAccessToken(): ?string
    {
        $clientId = config('services.qoreid.client_id') ?? env('QOREID_CLIENT_ID');
        $secret = config('services.qoreid.secret') ?? env('QOREID_SECRET');

        if (empty($clientId) || empty($secret)) {
            return null;
        }

        return Cache::remember(self::TOKEN_CACHE_KEY, self::TOKEN_CACHE_TTL, function () use ($clientId, $secret) {
            $http = Http::asJson();
            $verify = self::getVerifyOption();
            if ($verify !== null) {
                $http = $http->withOptions(['verify' => $verify]);
            }
            $response = $http->post(self::BASE_URL . '/token', [
                'clientId' => $clientId,
                'secret' => $secret,
            ]);

            if (!$response->successful()) {
                Log::warning('QoreID token fetch failed', ['status' => $response->status()]);
                return null;
            }

            $data = $response->json();
            return $data['accessToken'] ?? null;
        });
    }

    /**
     * Get authorization header for QoreID API calls.
     * Prefers token auth; falls back to legacy secret_key.
     */
    protected static function getAuthHeader(): ?string
    {
        $token = self::getAccessToken();
        if ($token) {
            return 'Bearer ' . $token;
        }

        $secretKey = config('services.qoreid.secret_key') ?? env('QOREID_SECRET_KEY');
        if (!empty($secretKey)) {
            return 'Bearer ' . $secretKey;
        }

        return null;
    }

    /**
     * Normalize Ghana Card input: uppercase, ensure GHA- prefix and dashes.
     * Handles inputs like "gha7000000000" or "700000000-0".
     */
    public static function normalizeIdNumber(string $idNumber): string
    {
        $cleaned = strtoupper(trim(preg_replace('/\s+/', '', $idNumber)));

        // Remove "GHA" prefix if present to extract digits
        $digits = preg_replace('/^GHA-?/', '', $cleaned);
        $digits = preg_replace('/[^0-9]/', '', $digits);

        if (strlen($digits) === 10) {
            return 'GHA-' . substr($digits, 0, 9) . '-' . substr($digits, 9, 1);
        }

        return $cleaned;
    }

    /**
     * Validate Ghana Card format before API call.
     */
    public static function isValidFormat(string $idNumber): bool
    {
        $normalized = self::normalizeIdNumber($idNumber);
        return (bool) preg_match(self::FORMAT_REGEX, $normalized);
    }

    /**
     * Verify Ghana Card against NIA via QoreID.
     *
     * @return array{verified: bool, name_mismatch: bool, photo?: string, request_id?: string, nia_first_name?: string, nia_last_name?: string, error?: string, error_code?: string}
     */
    public static function verifyGhanaCard(
        string $idNumber,
        string $firstname,
        string $lastname,
        ?int $userId = null,
        bool $consentGiven = false
    ): array {
        $normalized = self::normalizeIdNumber($idNumber);

        if (!self::isValidFormat($normalized)) {
            return [
                'verified' => false,
                'name_mismatch' => false,
                'error' => 'Invalid Ghana Card format. Expected format: GHA-XXXXXXXXX-X',
                'error_code' => 'INVALID_FORMAT',
            ];
        }

        $authHeader = self::getAuthHeader();
        if (empty($authHeader)) {
            Log::warning('Ghana Card verification skipped: QoreID not configured (set QOREID_CLIENT_ID+QOREID_SECRET or QOREID_SECRET_KEY)');
            return [
                'verified' => false,
                'name_mismatch' => false,
                'error' => 'Verification service not configured.',
                'error_code' => 'SERVICE_UNAVAILABLE',
            ];
        }

        // Log consent for Ghana Data Protection Act (only status, no PII in logs)
        if ($userId && $consentGiven) {
            Log::channel('single')->info('Ghana Card verification consent logged', [
                'user_id' => $userId,
                'action' => 'ghana_card_verification_consent',
                'consent_given' => true,
            ]);
        }

        try {
            $http = Http::withHeaders([
                'Authorization' => $authHeader,
                'Content-Type' => 'application/json',
            ]);
            $verify = self::getVerifyOption();
            if ($verify !== null) {
                $http = $http->withOptions(['verify' => $verify]);
            }
            $response = $http->post(self::BASE_URL . '/v1/gh/identities/ghana-id/' . $normalized, [
                'firstname' => trim($firstname),
                'lastname' => trim($lastname),
            ]);

            $statusCode = $response->status();
            $body = $response->json();

            // Handle error responses
            if ($statusCode === 401) {
                Log::warning('QoreID API unauthorized', ['request_id' => $body['id'] ?? null]);
                return [
                    'verified' => false,
                    'name_mismatch' => false,
                    'error' => 'Verification service authentication failed.',
                    'error_code' => 'UNAUTHORIZED',
                ];
            }

            if ($statusCode === 404) {
                return [
                    'verified' => false,
                    'name_mismatch' => false,
                    'error' => 'Ghana Card not found in NIA database.',
                    'error_code' => 'NOT_FOUND',
                ];
            }

            if ($statusCode >= 500) {
                Log::warning('QoreID API server error', [
                    'status' => $statusCode,
                    'request_id' => $body['id'] ?? null,
                ]);
                return [
                    'verified' => false,
                    'name_mismatch' => false,
                    'error' => 'Verification service temporarily unavailable. Please try again later.',
                    'error_code' => 'SERVER_ERROR',
                ];
            }

            if (!$response->successful()) {
                $message = $body['message'] ?? $body['error'] ?? 'Verification failed.';
                return [
                    'verified' => false,
                    'name_mismatch' => false,
                    'error' => is_string($message) ? $message : 'Verification failed.',
                    'error_code' => 'VERIFICATION_FAILED',
                ];
            }

            // Map QoreID response
            $status = $body['status'] ?? [];
            $state = $status['state'] ?? '';
            $verifiedStatus = $status['status'] ?? '';
            $isVerified = ($state === 'complete' && $verifiedStatus === 'verified');

            $ghanaId = $body['ghana_id'] ?? [];
            $niaFirstName = $ghanaId['firstName'] ?? '';
            $niaLastName = $ghanaId['lastName'] ?? '';
            $photo = $ghanaId['photo'] ?? null;
            $requestId = $body['id'] ?? null;

            // Name mismatch check (case-insensitive, trimmed)
            $userFirst = strtolower(trim($firstname));
            $userLast = strtolower(trim($lastname));
            $niaFirst = strtolower(trim($niaFirstName));
            $niaLast = strtolower(trim($niaLastName));
            $nameMismatch = !$isVerified || ($userFirst !== $niaFirst || $userLast !== $niaLast);

            // Only log verification status and request_id (no PII)
            Log::channel('single')->info('Ghana Card verification result', [
                'verification_status' => $isVerified ? 'verified' : 'not_verified',
                'request_id' => $requestId,
            ]);

            $result = [
                'verified' => $isVerified && !$nameMismatch,
                'name_mismatch' => $isVerified && $nameMismatch,
                'request_id' => $requestId,
                'nia_first_name' => $niaFirstName,
                'nia_last_name' => $niaLastName,
            ];

            if ($photo) {
                $result['photo'] = $photo;
            }

            if ($nameMismatch && $isVerified) {
                $result['error'] = 'The name on your Ghana Card does not match the name you provided.';
                $result['error_code'] = 'NAME_MISMATCH';
            }

            return $result;
        } catch (\Throwable $e) {
            Log::error('Ghana Card verification exception', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return [
                'verified' => false,
                'name_mismatch' => false,
                'error' => 'Verification service temporarily unavailable. Please try again later.',
                'error_code' => 'EXCEPTION',
            ];
        }
    }

    /**
     * Verify Ghana Card with images (Ghana Card photo + user selfie).
     * Uses QoreID workflow/OCR when configured. Otherwise suggests using QoreID Web SDK.
     *
     * @return array{verified: bool, name_mismatch?: bool, error?: string, error_code?: string, request_id?: string, national_id?: string}
     */
    public static function verifyWithImages(
        string $ghanaCardBase64,
        string $userPhotoBase64,
        string $firstname,
        string $lastname,
        ?int $userId = null,
        bool $consentGiven = false
    ): array {
        $authHeader = self::getAuthHeader();
        if (empty($authHeader)) {
            return [
                'verified' => false,
                'error' => 'Verification service not configured. Set QOREID_CLIENT_ID and QOREID_SECRET.',
                'error_code' => 'SERVICE_UNAVAILABLE',
            ];
        }

        if (!$consentGiven) {
            return [
                'verified' => false,
                'error' => 'Consent is required for Ghana Card verification.',
                'error_code' => 'CONSENT_REQUIRED',
            ];
        }

        $workflowId = config('services.qoreid.workflow_id') ?? env('QOREID_WORKFLOW_ID');
        if (empty($workflowId)) {
            return [
                'verified' => false,
                'error' => 'Image verification requires QoreID workflow. Configure QOREID_WORKFLOW_ID or use the QoreID Web SDK for capture and verification.',
                'error_code' => 'SERVICE_UNAVAILABLE',
            ];
        }

        try {
            $customerRef = 'rf_' . ($userId ?? 0) . '_' . time();
            $http = Http::withHeaders([
                'Authorization' => $authHeader,
                'Content-Type' => 'application/json',
            ]);
            $verify = self::getVerifyOption();
            if ($verify !== null) {
                $http = $http->withOptions(['verify' => $verify]);
            }
            $response = $http->post(self::BASE_URL . '/v1/workflows/' . $workflowId . '/submit', [
                'customerReference' => $customerRef,
                'applicantData' => [
                    'firstname' => trim($firstname),
                    'lastname' => trim($lastname),
                ],
                'ocrAcceptedDocuments' => ['NATIONAL_ID_GHA'],
                'documentImage' => $ghanaCardBase64,
                'selfieImage' => $userPhotoBase64,
            ]);

            if (!$response->successful()) {
                $body = $response->json();
                $msg = $body['message'] ?? $body['error'] ?? 'Verification failed.';
                return [
                    'verified' => false,
                    'error' => is_string($msg) ? $msg : 'Verification failed.',
                    'error_code' => 'VERIFICATION_FAILED',
                ];
            }

            $data = $response->json();
            $status = $data['status'] ?? [];
            $state = $status['state'] ?? '';
            $verifiedStatus = $status['status'] ?? '';
            $isVerified = ($state === 'complete' && $verifiedStatus === 'verified');

            $ghanaId = $data['ghana_id'] ?? $data['extractedData'] ?? [];
            $nationalId = $ghanaId['nationalId'] ?? $ghanaId['idNumber'] ?? null;

            return [
                'verified' => $isVerified,
                'request_id' => $data['id'] ?? $customerRef,
                'national_id' => $nationalId,
            ];
        } catch (\Throwable $e) {
            Log::error('Ghana Card image verification exception', ['message' => $e->getMessage()]);
            return [
                'verified' => false,
                'error' => 'Verification service temporarily unavailable. Please try again.',
                'error_code' => 'EXCEPTION',
            ];
        }
    }
}
