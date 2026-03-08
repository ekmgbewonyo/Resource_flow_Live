<?php

namespace App\Http\Requests;

use App\Models\Organization;
use App\Models\ProjectBudget;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreProjectRequest extends FormRequest
{
    public const LARGE_PROJECT_THRESHOLD = 5000;
    public const ADMIN_CAP_PERCENT = 0.15;

    public function authorize(): bool
    {
        return $this->user()?->canCreateProjects() ?? false;
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'location' => 'nullable|string|max:255',
            'location_gps' => 'nullable|string|max:255',
            'cover_photo_path' => 'nullable|string|max:500',
            'need_type' => 'nullable|in:funding,items,both',
            'sdg_goals' => 'nullable|array',
            'sdg_goals.*' => 'integer|min:1|max:17',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'budgets' => 'required|array|min:1',
            'budgets.*.category' => 'required|in:material,transportation,admin,labor',
            'budgets.*.item_name' => 'required|string|max:255',
            'budgets.*.quantity' => 'required|numeric|min:0.01',
            'budgets.*.unit_cost' => 'required|numeric|min:0',
            'proof_documents' => 'nullable|array',
            'proof_documents.*' => 'string|max:500',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $budgets = $this->input('budgets', []);
            if (empty($budgets)) {
                return;
            }

            $targetAmount = 0;
            $adminTotal = 0;
            $hasMaterialOrTransport = false;

            foreach ($budgets as $i => $b) {
                $total = (float) ($b['quantity'] ?? 0) * (float) ($b['unit_cost'] ?? 0);
                $targetAmount += $total;

                $cat = $b['category'] ?? '';
                if ($cat === 'admin') {
                    $adminTotal += $total;
                }
                if (in_array($cat, ['material', 'transportation'])) {
                    $hasMaterialOrTransport = true;
                }
            }

            // Rule: At least one material or transportation item
            if (!$hasMaterialOrTransport) {
                $validator->errors()->add(
                    'budgets',
                    'Project must have at least one material or transportation budget item.'
                );
            }

            // Rule: Admin cap 15%
            if ($targetAmount > 0 && $adminTotal > $targetAmount * self::ADMIN_CAP_PERCENT) {
                $validator->errors()->add(
                    'budgets',
                    sprintf(
                        'Admin/overhead items cannot exceed 15%% of total budget. Current: %.1f%%. Max admin: GH₵%s.',
                        ($adminTotal / $targetAmount) * 100,
                        number_format($targetAmount * self::ADMIN_CAP_PERCENT, 2)
                    )
                );
            }

            // Rule: Tier verification for projects > GHS 5,000
            if ($targetAmount > self::LARGE_PROJECT_THRESHOLD) {
                $org = $this->user()?->organization;
                if (!$org) {
                    $validator->errors()->add(
                        'budgets',
                        'Create your organization profile first. Projects over GH₵5,000 require Tier 2 or Tier 3 verification.'
                    );
                } elseif (!$org->canPublishLargeProject($targetAmount)) {
                    $validator->errors()->add(
                        'budgets',
                        'Projects over GH₵5,000 require Tier 2 or Tier 3 verification. Upload your Registration (RG) to upgrade.'
                    );
                }
            }
        });
    }
}
