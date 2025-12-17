<?php

namespace App\Http\Controllers;

use App\Models\Voucher;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

class VoucherController extends ApiController
{
    /**
     * Get vouchers for the current student (student route).
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getMyVouchers(Request $request): JsonResponse
    {
        try {
            $currentUser = auth()->user();
            
            $vouchers = Voucher::where('student_id', $currentUser->id)
                ->with(['student', 'approver'])
                ->orderBy('due_date', 'desc')
                ->get();

            // Add file URL if submission_file exists
            $vouchers->transform(function ($voucher) {
                if ($voucher->submission_file) {
                    $voucher->submission_file_url = url('/load-storage/' . $voucher->submission_file);
                }
                return $voucher;
            });

            return $this->success($vouchers, 'Vouchers retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to retrieve vouchers', 500);
        }
    }

    /**
     * Get vouchers for a specific student (admin route).
     *
     * @param Request $request
     * @param int $studentId
     * @return JsonResponse
     */
    public function getStudentVouchers(Request $request, int $studentId): JsonResponse
    {
        try {
            $currentUser = auth()->user();
            
            // Check if user is admin or the student themselves
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

            // Students can only view their own vouchers
            if (!$isAdmin && $currentUser->id != $studentId) {
                return $this->forbidden('You can only view your own vouchers');
            }

            $vouchers = Voucher::where('student_id', $studentId)
                ->with(['student', 'approver'])
                ->orderBy('due_date', 'desc')
                ->get();

            // Add file URL if submission_file exists
            $vouchers->transform(function ($voucher) {
                if ($voucher->submission_file) {
                    $voucher->submission_file_url = url('/load-storage/' . $voucher->submission_file);
                }
                return $voucher;
            });

            return $this->success($vouchers, 'Vouchers retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to retrieve vouchers', 500);
        }
    }

