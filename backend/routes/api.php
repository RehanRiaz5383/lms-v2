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
use App\Http\Controllers\VoucherController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\CloudflareTurnstileController;
use App\Http\Controllers\QuizController;
use App\Http\Controllers\ClassParticipationController;
use App\Http\Controllers\PushNotificationController;
use App\Http\Controllers\GoogleDriveTestController;
use App\Http\Controllers\SocketController;
use App\Http\Controllers\ChatController;
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
Route::post('/signup', [AuthController::class, 'signup']);
Route::get('/turnstile-settings', [CloudflareTurnstileController::class, 'getSettings']); // Public endpoint to get site key
// Public video creation route for testing (excluded from auth)
Route::post('/videos', [VideoController::class, 'store']);
// Public direct download route (no authentication required - file will be made public on Google Drive)
Route::get('/videos/{id}/direct-download', [VideoController::class, 'directDownload']);

// Google Drive Test Endpoints (Public - no authentication required)
Route::prefix('google-drive')->group(function () {
    Route::get('/test', [GoogleDriveTestController::class, 'testListFiles']);
    Route::get('/test/base-folder', [GoogleDriveTestController::class, 'testBaseFolder']);
    Route::get('/test/search', [GoogleDriveTestController::class, 'testSearchFiles']);
    Route::get('/test/folder-info', [GoogleDriveTestController::class, 'testGetFolderInfo']);
});

