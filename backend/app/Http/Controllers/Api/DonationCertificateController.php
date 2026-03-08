<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Donation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;

/**
 * Generate Certificate of Compliance (PDF) for completed donations.
 * Uses HTML view - user can print to PDF from browser.
 * To use server-side PDF: composer require barryvdh/laravel-dompdf
 */
class DonationCertificateController extends Controller
{
    public function __invoke(Request $request, Donation $donation)
    {
        $this->authorize('view', $donation);

        // Only completed/verified donations
        if (!in_array($donation->status, ['Verified', 'Allocated', 'Delivered'])) {
            return response()->json([
                'message' => 'Certificate can only be generated for verified or completed donations.',
            ], 422);
        }

        $user = $donation->user;
        $donorName = $donation->is_anonymous ? 'Anonymous' : ($user->name ?? 'Anonymous');
        $projectName = $donation->aidRequest?->title ?? 'General Donation';
        $amount = $donation->type === 'Monetary'
            ? (float) $donation->quantity
            : (float) ($donation->value ?? $donation->audited_price ?? $donation->quantity);
        $timestamp = $donation->updated_at ?? $donation->created_at;

        $html = $this->buildCertificateHtml($donorName, $projectName, $amount, $timestamp);

        // If DomPDF is available, return PDF
        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html)
                ->setPaper('a4', 'portrait');
            return $pdf->download("donation-certificate-{$donation->id}.pdf");
        }

        // Fallback: return HTML for browser print-to-PDF
        return Response::make($html, 200, [
            'Content-Type' => 'text/html; charset=utf-8',
            'Content-Disposition' => 'inline; filename="donation-certificate-' . $donation->id . '.html"',
        ]);
    }

    private function buildCertificateHtml(string $donorName, string $projectName, float $amount, $timestamp): string
    {
        $dateStr = $timestamp ? $timestamp->format('F j, Y \a\t g:i A') : now()->format('F j, Y');
        $amountStr = 'GH₵' . number_format($amount, 2);

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate of Compliance - ResourceFlow</title>
    <style>
        @page { margin: 1.5cm; }
        * { box-sizing: border-box; }
        body {
            font-family: 'Georgia', 'Times New Roman', serif;
            color: #1e293b;
            max-width: 210mm;
            margin: 0 auto;
            padding: 24px;
            background: #fff;
        }
        .certificate {
            border: 3px double #0d9488;
            padding: 32px 40px;
            position: relative;
            min-height: 400px;
        }
        .certificate::before {
            content: '';
            position: absolute;
            top: 12px; left: 12px; right: 12px; bottom: 12px;
            border: 1px solid #99f6e4;
            pointer-events: none;
        }
        .seal {
            position: absolute;
            top: 20px;
            right: 24px;
            width: 60px;
            height: 60px;
            border: 2px solid #0d9488;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            color: #0d9488;
            text-align: center;
            line-height: 1.2;
        }
        .header {
            text-align: center;
            margin-bottom: 28px;
        }
        .header h1 {
            font-size: 22px;
            font-weight: bold;
            color: #0d9488;
            margin: 0 0 4px 0;
            letter-spacing: 0.5px;
        }
        .header .subtitle {
            font-size: 12px;
            color: #64748b;
        }
        .content {
            line-height: 1.8;
            font-size: 14px;
        }
        .content p { margin: 12px 0; }
        .highlight {
            font-weight: bold;
            color: #0d9488;
        }
        .footer {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
            font-size: 11px;
            color: #64748b;
            text-align: center;
        }
        .compliance-text {
            font-style: italic;
            margin-top: 20px;
            padding: 12px 16px;
            background: #f0fdfa;
            border-left: 4px solid #0d9488;
        }
        @media print {
            body { padding: 0; }
            .certificate { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="seal">VERIFIED</div>
        <div class="header">
            <h1>CERTIFICATE OF COMPLIANCE</h1>
            <p class="subtitle">ResourceFlow - Charitable Donation Verification</p>
        </div>
        <div class="content">
            <p>This is to certify that</p>
            <p><span class="highlight">{$donorName}</span></p>
            <p>has made a charitable contribution to</p>
            <p><span class="highlight">{$projectName}</span></p>
            <p>in the amount of <span class="highlight">{$amountStr}</span></p>
            <p>on <span class="highlight">{$dateStr}</span></p>
            <div class="compliance-text">
                This contribution complies with the requirements for charitable deductions under the Income Tax Act (Ghana).
            </div>
        </div>
        <div class="footer">
            ResourceFlow &bull; Verified Donation Platform &bull; Ghana
        </div>
    </div>
</body>
</html>
HTML;
    }
}