    /**
     * Update student fee and promise date (Admin only).
     *
     * @param Request $request
     * @param int $studentId
     * @return JsonResponse
     */
    public function updateStudentFee(Request $request, int $studentId): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'fee_amount' => 'required|numeric|min:0',
                'promise_date' => 'required|integer|min:1|max:31',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors()->toArray());
            }

            $student = User::find($studentId);
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
            if (!$isStudent && ($student->user_type == 2 || strtolower($student->userType->title ?? '') === 'student')) {
                $isStudent = true;
            }

            if (!$isStudent) {
                return $this->error('User is not a student', 'Invalid user type', 400);
            }

            $student->fees = $request->input('fee_amount');
            $student->expected_fee_promise_date = $request->input('promise_date');
            $student->save();

            return $this->success($student, 'Student fee updated successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to update student fee', 500);
        }
    }

    /**
     * Submit payment proof for a voucher (Student only).
     *
     * @param Request $request
     * @param int $voucherId
     * @return JsonResponse
     */
    public function submitPayment(Request $request, int $voucherId): JsonResponse
    {
        try {
            $currentUser = auth()->user();
            $voucher = Voucher::find($voucherId);

            if (!$voucher) {
                return $this->notFound('Voucher not found');
            }

            // Check if user owns this voucher
            if ($voucher->student_id != $currentUser->id) {
                return $this->forbidden('You can only submit payment for your own vouchers');
            }

            // Check if voucher is already approved
            if ($voucher->status === 'approved') {
                return $this->error('This voucher is already approved', 'Invalid action', 400);
            }

            $validator = Validator::make($request->all(), [
                'file' => 'required|file|max:10240', // 10MB max
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors()->toArray());
            }

            // Handle file upload
            $file = $request->file('file');
            $fileName = time() . '_' . $currentUser->id . '_' . $voucherId . '_' . $file->getClientOriginalName();
            $filePath = $file->storeAs('voucher_submissions', $fileName, 'public');

            // Delete old file if exists
            if ($voucher->submission_file && Storage::disk('public')->exists($voucher->submission_file)) {
                Storage::disk('public')->delete($voucher->submission_file);
            }

            $voucher->submission_file = $filePath;
            $voucher->status = 'submitted';
            $voucher->submitted_at = now();
            $voucher->save();

            return $this->success($voucher, 'Payment proof submitted successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to submit payment proof', 500);
        }
    }

    /**
     * Approve a voucher (Admin only).
     *
     * @param Request $request
     * @param int $voucherId
     * @return JsonResponse
     */
    public function approveVoucher(Request $request, int $voucherId): JsonResponse
    {
        try {
            $currentUser = auth()->user();
            $voucher = Voucher::with('student')->find($voucherId);

            if (!$voucher) {
                return $this->notFound('Voucher not found');
            }

            // Check if voucher is submitted
            if ($voucher->status !== 'submitted') {
                return $this->error('Voucher must be submitted before approval', 'Invalid status', 400);
            }

            $voucher->status = 'approved';
            $voucher->approved_at = now();
            $voucher->approved_by = $currentUser->id;
            
            if ($request->has('remarks')) {
                $voucher->remarks = $request->input('remarks');
            }
            
            $voucher->save();

            return $this->success($voucher, 'Voucher approved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to approve voucher', 500);
        }
    }

    /**
     * Reject a voucher (Admin only).
     *
     * @param Request $request
     * @param int $voucherId
     * @return JsonResponse
     */
    public function rejectVoucher(Request $request, int $voucherId): JsonResponse
    {
        try {
            $currentUser = auth()->user();
            $voucher = Voucher::find($voucherId);

            if (!$voucher) {
                return $this->notFound('Voucher not found');
            }

            $validator = Validator::make($request->all(), [
                'remarks' => 'required|string|max:1000',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors()->toArray());
            }

            $voucher->status = 'rejected';
            $voucher->remarks = $request->input('remarks');
            $voucher->save();

            return $this->success($voucher, 'Voucher rejected successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to reject voucher', 500);
        }
    }

    /**
     * Manually trigger voucher generation for testing
     * Generates vouchers for students whose promise date is 10 days from today
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function generateVouchers(Request $request): JsonResponse
    {
        try {
            $now = Carbon::now()->setTimezone('Asia/Karachi');
            $todayPlus10Days = $now->copy()->addDays(10);
            $targetPromiseDay = $todayPlus10Days->day; // The promise date that is 10 days from today
            
            $generatedCount = 0;
            $skippedCount = 0;
            $errors = [];

            // Get all active students with promise_date matching target day and fees set
            $students = User::where('block', 0)
                ->where('expected_fee_promise_date', $targetPromiseDay)
                ->whereNotNull('fees')
                ->where('fees', '>', 0)
                ->get();

            foreach ($students as $student) {
                try {
                    $promiseDay = (int) $student->expected_fee_promise_date; // Day of month (1-31)
                    
                    // Calculate the due date (promise date in the month that is 10 days from now)
                    $dueDate = Carbon::create(
                        $todayPlus10Days->year,
                        $todayPlus10Days->month,
                        $promiseDay,
                        0, 0, 0,
                        'Asia/Karachi'
                    );

                    // Check if voucher already exists for this student and due date (same year and month)
                    $existingVoucher = Voucher::where('student_id', $student->id)
                        ->whereYear('due_date', $dueDate->year)
                        ->whereMonth('due_date', $dueDate->month)
                        ->whereDay('due_date', $dueDate->day)
                        ->first();

                    if ($existingVoucher) {
                        $skippedCount++;
                        continue; // Voucher already exists for this month
                    }

                    // Create new voucher
                    $voucher = Voucher::create([
                        'student_id' => $student->id,
                        'fee_amount' => $student->fees,
                        'description' => 'Fee Voucher',
                        'due_date' => $dueDate->format('Y-m-d'),
                        'promise_date' => $dueDate->format('Y-m-d'),
                        'status' => 'pending',
                    ]);

                    // Create notification for student
                    $this->createVoucherNotification($student->id, $voucher);

                    $generatedCount++;
                    Log::info("Voucher generated for student {$student->id} ({$student->email}) with due date {$dueDate->format('Y-m-d')}");
                } catch (\Exception $e) {
                    $errors[] = [
                        'student_id' => $student->id,
                        'student_email' => $student->email,
                        'error' => $e->getMessage(),
                    ];
                    Log::error("Failed to generate voucher for student {$student->id}: " . $e->getMessage(), [
                        'exception' => $e,
                    ]);
                }
            }

            return $this->success([
                'target_promise_day' => $targetPromiseDay,
                'target_date' => $todayPlus10Days->format('Y-m-d'),
                'students_processed' => $students->count(),
                'vouchers_generated' => $generatedCount,
                'vouchers_skipped' => $skippedCount,
                'errors' => $errors,
                'message' => "Generated {$generatedCount} voucher(s), skipped {$skippedCount} existing voucher(s)",
            ], 'Voucher generation completed');
        } catch (\Exception $e) {
            Log::error('Voucher generation error: ' . $e->getMessage());
            return $this->error($e->getMessage(), 'Failed to generate vouchers', 500);
        }
    }

    /**
     * Create a manual voucher for a student (Admin only).
     *
     * @param Request $request
     * @param int $studentId
     * @return JsonResponse
     */
    public function createVoucher(Request $request, int $studentId): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'fee_amount' => 'required|numeric|min:0',
                'description' => 'nullable|string|max:255',
                'due_date' => 'required|date|after_or_equal:today',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors()->toArray());
            }

            $student = User::find($studentId);
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
            if (!$isStudent && ($student->user_type == 2 || strtolower($student->userType->title ?? '') === 'student')) {
                $isStudent = true;
            }

            if (!$isStudent) {
                return $this->error('User is not a student', 'Invalid user type', 400);
            }

            // Create voucher
            $voucher = Voucher::create([
                'student_id' => $student->id,
                'fee_amount' => $request->input('fee_amount'),
                'description' => $request->input('description', 'Fee Voucher'),
                'due_date' => $request->input('due_date'),
                'promise_date' => $request->input('due_date'), // Use due_date as promise_date for manual vouchers
                'status' => 'pending',
            ]);

            // Refresh to ensure we have the ID
            $voucher->refresh();

            Log::info("Voucher created successfully", [
                'voucher_id' => $voucher->id,
                'student_id' => $student->id,
                'amount' => $voucher->fee_amount,
            ]);

            // Create notification for student
            Log::info("About to create notification", [
                'voucher_id' => $voucher->id,
                'student_id' => $student->id,
            ]);
            
            try {
                $this->createVoucherNotification($student->id, $voucher);
                Log::info("Notification method called successfully", [
                    'voucher_id' => $voucher->id,
                    'student_id' => $student->id,
                ]);
            } catch (\Exception $notifException) {
                Log::error("Exception when calling createVoucherNotification", [
                    'voucher_id' => $voucher->id,
                    'student_id' => $student->id,
                    'error' => $notifException->getMessage(),
                    'trace' => $notifException->getTraceAsString(),
                ]);
                // Don't fail voucher creation if notification fails
            }

            return $this->success($voucher, 'Voucher created successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to create voucher', 500);
        }
    }

    /**
     * Create UI notification for voucher generation
     * Uses the same pattern as TaskController::createTaskAssignedNotification
     */
    private function createVoucherNotification(int $studentId, Voucher $voucher): void
    {
        try {
            if (!DB::getSchemaBuilder()->hasTable('notifications')) {
                return;
            }

            $dueDate = Carbon::parse($voucher->due_date)->format('M d, Y');
            $description = $voucher->description ?? 'Fee Voucher';
            $amount = number_format($voucher->fee_amount, 2);

            // Check which column structure exists (same pattern as TaskController)
            $hasUserIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'user_id');
            $hasNotifiableIdColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'notifiable_id');
            $hasTypeColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'type');
            $hasTitleColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'title');
            $hasMessageColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'message');
            $hasDataColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'data');
            $hasReadColumn = DB::getSchemaBuilder()->hasColumn('notifications', 'read');

            $notificationData = [];

            // If both columns exist, set both (some servers require notifiable_id/type even when user_id exists)
            if ($hasUserIdColumn && $hasNotifiableIdColumn) {
                $notificationData['user_id'] = $studentId;
                $notificationData['notifiable_id'] = $studentId;
                $notificationData['notifiable_type'] = 'App\\Models\\User';
            } else if ($hasUserIdColumn) {
                $notificationData['user_id'] = $studentId;
            } else if ($hasNotifiableIdColumn) {
                $notificationData['notifiable_id'] = $studentId;
                $notificationData['notifiable_type'] = 'App\\Models\\User';
            }

            if ($hasTypeColumn) {
                $notificationData['type'] = 'voucher_generated';
            }

            if ($hasTitleColumn) {
                $notificationData['title'] = 'New Voucher Generated';
            }

            if ($hasMessageColumn) {
                $notificationData['message'] = "A new {$description} (PKR {$amount}) has been generated. Due Date: {$dueDate}. Please go to Account Book and deposit soon to avoid any inconvenience.";
            }

            if ($hasDataColumn) {
                $notificationData['data'] = json_encode([
                    'voucher_id' => $voucher->id,
                    'fee_amount' => $voucher->fee_amount,
                    'description' => $voucher->description,
                    'due_date' => $voucher->due_date,
                ]);
            }

            if ($hasReadColumn) {
                $notificationData['read'] = false;
            }

            $notificationData['created_at'] = now();
            $notificationData['updated_at'] = now();

            // Ensure we have required fields before inserting
            if (empty($notificationData)) {
                Log::warning('Notification data is empty, cannot insert', [
                    'student_id' => $studentId,
                    'voucher_id' => $voucher->id ?? null,
                ]);
                return;
            }

            // Note: id column is now auto-increment, so we don't need to set it

            Log::info('Attempting to insert voucher notification', [
                'student_id' => $studentId,
                'voucher_id' => $voucher->id ?? null,
                'notification_data_keys' => array_keys($notificationData),
                'has_user_id' => $hasUserIdColumn,
                'has_notifiable_id' => $hasNotifiableIdColumn,
            ]);

            $inserted = DB::table('notifications')->insert($notificationData);
            
            $notificationId = null;
            if ($inserted) {
                // Get the inserted ID if available
                try {
                    $notificationId = DB::getPdo()->lastInsertId();
                } catch (\Exception $idException) {
                    // Ignore if we can't get the ID
                }
            }
            
            Log::info('Voucher notification created successfully', [
                'student_id' => $studentId,
                'voucher_id' => $voucher->id ?? null,
                'notification_id' => $notificationId,
                'inserted' => $inserted,
            ]);
        } catch (\Exception $e) {
            // Log error with full details for debugging
            Log::error('Failed to create voucher notification', [
                'error_message' => $e->getMessage(),
                'error_code' => $e->getCode(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'student_id' => $studentId,
                'voucher_id' => $voucher->id ?? null,
                'notification_data' => $notificationData ?? [],
                'has_user_id_column' => $hasUserIdColumn ?? false,
                'has_notifiable_id_column' => $hasNotifiableIdColumn ?? false,
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    /**
     * Delete a voucher (Admin only).
     *
     * @param Request $request
     * @param int $voucherId
     * @return JsonResponse
     */
    public function deleteVoucher(Request $request, int $voucherId): JsonResponse
    {
        try {
            $voucher = Voucher::find($voucherId);

            if (!$voucher) {
                return $this->notFound('Voucher not found');
            }

            // Delete submission file if exists
            if ($voucher->submission_file && Storage::disk('public')->exists($voucher->submission_file)) {
                Storage::disk('public')->delete($voucher->submission_file);
            }

            $voucher->delete();

            Log::info("Voucher deleted", [
                'voucher_id' => $voucherId,
                'deleted_by' => auth()->id(),
            ]);

            return $this->success(null, 'Voucher deleted successfully');
        } catch (\Exception $e) {
            Log::error("Failed to delete voucher {$voucherId}: " . $e->getMessage());
            return $this->error($e->getMessage(), 'Failed to delete voucher', 500);
        }
    }
}
