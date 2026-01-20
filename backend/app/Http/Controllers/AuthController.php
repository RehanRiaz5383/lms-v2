<?php

namespace App\Http\Controllers;

use App\Events\StudentLogin;
use App\Events\StudentLogout;
use App\Events\StudentRegistered;
use App\Models\CloudflareTurnstileSettings;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class AuthController extends ApiController
{
    /**
     * Handle user login.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function login(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required|string',
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors(), 'Validation failed');
        }

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return $this->unauthorized('Invalid credentials', [
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Revoke all existing tokens for this user (optional - for single device login)
        // $user->tokens()->delete();

        // Create a new token for the user
        $token = $user->createToken('auth-token')->plainTextToken;

        // Load user type and roles relationships
        $user->load('userType', 'roles');

        // Dispatch event for all user types (only once)
        event(new StudentLogin($user));

        // Add picture URL if available
        $pictureUrl = null;
        if ($user->picture) {
            $pictureUrl = url('/load-storage/' . $user->picture);
        }

        return $this->success([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'user_type' => $user->user_type,
                'user_type_title' => $user->userType?->title ?? null,
                'picture' => $user->picture,
                'picture_url' => $pictureUrl,
                'block' => $user->block ?? 0,
                'block_reason' => $user->block_reason,
                'roles' => $user->roles->map(function($role) {
                    return [
                        'id' => $role->id,
                        'title' => $role->title,
                    ];
                }),
            ],
            'token' => $token,
        ], 'Login successful');
    }

    /**
     * Handle user logout.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load('roles');
        
        // Dispatch event for all user types (only once)
        event(new StudentLogout($user));

        // Revoke the current access token
        $user->currentAccessToken()->delete();

        return $this->success(null, 'Logout successful');
    }

    /**
     * Get the authenticated user.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load('userType', 'roles');

        // Add picture URL if available
        $pictureUrl = null;
        if ($user->picture) {
            $pictureUrl = url('/load-storage/' . $user->picture);
        }

        return $this->success([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'user_type' => $user->user_type,
            'user_type_title' => $user->userType?->title ?? null,
            'picture' => $user->picture,
            'picture_url' => $pictureUrl,
            'block' => $user->block ?? 0,
            'block_reason' => $user->block_reason,
            'roles' => $user->roles->map(function($role) {
                return [
                    'id' => $role->id,
                    'title' => $role->title,
                ];
            }),
        ], 'User retrieved successfully');
    }

    /**
     * Get upcoming activities for a student (tasks, quizzes, class participations).
     *
     * @param User $user
     * @return array
     */
    private function getUpcomingActivities($user): array
    {
        $userId = $user->id;
        $now = now()->setTimezone('Asia/Karachi');
        $todayStart = $now->copy()->startOfDay();

        // Get user's batch IDs
        $userBatchIds = [];
        if (\Illuminate\Support\Facades\DB::getSchemaBuilder()->hasColumn('user_batches', 'user_id')) {
            $userBatchIds = \Illuminate\Support\Facades\DB::table('user_batches')
                ->where('user_id', $userId)
                ->pluck('batch_id')
                ->toArray();
        } else if (\Illuminate\Support\Facades\DB::getSchemaBuilder()->hasColumn('user_batches', 'student_id')) {
            $userBatchIds = \Illuminate\Support\Facades\DB::table('user_batches')
                ->where('student_id', $userId)
                ->pluck('batch_id')
                ->toArray();
        }

        $upcomingTasks = [];
        $upcomingQuizzes = [];
        $upcomingCPs = [];

        // Initialize arrays to ensure they're always returned
        if (empty($userBatchIds)) {
            return [
                'tasks' => [],
                'quizzes' => [],
                'class_participations' => [],
            ];
        }

        try {
            // Get upcoming tasks
            if (\Illuminate\Support\Facades\DB::getSchemaBuilder()->hasTable('tasks')) {
                $submittedTaskIds = [];
                if (\Illuminate\Support\Facades\DB::getSchemaBuilder()->hasTable('submitted_tasks')) {
                    $hasStudentIdColumn = \Illuminate\Support\Facades\DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'student_id');
                    if ($hasStudentIdColumn) {
                        $submittedTaskIds = \Illuminate\Support\Facades\DB::table('submitted_tasks')
                            ->where('student_id', $userId)
                            ->pluck('task_id')
                            ->toArray();
                    } else if (\Illuminate\Support\Facades\DB::getSchemaBuilder()->hasColumn('submitted_tasks', 'user_id')) {
                        $submittedTaskIds = \Illuminate\Support\Facades\DB::table('submitted_tasks')
                            ->where('user_id', $userId)
                            ->pluck('task_id')
                            ->toArray();
                    }
                }

                $tasksQuery = \Illuminate\Support\Facades\DB::table('tasks');
                
                if (!empty($userBatchIds)) {
                    if (\Illuminate\Support\Facades\DB::getSchemaBuilder()->hasColumn('tasks', 'batch_id')) {
                        $tasksQuery->whereIn('batch_id', $userBatchIds);
                    } else if (\Illuminate\Support\Facades\DB::getSchemaBuilder()->hasColumn('tasks', 'user_id')) {
                        $tasksQuery->where('user_id', $userId);
                    }
                } else {
                    if (\Illuminate\Support\Facades\DB::getSchemaBuilder()->hasColumn('tasks', 'user_id')) {
                        $tasksQuery->where('user_id', $userId);
                    } else {
                        $tasksQuery->whereRaw('1 = 0'); // No batches, no tasks
                    }
                }

                if (!empty($submittedTaskIds)) {
                    $tasksQuery->whereNotIn('id', $submittedTaskIds);
                }

                if (\Illuminate\Support\Facades\DB::getSchemaBuilder()->hasColumn('tasks', 'expiry_date')) {
                    $tasksQuery->whereRaw("DATE(expiry_date) >= ?", [$todayStart->format('Y-m-d')])
                               ->orderBy('expiry_date', 'asc')
                               ->limit(5);
                }

                $upcomingTasks = $tasksQuery->get()->map(function($task) {
                    $batch = null;
                    if ($task->batch_id) {
                        $batchData = \Illuminate\Support\Facades\DB::table('batches')
                            ->where('id', $task->batch_id)
                            ->first();
                        $batch = $batchData ? ['id' => $task->batch_id, 'title' => $batchData->title ?? null] : null;
                    }
                    return [
                        'id' => $task->id,
                        'title' => $task->title ?? $task->name ?? 'Untitled Task',
                        'expiry_date' => $task->expiry_date ?? null,
                        'batch' => $batch,
                    ];
                })->toArray();
            }

            // Get upcoming quizzes
            if (\Illuminate\Support\Facades\DB::getSchemaBuilder()->hasTable('quizzes') && !empty($userBatchIds)) {
                $quizzesQuery = \Illuminate\Support\Facades\DB::table('quizzes')
                    ->whereIn('batch_id', $userBatchIds);

                if (\Illuminate\Support\Facades\DB::getSchemaBuilder()->hasColumn('quizzes', 'quiz_date')) {
                    $quizzesQuery->whereRaw("DATE(quiz_date) >= ?", [$todayStart->format('Y-m-d')])
                                  ->orderBy('quiz_date', 'asc')
                                  ->limit(5);
                }

                // Exclude completed quizzes
                if (\Illuminate\Support\Facades\DB::getSchemaBuilder()->hasTable('quiz_marks')) {
                    $completedQuizIds = \Illuminate\Support\Facades\DB::table('quiz_marks')
                        ->where('user_id', $userId)
                        ->pluck('quiz_id')
                        ->toArray();
                    if (!empty($completedQuizIds)) {
                        $quizzesQuery->whereNotIn('id', $completedQuizIds);
                    }
                }

                $upcomingQuizzes = $quizzesQuery->get()->map(function($quiz) {
                    $batch = null;
                    if ($quiz->batch_id) {
                        $batchData = \Illuminate\Support\Facades\DB::table('batches')
                            ->where('id', $quiz->batch_id)
                            ->first();
                        $batch = $batchData ? ['id' => $quiz->batch_id, 'title' => $batchData->title ?? null] : null;
                    }
                    return [
                        'id' => $quiz->id,
                        'title' => $quiz->title ?? $quiz->name ?? 'Untitled Quiz',
                        'quiz_date' => $quiz->quiz_date ?? null,
                        'batch' => $batch,
                    ];
                })->toArray();
            }

            // Get upcoming class participations
            if (\Illuminate\Support\Facades\DB::getSchemaBuilder()->hasTable('class_participations') && !empty($userBatchIds)) {
                $cpsQuery = \Illuminate\Support\Facades\DB::table('class_participations')
                    ->whereIn('batch_id', $userBatchIds);

                // Exclude completed participations first
                if (\Illuminate\Support\Facades\DB::getSchemaBuilder()->hasTable('class_participation_marks')) {
                    $hasStudentIdColumn = \Illuminate\Support\Facades\DB::getSchemaBuilder()->hasColumn('class_participation_marks', 'student_id');
                    $hasUserIdColumn = \Illuminate\Support\Facades\DB::getSchemaBuilder()->hasColumn('class_participation_marks', 'user_id');
                    
                    $completedCPQuery = \Illuminate\Support\Facades\DB::table('class_participation_marks');
                    if ($hasStudentIdColumn) {
                        $completedCPQuery->where('student_id', $userId);
                    } else if ($hasUserIdColumn) {
                        $completedCPQuery->where('user_id', $userId);
                    }
                    
                    $completedCPIds = $completedCPQuery->pluck('class_participation_id')->toArray();
                    if (!empty($completedCPIds)) {
                        $cpsQuery->whereNotIn('id', $completedCPIds);
                    }
                }

                // Apply date filter if column exists
                $hasParticipationDateColumn = \Illuminate\Support\Facades\DB::getSchemaBuilder()->hasColumn('class_participations', 'participation_date');
                if ($hasParticipationDateColumn) {
                    $cpsQuery->whereRaw("DATE(participation_date) >= ?", [$todayStart->format('Y-m-d')])
                              ->orderBy('participation_date', 'asc');
                } else {
                    $cpsQuery->orderBy('created_at', 'asc');
                }
                
                $cpsQuery->limit(5);

                $upcomingCPs = $cpsQuery->get()->map(function($cp) {
                    $batch = null;
                    if ($cp->batch_id) {
                        $batchData = \Illuminate\Support\Facades\DB::table('batches')
                            ->where('id', $cp->batch_id)
                            ->first();
                        $batch = $batchData ? ['id' => $cp->batch_id, 'title' => $batchData->title ?? null] : null;
                    }
                    return [
                        'id' => $cp->id,
                        'title' => $cp->title ?? $cp->name ?? 'Untitled Participation',
                        'participation_date' => $cp->participation_date ?? null,
                        'batch' => $batch,
                    ];
                })->toArray();
            }
        } catch (\Exception $e) {
            // Log error but don't break the /me endpoint
            \Log::warning('Error fetching upcoming activities in /me: ' . $e->getMessage());
        }

        return [
            'tasks' => $upcomingTasks,
            'quizzes' => $upcomingQuizzes,
            'class_participations' => $upcomingCPs,
        ];
    }

    /**
     * Handle user signup.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function signup(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:8',
                'source' => 'nullable|string|max:255', // From where student know about us
                'turnstile_token' => 'nullable|string', // Cloudflare Turnstile token
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors(), 'Validation failed');
        }

        // Check if Cloudflare Turnstile is enabled
        $turnstileSettings = CloudflareTurnstileSettings::getSettings();
        
        if ($turnstileSettings->is_enabled) {
            // Verify Turnstile token
            if (!$request->has('turnstile_token') || empty($request->input('turnstile_token'))) {
                return $this->error('Turnstile verification is required', 'Please complete the security verification', 400);
            }

            // Verify the token with Cloudflare
            $verificationResult = $this->verifyTurnstileToken(
                $request->input('turnstile_token'),
                $turnstileSettings->secret_key
            );

            if (!$verificationResult['success']) {
                return $this->error('Turnstile verification failed', $verificationResult['message'] ?? 'Security verification failed', 400);
            }
        }

        // Create user with student role (user_type = 2) and set as blocked
        $user = User::create([
            'name' => $request->input('name'),
            'email' => $request->input('email'),
            'password' => Hash::make($request->input('password')),
            'user_type' => 2, // Student
            'source' => $request->input('source'),
            'block' => 1, // Block new signups by default
            'block_reason' => 'Account need activation from Administration',
        ]);

        // Assign student role
        $user->roles()->sync([2]);

        // Load relationships
        $user->load('userType', 'roles');

        // Dispatch StudentRegistered event
        event(new StudentRegistered($user));

        // Create a token for immediate login
        $token = $user->createToken('auth-token')->plainTextToken;

        return $this->success([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'user_type' => $user->user_type,
                'user_type_title' => $user->userType?->title ?? null,
                'block' => $user->block ?? 0,
                'block_reason' => $user->block_reason,
                'roles' => $user->roles->map(function($role) {
                    return [
                        'id' => $role->id,
                        'title' => $role->title,
                    ];
                }),
            ],
            'token' => $token,
        ], 'Signup successful', 201);
    }

    /**
     * Verify Cloudflare Turnstile token.
     *
     * @param string $token
     * @param string $secretKey
     * @return array
     */
    private function verifyTurnstileToken(string $token, string $secretKey): array
    {
        try {
            $response = Http::asForm()->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
                'secret' => $secretKey,
                'response' => $token,
            ]);

            $result = $response->json();

            if (isset($result['success']) && $result['success'] === true) {
                return ['success' => true];
            }

            return [
                'success' => false,
                'message' => $result['error-codes'][0] ?? 'Verification failed',
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to verify token: ' . $e->getMessage(),
            ];
        }
    }
}

