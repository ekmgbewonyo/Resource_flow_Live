<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Seeds NGOs and their CSR projects for the Find NGOs page.
 */
class NGOSeeder extends Seeder
{
    private const PASSWORD = 'svc_r3f70w-J3TM3ga';

    public function run(): void
    {
        $auditor = User::where('role', 'auditor')->first();
        if (!$auditor) {
            $this->command->warn('Auditor not found. Run UserSeeder first.');
            return;
        }

        $ngos = [
            [
                'name' => 'Hope for Ghana Foundation',
                'email' => 'ngo1@resourceflow.com',
                'organization' => 'Hope for Ghana Foundation',
                'address' => 'Accra, Greater Accra Region',
                'phone' => '+233-24-1110001',
                'projects' => [
                    [
                        'title' => 'Clean Water Wells for Northern Communities',
                        'description' => 'Installing boreholes and water purification systems in 10 communities across the Northern Region. Over 5,000 families will gain access to clean drinking water.',
                        'sdg_goals' => [6, 3],
                        'budget' => 75000,
                        'status' => 'active',
                        'location' => 'Northern Region',
                    ],
                    [
                        'title' => 'School Feeding Program - Tamale',
                        'description' => 'Daily nutritious meals for 500 primary school children in underserved Tamale schools. Improves attendance and learning outcomes.',
                        'sdg_goals' => [2, 4],
                        'budget' => 45000,
                        'status' => 'active',
                        'location' => 'Tamale',
                    ],
                ],
            ],
            [
                'name' => 'Rural Health Initiative',
                'email' => 'ngo2@resourceflow.com',
                'organization' => 'Rural Health Initiative Ghana',
                'address' => 'Kumasi, Ashanti Region',
                'phone' => '+233-24-2220002',
                'projects' => [
                    [
                        'title' => 'Mobile Clinic - Ashanti Villages',
                        'description' => 'Equipping a mobile health unit to serve 15 remote villages. Provides basic healthcare, maternal support, and health education.',
                        'sdg_goals' => [3, 5],
                        'budget' => 120000,
                        'status' => 'active',
                        'location' => 'Ashanti Region',
                    ],
                    [
                        'title' => 'Malaria Prevention Kit Distribution',
                        'description' => 'Distributing insecticide-treated nets and malaria rapid test kits to 2,000 households in high-risk areas.',
                        'sdg_goals' => [3],
                        'budget' => 35000,
                        'status' => 'fully_funded',
                        'funded_amount' => 35000,
                        'location' => 'Bono Region',
                    ],
                ],
            ],
            [
                'name' => 'Youth Skills Academy',
                'email' => 'ngo3@resourceflow.com',
                'organization' => 'Youth Skills Academy Ghana',
                'address' => 'Takoradi, Western Region',
                'phone' => '+233-24-3330003',
                'projects' => [
                    [
                        'title' => 'Vocational Training - Carpentry & Masonry',
                        'description' => '6-month skills training for 100 youth. Includes tools, materials, and apprenticeship placement for sustainable livelihoods.',
                        'sdg_goals' => [4, 8],
                        'budget' => 55000,
                        'status' => 'active',
                        'location' => 'Western Region',
                    ],
                    [
                        'title' => 'Digital Literacy for Rural Youth',
                        'description' => 'Computer and smartphone training for 200 youth. Bridging the digital divide in underserved communities.',
                        'sdg_goals' => [4, 9],
                        'budget' => 40000,
                        'status' => 'completed',
                        'funded_amount' => 40000,
                        'location' => 'Central Region',
                    ],
                ],
            ],
            [
                'name' => 'Green Earth Ghana',
                'email' => 'ngo4@resourceflow.com',
                'organization' => 'Green Earth Ghana',
                'address' => 'Accra, Greater Accra',
                'phone' => '+233-24-4440004',
                'projects' => [
                    [
                        'title' => 'Reforestation - Volta Basin',
                        'description' => 'Planting 10,000 trees along the Volta River. Community-led nurseries and environmental education for 500 households.',
                        'sdg_goals' => [13, 15],
                        'budget' => 65000,
                        'status' => 'active',
                        'location' => 'Volta Region',
                    ],
                ],
            ],
            [
                'name' => 'Women in Business Network',
                'email' => 'ngo5@resourceflow.com',
                'organization' => 'Women in Business Network',
                'address' => 'Accra & Kumasi',
                'phone' => '+233-24-5550005',
                'projects' => [
                    [
                        'title' => 'Microfinance for Women Entrepreneurs',
                        'description' => 'Seed capital and business training for 150 women. Focus on agribusiness, retail, and crafts.',
                        'sdg_goals' => [5, 8, 10],
                        'budget' => 85000,
                        'status' => 'active',
                        'location' => 'Multiple Regions',
                    ],
                    [
                        'title' => 'Childcare Support for Working Mothers',
                        'description' => 'Establishing 3 community childcare centers. Enables 200 women to pursue income-generating activities.',
                        'sdg_goals' => [5, 8],
                        'budget' => 60000,
                        'status' => 'active',
                        'location' => 'Greater Accra',
                    ],
                ],
            ],
        ];

        foreach ($ngos as $ngoData) {
            $ngo = User::updateOrCreate(
                ['email' => $ngoData['email']],
                [
                    'name' => $ngoData['name'],
                    'email' => $ngoData['email'],
                    'password' => Hash::make(self::PASSWORD),
                    'password_changed_at' => now(),
                    'role' => 'ngo',
                    'organization' => $ngoData['organization'],
                    'address' => $ngoData['address'],
                    'phone' => $ngoData['phone'],
                    'is_active' => true,
                    'is_verified' => true,
                    'verified_at' => now(),
                    'reputation_score' => rand(50, 95),
                ]
            );

            $org = Organization::updateOrCreate(
                ['user_id' => $ngo->id],
                [
                    'user_id' => $ngo->id,
                    'name' => $ngoData['organization'],
                    'registration_number' => 'RG-' . strtoupper(Str::random(8)),
                    'verification_tier' => 'tier_2',
                ]
            );

            foreach ($ngoData['projects'] as $projData) {
                $slug = Str::slug($projData['title']) . '-' . substr(uniqid(), -6);
                $budget = $projData['budget'];
                $fundedAmount = $projData['funded_amount'] ?? 0;

                Project::updateOrCreate(
                    [
                        'ngo_id' => $ngo->id,
                        'title' => $projData['title'],
                    ],
                    [
                        'ngo_id' => $ngo->id,
                        'organization_id' => $org->id,
                        'title' => $projData['title'],
                        'slug' => $slug,
                        'description' => $projData['description'],
                        'need_type' => 'funding',
                        'sdg_goals' => $projData['sdg_goals'],
                        'budget' => $budget,
                        'target_amount' => $budget,
                        'funded_amount' => $fundedAmount,
                        'raised_amount' => $fundedAmount,
                        'location' => $projData['location'],
                        'status' => $projData['status'],
                        'is_verified' => true,
                        'verified_by' => $auditor->id,
                        'verified_at' => now(),
                        'start_date' => now()->subMonths(rand(1, 6)),
                        'end_date' => now()->addMonths(rand(6, 12)),
                        'impact_metrics' => $projData['status'] === 'completed' ? ['lives_impacted' => rand(150, 300)] : null,
                    ]
                );
            }
        }

        $this->command->info('Seeded ' . count($ngos) . ' NGOs with projects. Login: ngo1@resourceflow.com (password: ' . self::PASSWORD . ')');
    }
}
