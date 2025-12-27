<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StudentPerformanceController extends ApiController
{
    /**
     * Get student performance report.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        try {
            $currentUser = auth()->user();
            
            if (!$currentUser) {
                return $this->error('Unauthorized', 'You must be logged in to view performance reports', 401);
            }

            $student = User::with(['roles', 'userType'])->find($id);
            
            if (!$student) {
                return $this->notFound('Student not found');
            }

            // Check if user is a student
            $isStudent = false;
            if ($student->roles && $student->roles->count() > 0) {
                foreach ($student->roles as $role) {
                    if (strtolower($role->title ?? '') === 'student' || $role->id == 2) {
                        $isStudent = true;
                        break;
                    }
                }
            }
            if (!$isStudent) {
                // Check user_type directly
                if ($student->user_type == 2) {
                    $isStudent = true;
                } else if ($student->userType) {
                    $userTypeTitle = strtolower($student->userType->title ?? '');
                    if ($userTypeTitle === 'student') {
                        $isStudent = true;
                    }
                }
            }

            if (!$isStudent) {
                return $this->error('User is not a student', 'Invalid user type', 400);
            }

            // Authorization: Students can only view their own report, admins can view any
            $isAdmin = false;
            if ($currentUser->roles && $currentUser->roles->count() > 0) {
                foreach ($currentUser->roles as $role) {
                    if (strtolower($role->title ?? '') === 'admin' || $role->id == 1) {
                        $isAdmin = true;
                        break;
                    }
                }
            }
            if (!$isAdmin && ($currentUser->user_type == 1 || strtolower($currentUser->userType->title ?? '') === 'admin')) {
                $isAdmin = true;
            }

            // If not admin, user can only view their own report
            if (!$isAdmin && $currentUser->id != $id) {
                return $this->error('Forbidden', 'You do not have permission to view this performance report', 403);
            }

            $userId = $student->id;

            // Get user's batch IDs
            $userBatchIds = [];
            if (DB::getSchemaBuilder()->hasTable('user_batches')) {
                $hasUserIdColumn = DB::getSchemaBuilder()->hasColumn('user_batches', 'user_id');
                if ($hasUserIdColumn) {
                    $userBatchIds = DB::table('user_batches')
                        ->where('user_id', $userId)
                        ->pluck('batch_id')
                        ->toArray();
                } else if (DB::getSchemaBuilder()->hasColumn('user_batches', 'student_id')) {
                    $userBatchIds = DB::table('user_batches')
                        ->where('student_id', $userId)
                        ->pluck('batch_id')
                        ->toArray();
                }
            }

            // Tasks Statistics
            $tasksData = [
                'total' => 0,
                'submitted' => 0,
                'pending' => 0,
                'overdue' => 0,
                'completion_rate' => 0,
                'average_marks' => 0, // This will be percentage
                'total_marks_obtained' => 0,
                'total_marks_possible' => 0,
                'task_details' => [],
            ];

            try {
                if (DB::getSchemaBuilder()->hasTable('tasks')) {
                    $tasksQuery = DB::table('tasks');
                    
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
                    
                    // Get all tasks for this student
                    $allTasks = $tasksQuery->get();
                    $tasksData['total'] = $allTasks->count();
                    $taskDetails = [];

                    // Get submitted tasks
                    if (DB::getSchemaBuilder()->hasTable('submitted_tasks')) {
                        $hasStudentIdColumn = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'student_id');
                        $submittedQuery = DB::table('submitted_tasks')
                            ->where($hasStudentIdColumn ? 'student_id' : 'user_id', $userId);
                        
                        $submittedTasks = $submittedQuery->get();
                        $submittedTaskIds = $submittedTasks->pluck('task_id')->toArray();
                        $tasksData['submitted'] = count($submittedTaskIds);
                        $tasksData['pending'] = max(0, $tasksData['total'] - $tasksData['submitted']);

                        // Get marks columns
                        $hasObtainedMarks = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'obtained_marks');
                        $hasMarks = DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'marks');
                        $marksColumn = $hasObtainedMarks ? 'obtained_marks' : ($hasMarks ? 'marks' : null);
                        
                        // Check if tasks table has total_marks or marks column
                        $hasTaskTotalMarks = DB::getSchemaBuilder()->hasColumn('tasks', 'total_marks');
                        $hasTaskMarks = DB::getSchemaBuilder()->hasColumn('tasks', 'marks');
                        $taskMarksColumn = $hasTaskTotalMarks ? 'total_marks' : ($hasTaskMarks ? 'marks' : null);
                        
                        // Calculate total marks obtained and total possible marks
                        $totalMarksObtained = 0;
                        $totalMarksPossible = 0;
                        
                        // Build task details array
                        foreach ($allTasks as $task) {
                            $taskId = $task->id;
                            $submittedTask = $submittedTasks->firstWhere('task_id', $taskId);
                            
                            // Get task total marks (default to 100 if not specified)
                            $taskTotalMarks = 100;
                            if ($taskMarksColumn && isset($task->{$taskMarksColumn}) && $task->{$taskMarksColumn} > 0) {
                                $taskTotalMarks = (float) $task->{$taskMarksColumn};
                            }
                            
                            $obtainedMarks = null;
                            if ($submittedTask && $marksColumn) {
                                $obtainedMarks = isset($submittedTask->{$marksColumn}) ? (float) $submittedTask->{$marksColumn} : null;
                                if ($obtainedMarks !== null) {
                                    $totalMarksObtained += $obtainedMarks;
                                }
                            }
                            
                            // Add to total possible marks only if task is submitted
                            if ($submittedTask) {
                                $totalMarksPossible += $taskTotalMarks;
                            }
                            
                            $taskDetails[] = [
                                'id' => $taskId,
                                'title' => $task->title ?? $task->name ?? 'Untitled Task',
                                'total_marks' => $taskTotalMarks,
                                'obtained_marks' => $obtainedMarks,
                                'is_submitted' => $submittedTask !== null,
                                'is_graded' => $obtainedMarks !== null,
                            ];
                        }
                        
                        $tasksData['total_marks_obtained'] = $totalMarksObtained;
                        $tasksData['total_marks_possible'] = $totalMarksPossible;
                        
                        // Calculate percentage: (obtained / possible) * 100
                        if ($totalMarksPossible > 0) {
                            $tasksData['average_marks'] = round(($totalMarksObtained / $totalMarksPossible) * 100, 2);
                        } else {
                            $tasksData['average_marks'] = 0;
                        }

                        // Count overdue tasks
                        $now = now()->setTimezone('Asia/Karachi');
                        if (DB::getSchemaBuilder()->hasColumn('tasks', 'expiry_date')) {
                            $overdueTasks = collect($allTasks)
                                ->filter(function($task) use ($now, $submittedTaskIds) {
                                    if (in_array($task->id, $submittedTaskIds)) {
                                        return false; // Already submitted
                                    }
                                    if (isset($task->expiry_date) && $task->expiry_date) {
                                        return strtotime($task->expiry_date) < $now->timestamp;
                                    }
                                    return false;
                                })
                                ->count();
                            $tasksData['overdue'] = $overdueTasks;
                        }
                    } else {
                        $tasksData['pending'] = $tasksData['total'];
                        // Build task details without submissions
                        foreach ($allTasks as $task) {
                            $hasTaskTotalMarks = DB::getSchemaBuilder()->hasColumn('tasks', 'total_marks');
                            $hasTaskMarks = DB::getSchemaBuilder()->hasColumn('tasks', 'marks');
                            $taskMarksColumn = $hasTaskTotalMarks ? 'total_marks' : ($hasTaskMarks ? 'marks' : null);
                            
                            $taskTotalMarks = 100;
                            if ($taskMarksColumn && isset($task->{$taskMarksColumn}) && $task->{$taskMarksColumn} > 0) {
                                $taskTotalMarks = (float) $task->{$taskMarksColumn};
                            }
                            
                            $taskDetails[] = [
                                'id' => $task->id,
                                'title' => $task->title ?? $task->name ?? 'Untitled Task',
                                'total_marks' => $taskTotalMarks,
                                'obtained_marks' => null,
                                'is_submitted' => false,
                                'is_graded' => false,
                            ];
                        }
                    }
                    
                    $tasksData['task_details'] = $taskDetails;

                    $tasksData['completion_rate'] = $tasksData['total'] > 0 
                        ? round(($tasksData['submitted'] / $tasksData['total']) * 100, 2) 
                        : 0;
                }
            } catch (\Exception $e) {
                \Log::error('Error fetching tasks data: ' . $e->getMessage());
            }

            // Quizzes Statistics
            $quizzesData = [
                'total' => 0,
                'completed' => 0,
                'pending' => 0,
                'completion_rate' => 0,
                'average_marks' => 0, // This will be percentage
                'total_marks_obtained' => 0,
                'total_marks_possible' => 0,
                'quiz_details' => [],
            ];

            try {
                if (DB::getSchemaBuilder()->hasTable('quizzes')) {
                    $quizzesQuery = DB::table('quizzes');
                    
                    if (DB::getSchemaBuilder()->hasColumn('quizzes', 'batch_id') && !empty($userBatchIds)) {
                        $quizzesQuery->whereIn('batch_id', $userBatchIds)
                                     ->orWhereNull('batch_id');
                    } else if (DB::getSchemaBuilder()->hasColumn('quizzes', 'user_id')) {
                        $quizzesQuery->where('user_id', $userId);
                    }
                    
                    // Get all quizzes for this student
                    $allQuizzes = $quizzesQuery->get();
                    $quizzesData['total'] = $allQuizzes->count();
                    $quizDetails = [];

                    if (DB::getSchemaBuilder()->hasTable('quiz_marks')) {
                        // Check which column to use for student identification
                        $hasStudentIdColumn = DB::getSchemaBuilder()->hasColumn('quiz_marks', 'student_id');
                        $hasUserIdColumn = DB::getSchemaBuilder()->hasColumn('quiz_marks', 'user_id');
                        
                        $quizMarksQuery = DB::table('quiz_marks');
                        if ($hasStudentIdColumn) {
                            $quizMarksQuery->where('student_id', $userId);
                        } else if ($hasUserIdColumn) {
                            $quizMarksQuery->where('user_id', $userId);
                        }
                        
                        $quizMarks = $quizMarksQuery->get();
                        $quizMarkIds = $quizMarks->pluck('quiz_id')->toArray();
                        $quizzesData['completed'] = count($quizMarkIds);
                        $quizzesData['pending'] = max(0, $quizzesData['total'] - $quizzesData['completed']);
                        
                        // Calculate total marks obtained and total possible marks
                        $totalMarksObtained = 0;
                        $totalMarksPossible = 0;
                        
                        // Check if quiz_marks has obtained_marks column (varchar) or marks column
                        $hasObtainedMarksColumn = DB::getSchemaBuilder()->hasColumn('quiz_marks', 'obtained_marks');
                        $hasMarksColumn = DB::getSchemaBuilder()->hasColumn('quiz_marks', 'marks');
                        
                        // Build quiz details array
                        foreach ($allQuizzes as $quiz) {
                            $quizId = $quiz->id;
                            $quizMark = $quizMarks->firstWhere('quiz_id', $quizId);
                            
                            // Get quiz total marks from quizzes table
                            $quizTotalMarks = 100; // Default
                            if (DB::getSchemaBuilder()->hasColumn('quizzes', 'total_marks') && isset($quiz->total_marks) && $quiz->total_marks > 0) {
                                $quizTotalMarks = (float) $quiz->total_marks;
                            }
                            
                            $obtainedMarks = null;
                            if ($quizMark) {
                                if ($hasObtainedMarksColumn && isset($quizMark->obtained_marks)) {
                                    // obtained_marks is varchar, need to convert to float
                                    $obtainedMarks = is_numeric($quizMark->obtained_marks) ? (float) $quizMark->obtained_marks : null;
                                } else if ($hasMarksColumn && isset($quizMark->marks)) {
                                    $obtainedMarks = (float) $quizMark->marks;
                                }
                                
                                if ($obtainedMarks !== null) {
                                    $totalMarksObtained += $obtainedMarks;
                                }
                                $totalMarksPossible += $quizTotalMarks;
                            }
                            
                            $quizDetails[] = [
                                'id' => $quizId,
                                'title' => $quiz->title ?? $quiz->description ?? 'Quiz ' . $quizId,
                                'quiz_date' => $quiz->quiz_date ?? null,
                                'total_marks' => $quizTotalMarks,
                                'obtained_marks' => $obtainedMarks,
                                'is_completed' => $quizMark !== null,
                                'is_graded' => $obtainedMarks !== null,
                            ];
                        }
                        
                        $quizzesData['total_marks_obtained'] = $totalMarksObtained;
                        $quizzesData['total_marks_possible'] = $totalMarksPossible;
                        
                        // Calculate percentage: (obtained / possible) * 100
                        if ($totalMarksPossible > 0) {
                            $quizzesData['average_marks'] = round(($totalMarksObtained / $totalMarksPossible) * 100, 2);
                        } else {
                            $quizzesData['average_marks'] = 0;
                        }
                    } else {
                        $quizzesData['pending'] = $quizzesData['total'];
                        // Build quiz details without marks
                        foreach ($allQuizzes as $quiz) {
                            $quizTotalMarks = 100; // Default
                            if (DB::getSchemaBuilder()->hasColumn('quizzes', 'total_marks') && isset($quiz->total_marks) && $quiz->total_marks > 0) {
                                $quizTotalMarks = (float) $quiz->total_marks;
                            }
                            
                            $quizDetails[] = [
                                'id' => $quiz->id,
                                'title' => $quiz->title ?? $quiz->description ?? 'Quiz ' . $quiz->id,
                                'quiz_date' => $quiz->quiz_date ?? null,
                                'total_marks' => $quizTotalMarks,
                                'obtained_marks' => null,
                                'is_completed' => false,
                                'is_graded' => false,
                            ];
                        }
                    }
                    
                    $quizzesData['quiz_details'] = $quizDetails;

                    $quizzesData['completion_rate'] = $quizzesData['total'] > 0 
                        ? round(($quizzesData['completed'] / $quizzesData['total']) * 100, 2) 
                        : 0;
                }
            } catch (\Exception $e) {
                \Log::error('Error fetching quizzes data: ' . $e->getMessage());
            }

            // Attendance Statistics
            $attendanceData = [
                'total_days' => 0,
                'present_days' => 0,
                'absent_days' => 0,
                'attendance_rate' => 0,
            ];

            try {
                if (DB::getSchemaBuilder()->hasTable('attendence')) {
                    $attendanceQuery = DB::table('attendence')->where('user_id', $userId);
                    $attendanceData['total_days'] = $attendanceQuery->count();

                    if (DB::getSchemaBuilder()->hasColumn('attendence', 'status')) {
                        $attendanceData['present_days'] = (clone $attendanceQuery)
                            ->where(function($q) {
                                $q->where('status', 'present')
                                  ->orWhere('status', 1);
                            })
                            ->count();
                        
                        $attendanceData['absent_days'] = (clone $attendanceQuery)
                            ->where(function($q) {
                                $q->where('status', 'absent')
                                  ->orWhere('status', 0);
                            })
                            ->count();
                    } else if (DB::getSchemaBuilder()->hasColumn('attendence', 'present')) {
                        $attendanceData['present_days'] = (clone $attendanceQuery)
                            ->where('present', 1)
                            ->count();
                        
                        $attendanceData['absent_days'] = (clone $attendanceQuery)
                            ->where('present', 0)
                            ->count();
                    }

                    $attendanceData['attendance_rate'] = $attendanceData['total_days'] > 0 
                        ? round(($attendanceData['present_days'] / $attendanceData['total_days']) * 100, 2) 
                        : 0;
                }
            } catch (\Exception $e) {
                \Log::error('Error fetching attendance data: ' . $e->getMessage());
            }

            // Calculate Overall Performance
            // Use weighted average of percentages (each already a percentage 0-100)
            // Tasks weight: 40%, Quizzes weight: 30%, Attendance weight: 30%
            $overallScore = 0;
            $weightedTotal = 0;
            
            // Tasks weight: 40% - use average_marks (which is already a percentage)
            if ($tasksData['average_marks'] > 0) {
                $overallScore += $tasksData['average_marks'] * 0.4;
                $weightedTotal += 0.4;
            }
            
            // Quizzes weight: 30% - use average_marks (which is already a percentage)
            if ($quizzesData['average_marks'] > 0) {
                $overallScore += $quizzesData['average_marks'] * 0.3;
                $weightedTotal += 0.3;
            }
            
            // Attendance weight: 30% - use attendance_rate (which is already a percentage)
            if ($attendanceData['attendance_rate'] > 0) {
                $overallScore += $attendanceData['attendance_rate'] * 0.3;
                $weightedTotal += 0.3;
            }
            
            // Calculate weighted average
            $overallPercentage = $weightedTotal > 0 ? round($overallScore / $weightedTotal, 2) : 0;
            
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

            // Get student picture URL
            $pictureUrl = null;
            if ($student->picture) {
                $pictureUrl = url('/load-storage/' . $student->picture);
            }

            $report = [
                'student' => [
                    'id' => $student->id,
                    'name' => $student->name,
                    'email' => $student->email,
                    'contact_no' => $student->contact_no,
                    'picture_url' => $pictureUrl,
                ],
                'institute' => [
                    'name' => 'Tech Inn Solutions',
                    'email' => 'info@techinnsolutions.net',
                    'mobile' => 'info@techinnsolutions.net',
                ],
                'tasks' => $tasksData,
                'quizzes' => $quizzesData,
                'attendance' => $attendanceData,
                'overall_performance' => [
                    'percentage' => $overallPercentage,
                    'grade' => $grade,
                    'remarks' => $remarks,
                ],
                'generated_at' => now()->setTimezone('Asia/Karachi')->format('Y-m-d H:i:s'),
            ];

            return $this->success($report, 'Student performance report retrieved successfully');
        } catch (\Exception $e) {
            \Log::error('Error generating student performance report: ' . $e->getMessage(), [
                'exception' => $e,
                'student_id' => $id,
            ]);
            return $this->error($e->getMessage(), 'Failed to generate performance report', 500);
        }
    }
}

