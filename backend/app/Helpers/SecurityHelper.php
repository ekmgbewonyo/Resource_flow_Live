<?php

namespace App\Helpers;

/**
 * Security helpers for input validation and sanitization.
 */
class SecurityHelper
{
    /** Max decoded image size in bytes (5MB) */
    private const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

    /** Max base64 string length (~7MB to avoid memory exhaustion before decode) */
    private const MAX_BASE64_LENGTH = 7 * 1024 * 1024;

    /** JPEG magic bytes */
    private const JPEG_SIGNATURE = "\xFF\xD8\xFF";

    /** PNG magic bytes */
    private const PNG_SIGNATURE = "\x89PNG\r\n\x1A\n";

    /**
     * Validate base64 image. Returns cleaned base64 string if valid, null otherwise.
     */
    public static function validateBase64Image(string $base64): ?string
    {
        $base64 = preg_replace('/^data:image\/\w+;base64,/', '', $base64);
        $base64 = preg_replace('/\s+/', '', $base64);

        if (strlen($base64) > self::MAX_BASE64_LENGTH || !preg_match('/^[a-zA-Z0-9+\/=]+$/', $base64)) {
            return null;
        }

        $decoded = base64_decode($base64, true);
        if ($decoded === false || strlen($decoded) > self::MAX_IMAGE_SIZE) {
            return null;
        }

        // Verify it's a valid image (JPEG or PNG)
        if (
            str_starts_with($decoded, self::JPEG_SIGNATURE) ||
            str_starts_with($decoded, self::PNG_SIGNATURE)
        ) {
            return $base64;
        }

        return null;
    }

    /**
     * Sanitize string for storage (strip HTML/script tags, limit length).
     */
    public static function sanitizeString(?string $value, int $maxLength = 255): string
    {
        if ($value === null || $value === '') {
            return '';
        }
        $stripped = strip_tags($value);
        $stripped = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $stripped);
        return mb_substr(trim($stripped), 0, $maxLength);
    }

    /**
     * Sanitize string for use in file paths (no path traversal, no special chars).
     */
    public static function sanitizePathComponent(?string $value, int $maxLength = 255): string
    {
        $sanitized = self::sanitizeString($value, $maxLength);
        $sanitized = preg_replace('/[\/\\\\\.\.]/', '', $sanitized);
        return preg_replace('/[^a-zA-Z0-9_-]/', '_', $sanitized) ?: 'unknown';
    }
}
