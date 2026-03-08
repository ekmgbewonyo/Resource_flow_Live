<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CSRPartnership;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MatchmakingController extends Controller
{
    /**
     * Get all NGOs for donors - list with projects, completion rate, and impact.
     * Accessible by donor_institution, donor_individual, angel_donor.
     */
    public function getNGOs(Request $request): JsonResponse
    {
        $user = Auth::user();
        if (!$user->isDonor() && !$user->isAngelDonor()) {
            return response()->json(['message' => 'Only donors can access this page.'], 403);
        }

        $query = User::where('role', 'ngo')
            ->where('is_active', true)
            ->with(['organization', 'projects' => function ($q) {
                $q->whereIn('status', ['active', 'fully_funded', 'completed'])
                  ->withCount('impactProofs');
            }]);

        if ($request->filled('region')) {
            $query->where('address', 'like', "%{$request->region}%");
        }
        if ($request->filled('sdg')) {
            $sdg = (int) $request->sdg;
            $query->whereHas('projects', function ($q) use ($sdg) {
                $q->whereJsonContains('sdg_goals', $sdg);
            });
        }

        $ngos = $query->get();

        $result = $ngos->map(function ($ngo) {
            $projects = $ngo->projects;
            $totalProjects = $projects->count();
            $completedProjects = $projects->where('status', 'completed')->count();
            $completionRate = $totalProjects > 0
                ? round(($completedProjects / $totalProjects) * 100, 1)
                : 0;

            // Aggregate impact from projects and partnerships
            $totalLivesImpacted = 0;
            $partnerships = CSRPartnership::where('ngo_id', $ngo->id)
                ->with('project')
                ->get();
            foreach ($partnerships as $p) {
                if ($p->impact_report && isset($p->impact_report['lives_impacted'])) {
                    $totalLivesImpacted += (int) $p->impact_report['lives_impacted'];
                }
            }
            foreach ($projects as $p) {
                if ($p->impact_metrics && isset($p->impact_metrics['lives_impacted'])) {
                    $totalLivesImpacted += (int) $p->impact_metrics['lives_impacted'];
                }
            }

            $projectsSummary = $projects->map(function ($p) {
                return [
                    'id' => $p->id,
                    'title' => $p->title,
                    'description' => \Illuminate\Support\Str::limit($p->description, 120),
                    'status' => $p->status,
                    'sdg_goals' => $p->sdg_goals ?? [],
                    'target_amount' => (float) ($p->target_amount ?? $p->budget ?? 0),
                    'funded_amount' => (float) ($p->raised_amount ?? $p->funded_amount ?? 0),
                    'funding_progress' => $p->funding_progress ?? 0,
                    'impact_proofs_count' => $p->impact_proofs_count ?? 0,
                ];
            })->values();

            return [
                'id' => $ngo->id,
                'name' => $ngo->name,
                'organization' => $ngo->organization?->name ?? $ngo->organization,
                'email' => $ngo->email,
                'phone' => $ngo->phone,
                'address' => $ngo->address,
                'verification_tier' => $ngo->organization?->verification_tier ?? null,
                'reputation_score' => $ngo->reputation_score ?? 0,
                'completion_rate' => $completionRate,
                'total_projects' => $totalProjects,
                'completed_projects' => $completedProjects,
                'total_lives_impacted' => $totalLivesImpacted,
                'projects' => $projectsSummary,
            ];
        });

        // Sort by completion rate (desc), then reputation, then total lives impacted
        $sorted = $result->sortByDesc(function ($n) {
            return ($n['completion_rate'] * 10) + ($n['reputation_score'] / 10) + $n['total_lives_impacted'];
        })->values();

        return response()->json(['ngos' => $sorted]);
    }

    /**
     * Get matched NGOs for a Corporate user based on SDG goals and location
     */
    public function getMatches(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user->isDonorInstitution()) {
            return response()->json([
                'message' => 'Only donor institutions can access matchmaking',
            ], 403);
        }

        $corporateSDGs = $request->input('sdg_goals', []); // Array of SDG numbers
        $location = $request->input('location'); // Optional location filter
        $limit = $request->input('limit', 10);

        // Get verified NGOs with projects
        $query = User::where('role', 'ngo')
            ->where('is_verified', true)
            ->where('is_active', true)
            ->with(['projects' => function ($q) {
                $q->where('status', 'active')
                  ->where('is_verified', true);
            }]);

        // Filter by location if provided
        if ($location) {
            $query->where('address', 'like', "%{$location}%");
        }

        $ngos = $query->get();

        // Score and rank NGOs based on SDG match
        $scoredNGOs = $ngos->map(function ($ngo) use ($corporateSDGs) {
            $score = 0;
            $matchedSDGs = [];

            foreach ($ngo->projects as $project) {
                if ($project->sdg_goals && is_array($project->sdg_goals)) {
                    $commonSDGs = array_intersect($corporateSDGs, $project->sdg_goals);
                    $score += count($commonSDGs) * 10; // 10 points per matching SDG
                    $matchedSDGs = array_merge($matchedSDGs, $commonSDGs);
                }
            }

            // Bonus points for reputation
            $score += $ngo->reputation_score ?? 0;

            return [
                'ngo' => $ngo,
                'match_score' => $score,
                'matched_sdg_goals' => array_unique($matchedSDGs),
                'active_projects_count' => $ngo->projects->count(),
            ];
        })
        ->sortByDesc('match_score')
        ->take($limit)
        ->values();

        return response()->json([
            'matches' => $scoredNGOs->map(function ($item) {
                return [
                    'id' => $item['ngo']->id,
                    'name' => $item['ngo']->name,
                    'organization' => $item['ngo']->organization,
                    'location' => $item['ngo']->address,
                    'reputation_score' => $item['ngo']->reputation_score ?? 0,
                    'match_score' => $item['match_score'],
                    'matched_sdg_goals' => $item['matched_sdg_goals'],
                    'active_projects_count' => $item['active_projects_count'],
                    'projects' => $item['ngo']->projects->map(function ($project) {
                        return [
                            'id' => $project->id,
                            'title' => $project->title,
                            'sdg_goals' => $project->sdg_goals,
                            'budget' => $project->budget,
                            'funded_amount' => $project->funded_amount,
                            'funding_progress' => $project->funding_progress,
                        ];
                    }),
                ];
            }),
        ]);
    }

    /**
     * Get match suggestions for a specific project
     */
    public function getProjectMatches(Request $request, $projectId): JsonResponse
    {
        $project = Project::with('ngo')->findOrFail($projectId);
        $user = Auth::user();

        if (!$user->isDonorInstitution()) {
            return response()->json([
                'message' => 'Only donor institutions can access matchmaking',
            ], 403);
        }

        // Get corporates that match this project's SDG goals
        $projectSDGs = $project->sdg_goals ?? [];
        
        // For now, return all active corporates (can be enhanced with corporate SDG preferences)
        $corporates = User::where('role', 'donor_institution')
            ->where('is_active', true)
            ->get();

        return response()->json([
            'project' => [
                'id' => $project->id,
                'title' => $project->title,
                'sdg_goals' => $projectSDGs,
            ],
            'suggested_corporates' => $corporates->map(function ($corporate) {
                return [
                    'id' => $corporate->id,
                    'name' => $corporate->name,
                    'organization' => $corporate->organization,
                ];
            }),
        ]);
    }
}
