<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BatchController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\NotificationSettingsController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SmtpSettingsController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\StudentDashboardController;
use App\Http\Controllers\StudentTaskController;
use App\Http\Controllers\StudentVideoController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VideoController;
use App\Http\Controllers\StudentPerformanceController;
use App\Http\Controllers\ScheduledJobController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Public routes
Route::post('/login', [AuthController::class, 'login']);
// Public video creation route for testing (excluded from auth)
Route::post('/videos', [VideoController::class, 'store']);

// Protected routes (require authentication)
Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Dashboard
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

    // Student routes
    Route::prefix('student')->group(function () {
        Route::get('/dashboard/stats', [StudentDashboardController::class, 'stats']);
        Route::get('/videos', [StudentVideoController::class, 'index']);
        Route::get('/videos/{id}/download', [StudentVideoController::class, 'download']);
        Route::get('/tasks', [StudentTaskController::class, 'index']);
        Route::get('/tasks/pending-count', [StudentTaskController::class, 'pendingCount']);
        Route::get('/tasks/{id}', [StudentTaskController::class, 'show']);
        Route::post('/tasks/{id}/submit', [StudentTaskController::class, 'submit']);
        Route::get('/tasks/submissions', [StudentTaskController::class, 'submissions']);
    });

    // Profile routes (all authenticated users)
    Route::prefix('profile')->group(function () {
        Route::get('/', [ProfileController::class, 'show']);
        Route::match(['put', 'post'], '/', [ProfileController::class, 'update']);
        Route::post('/change-password', [ProfileController::class, 'changePassword']);
    });

    // Admin only routes - User Management
    Route::middleware('admin')->prefix('users')->group(function () {
        Route::get('/', [UserController::class, 'index']);
        Route::get('/types', [UserController::class, 'getUserTypes']);
        Route::post('/', [UserController::class, 'store']);
        Route::get('/{id}', [UserController::class, 'show']);
        Route::put('/{id}', [UserController::class, 'update']);
        Route::delete('/{id}', [UserController::class, 'destroy']);
        Route::post('/{id}/block', [UserController::class, 'block']);
        Route::post('/{id}/unblock', [UserController::class, 'unblock']);
        Route::post('/{id}/assign-batches', [UserController::class, 'assignBatches']);
        Route::get('/{id}/available-batches', [UserController::class, 'getAvailableBatches']);
        Route::post('/{id}/assign-roles', [UserController::class, 'assignRoles']);
        Route::get('/{id}/available-roles', [UserController::class, 'getAvailableRoles']);
    });

    // Performance Report - accessible by students (own report) and admins (any report)
    Route::get('/users/{id}/performance-report', [StudentPerformanceController::class, 'show']);

    // Scheduled Jobs Management (Admin only)
    Route::middleware('admin')->prefix('scheduled-jobs')->group(function () {
        Route::get('/', [ScheduledJobController::class, 'index']);
        Route::post('/', [ScheduledJobController::class, 'store']);
        Route::put('/{id}', [ScheduledJobController::class, 'update']);
        Route::delete('/{id}', [ScheduledJobController::class, 'destroy']);
    });

    // Student update routes (for CR/Teacher - limited access)
    Route::prefix('users')->group(function () {
        Route::put('/{id}/student', [UserController::class, 'updateStudent']);
        Route::post('/{id}/block', [UserController::class, 'block']); // Allow CR/Teacher to block
        Route::post('/{id}/unblock', [UserController::class, 'unblock']); // Allow CR/Teacher to unblock
    });

    // Batches Management
    Route::prefix('batches')->group(function () {
        Route::get('/', [BatchController::class, 'index']);
        Route::post('/', [BatchController::class, 'store']);
        Route::get('/{id}', [BatchController::class, 'show']);
        Route::put('/{id}', [BatchController::class, 'update']);
        Route::delete('/{id}', [BatchController::class, 'destroy']);
        Route::post('/{id}/assign-subjects', [BatchController::class, 'assignSubjects']);
        Route::get('/{id}/available-subjects', [BatchController::class, 'getAvailableSubjects']);
        Route::get('/{id}/students', [BatchController::class, 'getStudents']);
    });

    // Subjects Management
    Route::prefix('subjects')->group(function () {
        Route::get('/', [SubjectController::class, 'index']);
        Route::post('/', [SubjectController::class, 'store']);
        Route::get('/{id}', [SubjectController::class, 'show']);
        Route::put('/{id}', [SubjectController::class, 'update']);
        Route::delete('/{id}', [SubjectController::class, 'destroy']);
    });

    // Videos Management
    Route::prefix('videos')->group(function () {
        Route::get('/', [VideoController::class, 'index']);
        // POST /videos is now public (moved above for testing)
        Route::get('/{id}', [VideoController::class, 'show']);
        Route::put('/{id}', [VideoController::class, 'update']);
        Route::delete('/{id}', [VideoController::class, 'destroy']);
        Route::post('/{id}/assign-batch-subject', [VideoController::class, 'assignToBatchSubject']);
        Route::get('/batch/{batchId}/subject/{subjectId}', [VideoController::class, 'getBatchSubjectVideos']);
        Route::post('/batch/{batchId}/subject/{subjectId}/reorder', [VideoController::class, 'reorderBatchSubjectVideos']);
        Route::delete('/{id}/batch-subject', [VideoController::class, 'removeFromBatchSubject'])->middleware('admin');
    });

    // Tasks Management (Admin, Teacher, CR)
    Route::prefix('tasks')->group(function () {
        Route::get('/', [TaskController::class, 'index']);
        Route::post('/', [TaskController::class, 'store']);
        Route::get('/{id}', [TaskController::class, 'show']);
        Route::put('/{id}', [TaskController::class, 'update']);
        Route::delete('/{id}', [TaskController::class, 'destroy']);
        Route::get('/{id}/submissions', [TaskController::class, 'getSubmissions']);
        Route::post('/{taskId}/submissions/{submissionId}/grade', [TaskController::class, 'gradeSubmission']);
    });

    // Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
        Route::get('/{id}', [NotificationController::class, 'show']);
        Route::post('/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::post('/mark-all-read', [NotificationController::class, 'markAllAsRead']);
    });

    // SMTP Settings (Admin only)
    Route::middleware('admin')->prefix('smtp-settings')->group(function () {
        Route::get('/', [SmtpSettingsController::class, 'index']);
        Route::put('/', [SmtpSettingsController::class, 'update']);
        Route::post('/test', [SmtpSettingsController::class, 'test']);
    });

    // Notification Settings (Admin only)
    Route::middleware('admin')->prefix('notification-settings')->group(function () {
        Route::get('/', [NotificationSettingsController::class, 'index']);
        Route::put('/', [NotificationSettingsController::class, 'update']);
    });
});