// Protected routes (require authentication)
Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Socket routes
    Route::prefix('socket')->group(function () {
        Route::get('/config', [SocketController::class, 'getConfig']);
        Route::get('/verify-token', [SocketController::class, 'verifyToken']);
    });

    // Chat routes
    Route::prefix('chat')->group(function () {
        Route::get('/conversations', [ChatController::class, 'getConversations']);
        Route::get('/unread-count', [ChatController::class, 'getUnreadCount']);
        Route::post('/conversations', [ChatController::class, 'getOrCreateConversation']);
        Route::get('/conversations/{id}/messages', [ChatController::class, 'getMessages']);
        Route::post('/messages', [ChatController::class, 'storeMessage']);
        Route::post('/conversations/{id}/read', [ChatController::class, 'markAsRead']);
        Route::post('/notify-offline-recipients', [ChatController::class, 'notifyOfflineRecipients']);
    });

    // Dashboard
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/dashboard/trending-signup-reasons', [DashboardController::class, 'getTrendingSignupReasons']);
    Route::get('/dashboard/pending-task-submissions', [DashboardController::class, 'getPendingTaskSubmissions'])->middleware('admin');
    Route::post('/dashboard/notify-student-overdue', [DashboardController::class, 'notifyStudentOverdueSubmission'])->middleware('admin');

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
        Route::get('/vouchers', [VoucherController::class, 'getMyVouchers']);
        Route::post('/vouchers/{id}/submit-payment', [VoucherController::class, 'submitPayment']);
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
        Route::post('/{id}/impersonate', [UserController::class, 'impersonate']);
        Route::put('/{id}/fee', [VoucherController::class, 'updateStudentFee']);
        Route::get('/{id}/vouchers', [VoucherController::class, 'getStudentVouchers']);
        Route::post('/{id}/vouchers', [VoucherController::class, 'createVoucher']);
        Route::post('/{id}/send-notification', [UserController::class, 'sendNotification']);
    });

    // Performance Report - accessible by students (own report) and admins (any report)
    Route::get('/users/{id}/performance-report', [StudentPerformanceController::class, 'show']);

    // Scheduled Jobs Management (Admin only)
    Route::middleware('admin')->prefix('scheduled-jobs')->group(function () {
        Route::get('/', [ScheduledJobController::class, 'index']);
        Route::post('/', [ScheduledJobController::class, 'store']);
        Route::put('/{id}', [ScheduledJobController::class, 'update']);
        Route::delete('/{id}', [ScheduledJobController::class, 'destroy']);
        Route::get('/{id}/logs', [ScheduledJobController::class, 'getJobLogs']);
        Route::delete('/{id}/logs', [ScheduledJobController::class, 'clearJobLogs']);
    });

    // Vouchers Management
    Route::middleware('admin')->prefix('vouchers')->group(function () {
        Route::get('/', [VoucherController::class, 'getAllVouchers']); // Get all vouchers with filters
        Route::get('/income-report', [VoucherController::class, 'getIncomeReport']); // Income report (approved vouchers)
        Route::post('/generate', [VoucherController::class, 'generateVouchers']); // Test endpoint for manual voucher generation
        Route::put('/{id}', [VoucherController::class, 'updateVoucher']); // Update voucher
        Route::post('/{id}/approve', [VoucherController::class, 'approveVoucher']);
        Route::post('/{id}/reject', [VoucherController::class, 'rejectVoucher']);
        Route::post('/{id}/notify', [VoucherController::class, 'notifyPaymentClearance']); // Send payment clearance notification
        Route::delete('/{id}', [VoucherController::class, 'deleteVoucher']);
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
        // Note: direct-download route is public (moved above, outside auth middleware)
        Route::put('/{id}', [VideoController::class, 'update']);
        Route::delete('/{id}', [VideoController::class, 'destroy']);
        Route::post('/{id}/assign-batch-subject', [VideoController::class, 'assignToBatchSubject']);
        Route::get('/batch/{batchId}/subject/{subjectId}', [VideoController::class, 'getBatchSubjectVideos']);
        Route::post('/batch/{batchId}/subject/{subjectId}/reorder', [VideoController::class, 'reorderBatchSubjectVideos']);
        Route::delete('/{id}/batch-subject', [VideoController::class, 'removeFromBatchSubject'])->middleware('admin');
        Route::post('/backfill-google-drive-ids', [VideoController::class, 'backfillGoogleDriveIds'])->middleware('admin'); // Backfill Google Drive file IDs
    });

    // Tasks Management (Admin, Teacher, CR)
    Route::prefix('tasks')->group(function () {
        Route::get('/', [TaskController::class, 'index']);
        Route::post('/', [TaskController::class, 'store']);
        // Specific routes must come before parameterized routes
        Route::get('/unchecked-submissions', [TaskController::class, 'getUncheckedSubmissions'])->middleware('admin');
        Route::delete('/submissions/{submissionId}', [TaskController::class, 'deleteSubmission'])->middleware('admin');
        Route::post('/submissions/bulk-delete', [TaskController::class, 'bulkDeleteSubmissions'])->middleware('admin');
        Route::get('/{id}/submissions', [TaskController::class, 'getSubmissions']);
        Route::get('/{id}', [TaskController::class, 'show']);
        Route::put('/{id}', [TaskController::class, 'update']);
        Route::delete('/{id}', [TaskController::class, 'destroy']);
        Route::post('/{taskId}/submissions/{submissionId}/grade', [TaskController::class, 'gradeSubmission']);
        Route::post('/{taskId}/upload-student-submission', [TaskController::class, 'uploadStudentSubmission']);
    });

    // Quizzes Management (Admin, Teacher, CR)
    Route::prefix('quizzes')->group(function () {
        Route::get('/', [QuizController::class, 'index']);
        Route::post('/', [QuizController::class, 'store']);
        Route::get('/{id}', [QuizController::class, 'show']);
        Route::put('/{id}', [QuizController::class, 'update']);
        Route::delete('/{id}', [QuizController::class, 'destroy']);
        Route::get('/{id}/students', [QuizController::class, 'getStudents']);
        Route::post('/{id}/assign-marks', [QuizController::class, 'assignMarks']);
        Route::get('/students/{studentId}/marks', [QuizController::class, 'getStudentMarks']);
    });

    // Student Quizzes (Students only)
    Route::get('/student/quizzes', [QuizController::class, 'studentQuizzes']);

    // Class Participations Management (Admin, Teacher, CR)
    Route::prefix('class-participations')->group(function () {
        Route::get('/', [ClassParticipationController::class, 'index']);
        Route::post('/', [ClassParticipationController::class, 'store']);
        Route::get('/{id}', [ClassParticipationController::class, 'show']);
        Route::put('/{id}', [ClassParticipationController::class, 'update']);
        Route::delete('/{id}', [ClassParticipationController::class, 'destroy']);
        Route::get('/{id}/students', [ClassParticipationController::class, 'getStudents']);
        Route::post('/{id}/assign-marks', [ClassParticipationController::class, 'assignMarks']);
        Route::get('/students/{studentId}/marks', [ClassParticipationController::class, 'getStudentMarks']);
    });

    // Student Class Participations (Students only)
    Route::get('/student/class-participations', [ClassParticipationController::class, 'studentParticipations']);

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

    // Google Drive Folders Management (Admin only)
    Route::middleware('admin')->prefix('google-drive-folders')->group(function () {
        Route::get('/', [\App\Http\Controllers\GoogleDriveFolderController::class, 'index']);
        Route::post('/', [\App\Http\Controllers\GoogleDriveFolderController::class, 'store']);
        Route::get('/{id}', [\App\Http\Controllers\GoogleDriveFolderController::class, 'show']);
        Route::put('/{id}', [\App\Http\Controllers\GoogleDriveFolderController::class, 'update']);
        Route::delete('/{id}', [\App\Http\Controllers\GoogleDriveFolderController::class, 'destroy']);
    });

    // Notification Settings (available to all authenticated users)
    Route::prefix('notification-settings')->group(function () {
        Route::get('/', [NotificationSettingsController::class, 'index']);
        Route::put('/', [NotificationSettingsController::class, 'update']);
    });

    // Push Notifications (available to all authenticated users)
    Route::prefix('push-notifications')->group(function () {
        Route::get('/vapid-public-key', [PushNotificationController::class, 'getVapidPublicKey']);
        Route::post('/subscribe', [PushNotificationController::class, 'subscribe']);
        Route::post('/unsubscribe', [PushNotificationController::class, 'unsubscribe']);
        Route::post('/test', [PushNotificationController::class, 'sendTest']); // Test push notification
        Route::get('/subscription-details', [PushNotificationController::class, 'getSubscriptionDetails']); // Debug endpoint
    });

    // Expense Management (Admin only)
    Route::middleware('admin')->prefix('expenses')->group(function () {
        // Expense Heads
        Route::get('/heads', [ExpenseController::class, 'getExpenseHeads']);
        Route::post('/heads', [ExpenseController::class, 'createExpenseHead']);
        Route::put('/heads/{id}', [ExpenseController::class, 'updateExpenseHead']);
        Route::delete('/heads/{id}', [ExpenseController::class, 'deleteExpenseHead']);
        
        // Expenses
        Route::get('/', [ExpenseController::class, 'getExpenses']);
        Route::post('/', [ExpenseController::class, 'createExpense']);
        Route::put('/{id}', [ExpenseController::class, 'updateExpense']);
        Route::delete('/{id}', [ExpenseController::class, 'deleteExpense']);
        
        // Income and Expense Report
        Route::get('/income-expense-report', [ExpenseController::class, 'getIncomeExpenseReport']);
    });

    // Cloudflare Turnstile Settings (Admin only)
    Route::middleware('admin')->prefix('turnstile-settings')->group(function () {
        Route::get('/admin', [CloudflareTurnstileController::class, 'getSettings']);
        Route::put('/', [CloudflareTurnstileController::class, 'updateSettings']);
    });
});

