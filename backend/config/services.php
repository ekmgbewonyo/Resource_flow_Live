<?php

return [
    'paystack' => [
        'public_key' => env('PAYSTACK_PUBLIC_KEY'),
        'secret_key' => env('PAYSTACK_SECRET_KEY'),
    ],

    'qoreid' => [
        'client_id' => env('QOREID_CLIENT_ID'),
        'secret' => env('QOREID_SECRET'),
        'secret_key' => env('QOREID_SECRET_KEY'), // Legacy: direct Bearer token
        'workflow_id' => env('QOREID_WORKFLOW_ID'), // For image-based verification
        'verify_ssl' => filter_var(env('QOREID_VERIFY_SSL', true), FILTER_VALIDATE_BOOLEAN), // Set false only for local dev if CA bundle missing
        'cainfo' => env('QOREID_CAINFO', null), // Explicit CA bundle path; falls back to php.ini curl.cainfo
    ],
];
