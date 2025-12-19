<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Batch;
use App\Models\Subject;
use App\Models\Video;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends ApiController
{
    /**
     * Get dashboard statistics.
     *
     * @return JsonResponse
     */
    public function stats(): JsonResponse
    {
        $user = auth()->user();
        $isAdmin = $user->isAdmin();

        // Total counts
        $totalUsers = User::count();
        $activeUsers = User::where('block', 0)->count();
        $blockedUsers = User::where('block', 1)->count();
        $totalBatches = Batch::count();
        $activeBatches = Batch::where('active', true)->count();
        $totalSubjects = Subject::count();
        $activeSubjects = Subject::where('active', true)->count();
        $totalVideos = Video::count();
        $internalVideos = Video::where('source_type', 'internal')->count();
        $externalVideos = Video::where('source_type', 'external')->count();

        // User type breakdown
        $userTypes = DB::table('user_roles')
            ->join('user_types', 'user_roles.role_id', '=', 'user_types.id')
            ->select('user_types.title', DB::raw('COUNT(*) as count'))
            ->groupBy('user_types.id', 'user_types.title')
            ->get()
            ->map(function ($item) {
                return [
                    'type' => $item->title,
                    'count' => (int) $item->count,
                ];
            });

        // Recent registrations (last 30 days)
        $recentUsers = User::where('created_at', '>=', now()->subDays(30))->count();
        $previousMonthUsers = User::whereBetween('created_at', [
            now()->subDays(60),
            now()->subDays(30)
        ])->count();
        $userGrowth = $previousMonthUsers > 0 
            ? round((($recentUsers - $previousMonthUsers) / $previousMonthUsers) * 100, 1)
            : ($recentUsers > 0 ? 100 : 0);

        // Recent videos (last 30 days)
        $recentVideos = Video::where('created_at', '>=', now()->subDays(30))->count();
        $previousMonthVideos = Video::whereBetween('created_at', [
            now()->subDays(60),
            now()->subDays(30)
        ])->count();
        $videoGrowth = $previousMonthVideos > 0 
            ? round((($recentVideos - $previousMonthVideos) / $previousMonthVideos) * 100, 1)
            : ($recentVideos > 0 ? 100 : 0);

        // Recent batches (last 30 days)
        $recentBatches = Batch::where('created_at', '>=', now()->subDays(30))->count();
        $previousMonthBatches = Batch::whereBetween('created_at', [
            now()->subDays(60),
            now()->subDays(30)
        ])->count();
        $batchGrowth = $previousMonthBatches > 0 
            ? round((($recentBatches - $previousMonthBatches) / $previousMonthBatches) * 100, 1)
            : ($recentBatches > 0 ? 100 : 0);

        // Video assignments
        $totalVideoAssignments = DB::table('batch_subjects_video')->count();

        // Recent activity (last 10 users, batches, videos)
        $recentActivity = [
            'users' => User::orderBy('created_at', 'desc')->limit(5)->get(['id', 'name', 'email', 'created_at']),
            'batches' => Batch::orderBy('created_at', 'desc')->limit(5)->get(['id', 'title', 'active', 'created_at']),
            'videos' => Video::orderBy('created_at', 'desc')->limit(5)->get(['id', 'title', 'source_type', 'created_at']),
        ];

        $stats = [
            'overview' => [
                'total_users' => $totalUsers,
                'active_users' => $activeUsers,
                'blocked_users' => $blockedUsers,
                'total_batches' => $totalBatches,
                'active_batches' => $activeBatches,
                'total_subjects' => $totalSubjects,
                'active_subjects' => $activeSubjects,
                'total_videos' => $totalVideos,
                'internal_videos' => $internalVideos,
                'external_videos' => $externalVideos,
                'total_video_assignments' => $totalVideoAssignments,
            ],
            'growth' => [
                'users' => [
                    'recent' => $recentUsers,
                    'previous' => $previousMonthUsers,
                    'percentage' => $userGrowth,
                ],
                'videos' => [
                    'recent' => $recentVideos,
                    'previous' => $previousMonthVideos,
                    'percentage' => $videoGrowth,
                ],
                'batches' => [
                    'recent' => $recentBatches,
                    'previous' => $previousMonthBatches,
                    'percentage' => $batchGrowth,
                ],
            ],
            'user_types' => $userTypes,
            'recent_activity' => [
                'users' => $recentActivity['users']->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'created_at' => $user->created_at,
                    ];
                }),
                'batches' => $recentActivity['batches']->map(function ($batch) {
                    return [
                        'id' => $batch->id,
                        'title' => $batch->title,
                        'active' => $batch->active,
                        'created_at' => $batch->created_at,
                    ];
                }),
                'videos' => $recentActivity['videos']->map(function ($video) {
                    return [
                        'id' => $video->id,
                        'title' => $video->title,
                        'source_type' => $video->source_type,
                        'created_at' => $video->created_at,
                    ];
                }),
            ],
        ];

        return $this->success($stats, 'Dashboard statistics retrieved successfully');
    }

    /**
     * Get trending signup reasons.
     *
     * @param \Illuminate\Http\Request $request
     * @return JsonResponse
     */
    public function getTrendingSignupReasons(\Illuminate\Http\Request $request): JsonResponse
    {
        $filter = $request->input('filter', 'all_time');
        
        $query = User::whereNotNull('source')
            ->where('source', '!=', '')
            ->where('user_type', 2); // Only students

        // Apply date filter
        $now = now();
        switch ($filter) {
            case 'today':
                $query->whereDate('created_at', $now->toDateString());
                break;
            case 'yesterday':
                $query->whereDate('created_at', $now->copy()->subDay()->toDateString());
                break;
            case 'last_15_days':
                $query->where('created_at', '>=', $now->copy()->subDays(15)->startOfDay());
                break;
            case 'this_month':
                $query->whereMonth('created_at', $now->month)
                    ->whereYear('created_at', $now->year);
                break;
            case 'last_month':
                $query->whereMonth('created_at', $now->copy()->subMonth()->month)
                    ->whereYear('created_at', $now->copy()->subMonth()->year);
                break;
            case 'all_time':
            default:
                // No date filter
                break;
        }

        // Get all sources and count them
        $sources = $query->get()->pluck('source');
        
        // Process sources - split by common delimiters and normalize
        $sourceCounts = [];
        foreach ($sources as $source) {
            if (empty($source)) continue;
            
            // Normalize: trim, lowercase, and split by common delimiters
            $normalized = strtolower(trim($source));
            
            // Split by common delimiters (comma, semicolon, pipe, slash, backslash, hyphen, underscore)
            // Use # as delimiter to avoid conflicts with forward slash in the pattern
            // In PHP double-quoted string: \\\\ becomes \\ in regex, which matches a literal backslash
            $keywords = preg_split('#[,;|/\\\\\-_]+#', $normalized);
            
            foreach ($keywords as $keyword) {
                $keyword = trim($keyword);
                if (!empty($keyword) && strlen($keyword) > 1) {
                    // Further normalize: remove extra spaces
                    $keyword = preg_replace('/\s+/', ' ', $keyword);
                    if (!isset($sourceCounts[$keyword])) {
                        $sourceCounts[$keyword] = 0;
                    }
                    $sourceCounts[$keyword]++;
                }
            }
        }

        // Sort by count descending
        arsort($sourceCounts);

        // Format for response (limit to top 5)
        $trending = [];
        $count = 0;
        foreach ($sourceCounts as $keyword => $keywordCount) {
            if ($count >= 5) break;
            $trending[] = [
                'keyword' => ucwords($keyword),
                'count' => $keywordCount,
            ];
            $count++;
        }

        return $this->success([
            'trending' => $trending,
            'filter' => $filter,
            'total' => count($trending),
        ], 'Trending signup reasons retrieved successfully');
    }
}
