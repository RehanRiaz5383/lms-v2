<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class StudentDashboardController extends ApiController
{
    /**
     * Get student dashboard statistics.
     *
     * @return JsonResponse
     */
    public function stats(): JsonResponse
    {
        $user = auth()->user();
        $userId = $user->id;

        // Get user's batch IDs
        $userBatchIds = DB::table('user_batches')
            ->where('user_id', $userId)
            ->pluck('batch_id')
            ->toArray();

        // Tasks Statistics
        $totalTasks = 0;
        $submittedTasks = 0;
        $pendingTasks = 0;
        $taskCompletionRate = 0;

        try {
            // Check if tasks table exists and has required columns
            $tasksTableExists = DB::getSchemaBuilder()->hasTable('tasks');
            if ($tasksTableExists) {
                $tasksQuery = DB::table('tasks');
                
                // Check if batch_id column exists
                if (DB::getSchemaBuilder()->hasColumn('tasks', 'batch_id')) {
                    if (!empty($userBatchIds)) {
                        $tasksQuery->whereIn('batch_id', $userBatchIds)
                                   ->orWhereNull('batch_id');
                    } else {
                        $tasksQuery->whereNull('batch_id');
                    }
                } else if (DB::getSchemaBuilder()->hasColumn('tasks', 'user_id')) {
                    $tasksQuery->where('user_id', $userId);
                }
                
                $totalTasks = $tasksQuery->count();

                // Get submitted tasks
                if (DB::getSchemaBuilder()->hasTable('submitted_tasks')) {
                    $submittedTasks = DB::table('submitted_tasks')
                        ->where('user_id', $userId)
                        ->count();
                }

                $pendingTasks = max(0, $totalTasks - $submittedTasks);
                $taskCompletionRate = $totalTasks > 0 ? round(($submittedTasks / $totalTasks) * 100, 1) : 0;
            }
        } catch (\Exception $e) {
            // Table might not exist or have different structure
        }

        // Quizzes Statistics
        $totalQuizzes = 0;
        $completedQuizzes = 0;
        $pendingQuizzes = 0;
        $quizCompletionRate = 0;
        $averageQuizScore = 0;

        try {
            if (DB::getSchemaBuilder()->hasTable('quizzes')) {
                $quizzesQuery = DB::table('quizzes');
                
                if (DB::getSchemaBuilder()->hasColumn('quizzes', 'batch_id') && !empty($userBatchIds)) {
                    $quizzesQuery->whereIn('batch_id', $userBatchIds)
                                 ->orWhereNull('batch_id');
                } else if (DB::getSchemaBuilder()->hasColumn('quizzes', 'user_id')) {
                    $quizzesQuery->where('user_id', $userId);
                }
                
                $totalQuizzes = $quizzesQuery->count();

                if (DB::getSchemaBuilder()->hasTable('quiz_marks')) {
                    $completedQuizzes = DB::table('quiz_marks')
                        ->where('user_id', $userId)
                        ->count();
                    
                    $averageQuizScore = DB::table('quiz_marks')
                        ->where('user_id', $userId)
                        ->avg('marks') ?? 0;
                }

                $pendingQuizzes = max(0, $totalQuizzes - $completedQuizzes);
                $quizCompletionRate = $totalQuizzes > 0 ? round(($completedQuizzes / $totalQuizzes) * 100, 1) : 0;
            }
        } catch (\Exception $e) {
            // Table might not exist
        }

        // Tests Statistics
        $totalTests = 0;
        $completedTests = 0;
        $pendingTests = 0;
        $testCompletionRate = 0;
        $averageTestScore = 0;

        try {
            if (DB::getSchemaBuilder()->hasTable('student_tests')) {
                $testsQuery = DB::table('student_tests');
                
                if (DB::getSchemaBuilder()->hasColumn('student_tests', 'batch_id') && !empty($userBatchIds)) {
                    $testsQuery->whereIn('batch_id', $userBatchIds)
                               ->orWhereNull('batch_id');
                } else if (DB::getSchemaBuilder()->hasColumn('student_tests', 'user_id')) {
                    $testsQuery->where('user_id', $userId);
                }
                
                $totalTests = $testsQuery->count();

                if (DB::getSchemaBuilder()->hasTable('test_marks')) {
                    $completedTests = DB::table('test_marks')
                        ->where('user_id', $userId)
                        ->count();
                    
                    $averageTestScore = DB::table('test_marks')
                        ->where('user_id', $userId)
                        ->avg('marks') ?? 0;
                }

                $pendingTests = max(0, $totalTests - $completedTests);
                $testCompletionRate = $totalTests > 0 ? round(($completedTests / $totalTests) * 100, 1) : 0;
            }
        } catch (\Exception $e) {
            // Table might not exist
        }

        // Attendance Statistics
        $totalAttendance = 0;
        $presentDays = 0;
        $absentDays = 0;
        $attendanceRate = 0;

        try {
            if (DB::getSchemaBuilder()->hasTable('attendence')) {
                $totalAttendance = DB::table('attendence')
                    ->where('user_id', $userId)
                    ->count();

                // Try different column names for attendance status
                $presentQuery = DB::table('attendence')->where('user_id', $userId);
                if (DB::getSchemaBuilder()->hasColumn('attendence', 'status')) {
                    $presentDays = (clone $presentQuery)->where('status', 'present')->count() +
                                   (clone $presentQuery)->where('status', 1)->count();
                } else if (DB::getSchemaBuilder()->hasColumn('attendence', 'present')) {
                    $presentDays = (clone $presentQuery)->where('present', 1)->count();
                }

                $absentQuery = DB::table('attendence')->where('user_id', $userId);
                if (DB::getSchemaBuilder()->hasColumn('attendence', 'status')) {
                    $absentDays = (clone $absentQuery)->where('status', 'absent')->count() +
                                  (clone $absentQuery)->where('status', 0)->count();
                } else if (DB::getSchemaBuilder()->hasColumn('attendence', 'present')) {
                    $absentDays = (clone $absentQuery)->where('present', 0)->count();
                }

                $attendanceRate = $totalAttendance > 0 ? round(($presentDays / $totalAttendance) * 100, 1) : 0;
            }
        } catch (\Exception $e) {
            // Table might not exist
        }

        // Videos Statistics
        $userBatchIds = DB::table('user_batches')
            ->where('user_id', $userId)
            ->pluck('batch_id')
            ->toArray();

        $totalVideos = 0;
        if (!empty($userBatchIds)) {
            $totalVideos = DB::table('batch_subjects_video')
                ->whereIn('batch_id', $userBatchIds)
                ->join('videos', 'batch_subjects_video.video_id', '=', 'videos.id')
                ->whereNull('videos.deleted_at')
                ->count();
        }

        // Recent Activity
        $recentTasks = collect([]);
        $recentQuizzes = collect([]);

        try {
            if (DB::getSchemaBuilder()->hasTable('tasks')) {
                $tasksQuery = DB::table('tasks');
                
                if (DB::getSchemaBuilder()->hasColumn('tasks', 'batch_id') && !empty($userBatchIds)) {
                    $tasksQuery->whereIn('batch_id', $userBatchIds)
                               ->orWhereNull('batch_id');
                } else if (DB::getSchemaBuilder()->hasColumn('tasks', 'user_id')) {
                    $tasksQuery->where('user_id', $userId);
                }

                if (DB::getSchemaBuilder()->hasTable('submitted_tasks')) {
                    $recentTasks = $tasksQuery
                        ->leftJoin('submitted_tasks', function($join) use ($userId) {
                            $join->on('tasks.id', '=', 'submitted_tasks.task_id')
                                 ->where('submitted_tasks.user_id', '=', $userId);
                        })
                        ->select('tasks.*', DB::raw('CASE WHEN submitted_tasks.id IS NOT NULL THEN 1 ELSE 0 END as is_submitted'))
                        ->orderBy('tasks.created_at', 'desc')
                        ->limit(5)
                        ->get();
                } else {
                    $recentTasks = $tasksQuery
                        ->select('tasks.*', DB::raw('0 as is_submitted'))
                        ->orderBy('tasks.created_at', 'desc')
                        ->limit(5)
                        ->get();
                }
            }
        } catch (\Exception $e) {
            // Handle error
        }

        try {
            if (DB::getSchemaBuilder()->hasTable('quizzes')) {
                $quizzesQuery = DB::table('quizzes');
                
                if (DB::getSchemaBuilder()->hasColumn('quizzes', 'batch_id') && !empty($userBatchIds)) {
                    $quizzesQuery->whereIn('batch_id', $userBatchIds)
                                 ->orWhereNull('batch_id');
                } else if (DB::getSchemaBuilder()->hasColumn('quizzes', 'user_id')) {
                    $quizzesQuery->where('user_id', $userId);
                }

                if (DB::getSchemaBuilder()->hasTable('quiz_marks')) {
                    $recentQuizzes = $quizzesQuery
                        ->leftJoin('quiz_marks', function($join) use ($userId) {
                            $join->on('quizzes.id', '=', 'quiz_marks.quiz_id')
                                 ->where('quiz_marks.user_id', '=', $userId);
                        })
                        ->select('quizzes.*', DB::raw('CASE WHEN quiz_marks.id IS NOT NULL THEN 1 ELSE 0 END as is_completed'))
                        ->orderBy('quizzes.created_at', 'desc')
                        ->limit(5)
                        ->get();
                } else {
                    $recentQuizzes = $quizzesQuery
                        ->select('quizzes.*', DB::raw('0 as is_completed'))
                        ->orderBy('quizzes.created_at', 'desc')
                        ->limit(5)
                        ->get();
                }
            }
        } catch (\Exception $e) {
            // Handle error
        }

        // Overall Performance
        $overallAverage = 0;
        $scoreCount = 0;
        if ($averageQuizScore > 0) {
            $overallAverage += $averageQuizScore;
            $scoreCount++;
        }
        if ($averageTestScore > 0) {
            $overallAverage += $averageTestScore;
            $scoreCount++;
        }
        $overallAverage = $scoreCount > 0 ? round($overallAverage / $scoreCount, 1) : 0;

        $stats = [
            'tasks' => [
                'total' => $totalTasks,
                'submitted' => $submittedTasks,
                'pending' => $pendingTasks,
                'completion_rate' => $taskCompletionRate,
            ],
            'quizzes' => [
                'total' => $totalQuizzes,
                'completed' => $completedQuizzes,
                'pending' => $pendingQuizzes,
                'completion_rate' => $quizCompletionRate,
                'average_score' => round($averageQuizScore, 1),
            ],
            'tests' => [
                'total' => $totalTests,
                'completed' => $completedTests,
                'pending' => $pendingTests,
                'completion_rate' => $testCompletionRate,
                'average_score' => round($averageTestScore, 1),
            ],
            'attendance' => [
                'total_days' => $totalAttendance,
                'present_days' => $presentDays,
                'absent_days' => $absentDays,
                'attendance_rate' => $attendanceRate,
            ],
            'videos' => [
                'total' => $totalVideos,
            ],
            'performance' => [
                'overall_average' => $overallAverage,
                'quiz_average' => round($averageQuizScore, 1),
                'test_average' => round($averageTestScore, 1),
            ],
            'recent_activity' => [
                'tasks' => $recentTasks->map(function ($task) {
                    return [
                        'id' => $task->id,
                        'title' => $task->title ?? $task->name ?? 'Untitled Task',
                        'is_submitted' => (bool) $task->is_submitted,
                        'due_date' => $task->due_date ?? $task->deadline ?? null,
                        'created_at' => $task->created_at,
                    ];
                }),
                'quizzes' => $recentQuizzes->map(function ($quiz) {
                    return [
                        'id' => $quiz->id,
                        'title' => $quiz->title ?? $quiz->name ?? 'Untitled Quiz',
                        'is_completed' => (bool) $quiz->is_completed,
                        'created_at' => $quiz->created_at,
                    ];
                }),
            ],
        ];

        return $this->success($stats, 'Student dashboard statistics retrieved successfully');
    }
}

