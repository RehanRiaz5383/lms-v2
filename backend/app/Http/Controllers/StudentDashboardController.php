<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use App\Models\Voucher;

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
        $nearestTaskDueDate = null;

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

                // Get submitted task IDs - use the same logic as StudentTaskController
                $submittedTaskIds = [];
                if (DB::getSchemaBuilder()->hasTable('submitted_tasks')) {
                    $hasStudentIdColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'student_id');
                    if ($hasStudentIdColumn) {
                        $submittedTaskIds = DB::table('submitted_tasks')
                            ->where('student_id', $userId)
                            ->pluck('task_id')
                            ->toArray();
                    } else if (DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'user_id')) {
                        $submittedTaskIds = DB::table('submitted_tasks')
                            ->where('user_id', $userId)
                            ->pluck('task_id')
                            ->toArray();
                    }
                }

                $submittedTasks = count($submittedTaskIds);

                // Calculate pending tasks (all tasks minus submitted)
                $pendingTasks = max(0, $totalTasks - $submittedTasks);

                // Get nearest task due date (earliest expiry_date for pending tasks that can still be submitted)
                $hasExpiryDateColumn = DB::getSchemaBuilder()->hasColumn('tasks', 'expiry_date');
                if ($hasExpiryDateColumn) {
                    $nearestTaskQuery = DB::table('tasks');
                    
                    if (DB::getSchemaBuilder()->hasColumn('tasks', 'batch_id')) {
                        if (!empty($userBatchIds)) {
                            // Only get tasks from student's assigned batches
                            $nearestTaskQuery->whereIn('batch_id', $userBatchIds);
                        } else {
                            // If no batches assigned, don't show any tasks
                            $nearestTaskQuery->whereRaw('1 = 0'); // Force no results
                        }
                    } else if (DB::getSchemaBuilder()->hasColumn('tasks', 'user_id')) {
                        $nearestTaskQuery->where('user_id', $userId);
                    }

                    // Exclude tasks that have already been submitted
                    if (!empty($submittedTaskIds)) {
                        $nearestTaskQuery->whereNotIn('id', $submittedTaskIds);
                    }
                    
                    // Get current date/time in Asia/Karachi timezone for comparison
                    $now = now()->setTimezone('Asia/Karachi');
                    $todayStart = $now->copy()->startOfDay();
                    
                    // Filter by expiry_date >= today (tasks that can still be submitted)
                    // Compare dates properly - expiry_date should be >= today (end of day)
                    $nearestTaskQuery->where(function($q) use ($todayStart) {
                        // Get expiry_date and compare with today's date
                        // If expiry_date is a date-only field, compare dates
                        // If expiry_date is datetime, compare with end of today
                        $q->whereRaw("DATE(expiry_date) >= ?", [$todayStart->format('Y-m-d')]);
                    });
                    
                    // Get nearest task due date (earliest expiry_date) for most recent pending task
                    $nearestTask = $nearestTaskQuery
                        ->orderBy('expiry_date', 'asc')
                        ->first();
                    
                    if ($nearestTask && isset($nearestTask->expiry_date)) {
                        // Verify the date is actually in the future (end of day)
                        try {
                            $expiryDate = \Carbon\Carbon::parse($nearestTask->expiry_date)->setTimezone('Asia/Karachi');
                            // Set to end of day for the expiry date
                            $expiryDateEndOfDay = $expiryDate->copy()->endOfDay();
                            
                            // Only use if the expiry date (end of day) is in the future
                            if ($expiryDateEndOfDay->isFuture()) {
                                $nearestTaskDueDate = $nearestTask->expiry_date;
                            }
                        } catch (\Exception $e) {
                            // Invalid date format, skip
                            \Log::warning('Invalid expiry_date format in dashboard: ' . $nearestTask->expiry_date);
                        }
                    }
                }
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

        // Vouchers Statistics
        $pendingVouchersCount = 0;
        $upcomingVoucher = null;
        
        try {
            if (DB::getSchemaBuilder()->hasTable('vouchers')) {
                // Count pending vouchers
                $pendingVouchersCount = Voucher::where('student_id', $userId)
                    ->where('status', 'pending')
                    ->count();

                // Get upcoming voucher (pending voucher with nearest due date)
                $upcomingVoucherQuery = Voucher::where('student_id', $userId)
                    ->where('status', 'pending')
                    ->where('due_date', '>=', now()->format('Y-m-d'))
                    ->orderBy('due_date', 'asc')
                    ->first();

                if ($upcomingVoucherQuery) {
                    $upcomingVoucher = [
                        'id' => $upcomingVoucherQuery->id,
                        'fee_amount' => $upcomingVoucherQuery->fee_amount,
                        'due_date' => $upcomingVoucherQuery->due_date,
                    ];
                }
            }
        } catch (\Exception $e) {
            // Table might not exist
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

        // Calculate Tasks Percentage (same logic as performance report)
        $taskPercentage = 0;
        $taskTotalMarksObtained = 0;
        $taskTotalMarksPossible = 0;
        
        try {
            if (DB::getSchemaBuilder()->hasTable('tasks') && DB::getSchemaBuilder()->hasTable('submitted_tasks')) {
                $tasksQuery = DB::table('tasks');
                if (DB::getSchemaBuilder()->hasColumn('tasks', 'batch_id')) {
                    if (!empty($userBatchIds)) {
                        $tasksQuery->whereIn('batch_id', $userBatchIds);
                    } else {
                        $tasksQuery->whereRaw('1 = 0');
                    }
                }
                
                $allTasks = $tasksQuery->get();
                
                $hasStudentIdColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'student_id');
                $submittedQuery = DB::table('submitted_tasks')
                    ->where($hasStudentIdColumn ? 'student_id' : 'user_id', $userId);
                $submittedTasks = $submittedQuery->get();
                
                $hasObtainedMarks = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'obtained_marks');
                $hasMarks = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'marks');
                $marksColumn = $hasObtainedMarks ? 'obtained_marks' : ($hasMarks ? 'marks' : null);
                
                $hasTaskTotalMarks = DB::getSchemaBuilder()->hasColumn('tasks', 'total_marks');
                $hasTaskMarks = DB::getSchemaBuilder()->hasColumn('tasks', 'marks');
                $taskMarksColumn = $hasTaskTotalMarks ? 'total_marks' : ($hasTaskMarks ? 'marks' : null);
                
                foreach ($allTasks as $task) {
                    $taskTotalMarks = 100;
                    if ($taskMarksColumn && isset($task->{$taskMarksColumn}) && $task->{$taskMarksColumn} > 0) {
                        $taskTotalMarks = (float) $task->{$taskMarksColumn};
                    }
                    
                    $submittedTask = $submittedTasks->firstWhere('task_id', $task->id);
                    $obtainedMarks = 0;
                    if ($submittedTask && $marksColumn) {
                        $obtainedMarks = isset($submittedTask->{$marksColumn}) ? (float) $submittedTask->{$marksColumn} : 0;
                    }
                    
                    $taskTotalMarksObtained += $obtainedMarks;
                    $taskTotalMarksPossible += $taskTotalMarks;
                }
                
                if ($taskTotalMarksPossible > 0) {
                    $taskPercentage = round(($taskTotalMarksObtained / $taskTotalMarksPossible) * 100, 2);
                }
            }
        } catch (\Exception $e) {
            \Log::warning('Error calculating task percentage in dashboard: ' . $e->getMessage());
        }
        
        // Calculate Quizzes Percentage
        $quizPercentage = 0;
        $quizTotalMarksObtained = 0;
        $quizTotalMarksPossible = 0;
        
        try {
            if (DB::getSchemaBuilder()->hasTable('quizzes') && DB::getSchemaBuilder()->hasTable('quiz_marks')) {
                $quizzesQuery = DB::table('quizzes');
                if (DB::getSchemaBuilder()->hasColumn('quizzes', 'batch_id')) {
                    if (!empty($userBatchIds)) {
                        $quizzesQuery->whereIn('batch_id', $userBatchIds);
                    } else {
                        $quizzesQuery->whereRaw('1 = 0');
                    }
                }
                
                $allQuizzes = $quizzesQuery->get();
                
                $hasStudentIdColumn = DB::getSchemaBuilder()->hasColumn('quiz_marks', 'student_id');
                $quizMarksQuery = DB::table('quiz_marks')
                    ->where($hasStudentIdColumn ? 'student_id' : 'user_id', $userId);
                $quizMarks = $quizMarksQuery->get();
                
                $hasObtainedMarksColumn = DB::getSchemaBuilder()->hasColumn('quiz_marks', 'obtained_marks');
                $hasMarksColumn = DB::getSchemaBuilder()->hasColumn('quiz_marks', 'marks');
                
                foreach ($allQuizzes as $quiz) {
                    $quizTotalMarks = 100;
                    if (DB::getSchemaBuilder()->hasColumn('quizzes', 'total_marks') && isset($quiz->total_marks) && $quiz->total_marks > 0) {
                        $quizTotalMarks = (float) $quiz->total_marks;
                    }
                    
                    $quizMark = $quizMarks->firstWhere('quiz_id', $quiz->id);
                    $obtainedMarks = 0;
                    if ($quizMark) {
                        if ($hasObtainedMarksColumn && isset($quizMark->obtained_marks)) {
                            $obtainedMarks = is_numeric($quizMark->obtained_marks) ? (float) $quizMark->obtained_marks : 0;
                        } else if ($hasMarksColumn && isset($quizMark->marks)) {
                            $obtainedMarks = (float) $quizMark->marks;
                        }
                    }
                    
                    $quizTotalMarksObtained += $obtainedMarks;
                    $quizTotalMarksPossible += $quizTotalMarks;
                }
                
                if ($quizTotalMarksPossible > 0) {
                    $quizPercentage = round(($quizTotalMarksObtained / $quizTotalMarksPossible) * 100, 2);
                }
            }
        } catch (\Exception $e) {
            \Log::warning('Error calculating quiz percentage in dashboard: ' . $e->getMessage());
        }
        
        // Calculate Class Participations Percentage
        $classParticipationPercentage = 0;
        $cpTotalMarksObtained = 0;
        $cpTotalMarksPossible = 0;
        
        try {
            if (DB::getSchemaBuilder()->hasTable('class_participations') && DB::getSchemaBuilder()->hasTable('class_participation_marks')) {
                $participationsQuery = DB::table('class_participations');
                if (DB::getSchemaBuilder()->hasColumn('class_participations', 'batch_id')) {
                    if (!empty($userBatchIds)) {
                        $participationsQuery->whereIn('batch_id', $userBatchIds);
                    } else {
                        $participationsQuery->whereRaw('1 = 0');
                    }
                }
                
                $allParticipations = $participationsQuery->get();
                
                $hasStudentIdColumn = DB::getSchemaBuilder()->hasColumn('class_participation_marks', 'student_id');
                $hasUserIdColumn = DB::getSchemaBuilder()->hasColumn('class_participation_marks', 'user_id');
                $participationMarksQuery = DB::table('class_participation_marks');
                if ($hasStudentIdColumn) {
                    $participationMarksQuery->where('student_id', $userId);
                } else if ($hasUserIdColumn) {
                    $participationMarksQuery->where('user_id', $userId);
                }
                
                $participationMarks = $participationMarksQuery->get()->keyBy('class_participation_id');
                
                foreach ($allParticipations as $participation) {
                    $totalMarks = (float)($participation->total_marks ?? 0);
                    
                    $mark = $participationMarks->get($participation->id);
                    $obtainedMarks = 0;
                    if ($mark && isset($mark->obtained_marks)) {
                        $obtainedMarks = (float)($mark->obtained_marks ?? 0);
                    }
                    
                    $cpTotalMarksObtained += $obtainedMarks;
                    $cpTotalMarksPossible += $totalMarks;
                }
                
                if ($cpTotalMarksPossible > 0) {
                    $classParticipationPercentage = round(($cpTotalMarksObtained / $cpTotalMarksPossible) * 100, 2);
                }
            }
        } catch (\Exception $e) {
            \Log::warning('Error calculating class participation percentage in dashboard: ' . $e->getMessage());
        }
        
        // Calculate Overall Performance
        // Simple average of three percentages: (task% + quiz% + class_participation%) / 3
        $percentages = [
            $taskPercentage,
            $quizPercentage,
            $classParticipationPercentage,
        ];
        
        $overallPercentage = count($percentages) > 0 
            ? round(array_sum($percentages) / count($percentages), 2) 
            : 0;
        
        // Ensure percentage doesn't exceed 100%
        $overallPercentage = min(100, max(0, $overallPercentage));
        
        // Determine Grade
        $grade = 'N/A';
        $remarks = '';
        
        if ($overallPercentage >= 90) {
            $grade = 'A+';
            $remarks = 'Excellent performance! Keep up the outstanding work.';
        } else if ($overallPercentage >= 85) {
            $grade = 'A';
            $remarks = 'Very good performance. Continue to maintain this level.';
        } else if ($overallPercentage >= 80) {
            $grade = 'B+';
            $remarks = 'Good performance. There is room for improvement.';
        } else if ($overallPercentage >= 75) {
            $grade = 'B';
            $remarks = 'Satisfactory performance. Focus on areas that need improvement.';
        } else if ($overallPercentage >= 70) {
            $grade = 'C+';
            $remarks = 'Average performance. More effort is needed to improve.';
        } else if ($overallPercentage >= 65) {
            $grade = 'C';
            $remarks = 'Below average performance. Significant improvement required.';
        } else if ($overallPercentage >= 60) {
            $grade = 'D';
            $remarks = 'Poor performance. Immediate attention and improvement needed.';
        } else {
            $grade = 'F';
            $remarks = 'Very poor performance. Urgent intervention required.';
        }

        $stats = [
            'tasks' => [
                'total' => $totalTasks,
                'submitted' => $submittedTasks,
                'pending' => $pendingTasks,
                'completion_rate' => $taskCompletionRate,
                'nearest_due_date' => $nearestTaskDueDate,
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
            'vouchers' => [
                'pending_count' => $pendingVouchersCount,
                'upcoming_voucher' => $upcomingVoucher,
            ],
            'performance' => [
                'overall_average' => $overallPercentage,
                'quiz_average' => round($averageQuizScore, 1),
                'test_average' => round($averageTestScore, 1),
                'grade' => $grade,
                'remarks' => $remarks,
                'breakdown' => [
                    'tasks' => [
                        'label' => 'Tasks',
                        'percentage' => $taskPercentage,
                    ],
                    'quizzes' => [
                        'label' => 'Quizzes',
                        'percentage' => $quizPercentage,
                    ],
                    'class_participations' => [
                        'label' => 'Class Participations',
                        'percentage' => $classParticipationPercentage,
                    ],
                    'calculation' => [
                        'formula' => "({$taskPercentage}% + {$quizPercentage}% + {$classParticipationPercentage}%) / 3",
                        'result' => $overallPercentage . '%',
                    ],
                ],
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

