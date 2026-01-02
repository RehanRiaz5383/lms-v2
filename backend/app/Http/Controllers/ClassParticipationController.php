<?php

namespace App\Http\Controllers;

use App\Models\ClassParticipation;
use App\Models\ClassParticipationMark;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ClassParticipationController extends ApiController
{
    /**
     * Get all class participations for a batch and optionally a subject.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = ClassParticipation::query();

            // Filter by batch_id if provided
            if ($request->has('batch_id')) {
                $query->where('batch_id', $request->input('batch_id'));
            }

            // Filter by subject_id if provided (null means batch-level)
            if ($request->has('subject_id')) {
                $subjectId = $request->input('subject_id');
                if ($subjectId === 'null' || $subjectId === null) {
                    $query->whereNull('subject_id');
                } else {
                    $query->where('subject_id', $subjectId);
                }
            }

            $participations = $query->with(['batch', 'subject', 'creator'])
                ->orderBy('participation_date', 'desc')
                ->orderBy('created_at', 'desc')
                ->get();

            // Attach marks count for each participation
            $participations = $participations->map(function ($participation) {
                $participation->marks_count = ClassParticipationMark::where('class_participation_id', $participation->id)->count();
                return $participation;
            });

            return $this->success($participations, 'Class participations retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to retrieve class participations', 500);
        }
    }

    /**
     * Create a new class participation.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'title' => 'required|string|max:255',
                'batch_id' => 'required|exists:batches,id',
                'subject_id' => 'nullable|exists:subjects,id',
                'participation_date' => 'required|date',
                'description' => 'nullable|string',
                'total_marks' => 'nullable|numeric|min:0',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors()->toArray());
            }

            $participation = ClassParticipation::create([
                'title' => $request->input('title'),
                'batch_id' => $request->input('batch_id'),
                'subject_id' => $request->input('subject_id') ?: null,
                'participation_date' => $request->input('participation_date'),
                'description' => $request->input('description'),
                'total_marks' => $request->input('total_marks', 0),
                'created_by' => $request->user()->id,
            ]);

            $participation->load(['batch', 'subject', 'creator']);

            // Notify all students in the batch
            try {
                $batchId = $participation->batch_id;
                $studentIds = [];
                
                // Get students enrolled in the batch
                if (DB::getSchemaBuilder()->hasColumn('user_batches', 'user_id')) {
                    $studentIds = DB::table('user_batches')
                        ->join('users', 'users.id', '=', 'user_batches.user_id')
                        ->where('user_batches.batch_id', $batchId)
                        ->where('users.user_type', 2) // Students only
                        ->pluck('users.id')
                        ->toArray();
                } else if (DB::getSchemaBuilder()->hasColumn('user_batches', 'student_id')) {
                    $studentIds = DB::table('user_batches')
                        ->join('users', 'users.id', '=', 'user_batches.student_id')
                        ->where('user_batches.batch_id', $batchId)
                        ->where('users.user_type', 2) // Students only
                        ->pluck('users.id')
                        ->toArray();
                }

                // Send notification to each student
                $participationType = $participation->subject_id ? 'Subject' : 'Batch-Level';
                $subjectText = $participation->subject ? " for {$participation->subject->title}" : '';
                
                foreach ($studentIds as $studentId) {
                    $student = User::find($studentId);
                    if ($student) {
                        $student->sendCrmNotification(
                            'class_participation_created',
                            'New Class Participation Created',
                            "A new {$participationType} class participation '{$participation->title}' has been created{$subjectText} for batch {$participation->batch->title}.",
                            [
                                'url' => '/dashboard/class-participations',
                                'class_participation_id' => $participation->id,
                                'batch_id' => $batchId,
                            ]
                        );
                    }
                }
            } catch (\Exception $e) {
                // Log error but don't fail the request
                \Log::warning('Failed to send notifications for class participation creation', [
                    'error' => $e->getMessage(),
                    'participation_id' => $participation->id,
                ]);
            }

            return $this->success($participation, 'Class participation created successfully', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to create class participation', 500);
        }
    }

    /**
     * Get a specific class participation.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        try {
            $participation = ClassParticipation::with(['batch', 'subject', 'creator'])
                ->find($id);

            if (!$participation) {
                return $this->notFound('Class participation not found');
            }

            $participation->marks_count = ClassParticipationMark::where('class_participation_id', $participation->id)->count();

            return $this->success($participation, 'Class participation retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to retrieve class participation', 500);
        }
    }

    /**
     * Update a class participation.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $participation = ClassParticipation::find($id);

            if (!$participation) {
                return $this->notFound('Class participation not found');
            }

            $validator = Validator::make($request->all(), [
                'title' => 'sometimes|required|string|max:255',
                'batch_id' => 'sometimes|required|exists:batches,id',
                'subject_id' => 'nullable|exists:subjects,id',
                'participation_date' => 'sometimes|required|date',
                'description' => 'nullable|string',
                'total_marks' => 'nullable|numeric|min:0',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors()->toArray());
            }

            $participation->update($request->only([
                'title',
                'batch_id',
                'subject_id',
                'participation_date',
                'description',
                'total_marks',
            ]));

            $participation->load(['batch', 'subject', 'creator']);

            return $this->success($participation, 'Class participation updated successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to update class participation', 500);
        }
    }

    /**
     * Delete a class participation.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $participation = ClassParticipation::find($id);

            if (!$participation) {
                return $this->notFound('Class participation not found');
            }

            // Delete associated marks
            ClassParticipationMark::where('class_participation_id', $id)->delete();

            $participation->delete();

            return $this->success(null, 'Class participation deleted successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to delete class participation', 500);
        }
    }

    /**
     * Get students for a class participation (batch students or batch+subject students).
     *
     * @param int $id
     * @return JsonResponse
     */
    public function getStudents(int $id): JsonResponse
    {
        try {
            $participation = ClassParticipation::with(['batch', 'subject'])->find($id);

            if (!$participation) {
                return $this->notFound('Class participation not found');
            }

            // Get students enrolled in the batch
            $query = DB::table('user_batches')
                ->join('users', 'users.id', '=', 'user_batches.user_id')
                ->where('user_batches.batch_id', $participation->batch_id)
                ->where('users.user_type', 2) // Students only
                ->select('users.id', 'users.name', 'users.first_name', 'users.last_name', 'users.email');

            $students = $query->orderBy('users.name')
                ->get()
                ->map(function ($student) {
                    $student->full_name = $student->name ?? trim(($student->first_name ?? '') . ' ' . ($student->last_name ?? ''));
                    return $student;
                });

            // Attach existing marks
            $marks = ClassParticipationMark::where('class_participation_id', $id)
                ->with('student')
                ->get()
                ->keyBy('student_id');

            $students = $students->map(function ($student) use ($marks, $participation) {
                $mark = $marks->get($student->id);
                $student->has_mark = $mark !== null;
                $student->obtained_marks = $mark ? $mark->obtained_marks : null;
                $student->total_marks = $mark ? ($mark->total_marks ?? $participation->total_marks) : $participation->total_marks;
                $student->remarks = $mark ? $mark->remarks : null;
                $student->mark_id = $mark ? $mark->id : null;
                return $student;
            });

            return $this->success([
                'participation' => $participation,
                'students' => $students,
            ], 'Students retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to retrieve students', 500);
        }
    }

    /**
     * Assign marks to students for a class participation.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function assignMarks(Request $request, int $id): JsonResponse
    {
        try {
            $participation = ClassParticipation::with(['batch', 'subject'])->find($id);

            if (!$participation) {
                return $this->notFound('Class participation not found');
            }

            $validator = Validator::make($request->all(), [
                'marks' => 'required|array',
                'marks.*.student_id' => 'required|exists:users,id',
                'marks.*.obtained_marks' => 'required|numeric|min:0',
                'marks.*.total_marks' => 'nullable|numeric|min:0',
                'marks.*.remarks' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors()->toArray());
            }

            $marks = $request->input('marks');
            $createdBy = $request->user()->id;
            $results = [];

            DB::beginTransaction();

            try {
                foreach ($marks as $markData) {
                    $studentId = $markData['student_id'];
                    $obtainedMarks = $markData['obtained_marks'];
                    $totalMarks = $markData['total_marks'] ?? $participation->total_marks ?? $obtainedMarks;
                    $remarks = $markData['remarks'] ?? null;

                    // Check if mark already exists
                    $existingMark = ClassParticipationMark::where('class_participation_id', $id)
                        ->where('student_id', $studentId)
                        ->first();

                    $isNewMark = false;
                    if ($existingMark) {
                        // Update existing mark
                        $existingMark->update([
                            'obtained_marks' => $obtainedMarks,
                            'total_marks' => $totalMarks,
                            'remarks' => $remarks,
                        ]);
                        $results[] = $existingMark;
                    } else {
                        // Create new mark
                        $mark = ClassParticipationMark::create([
                            'class_participation_id' => $id,
                            'student_id' => $studentId,
                            'obtained_marks' => $obtainedMarks,
                            'total_marks' => $totalMarks,
                            'remarks' => $remarks,
                            'created_by' => $createdBy,
                        ]);
                        $results[] = $mark;
                        $isNewMark = true;
                    }

                    // Notify student about marks assignment
                    try {
                        $student = User::find($studentId);
                        if ($student) {
                            $participationType = $participation->subject_id ? 'Subject' : 'Batch-Level';
                            $subjectText = $participation->subject ? " for {$participation->subject->title}" : '';
                            $notificationTitle = $isNewMark ? 'Class Participation Marks Assigned' : 'Class Participation Marks Updated';
                            
                            $student->sendCrmNotification(
                                'class_participation_marks_assigned',
                                $notificationTitle,
                                "You have been awarded {$obtainedMarks} / {$totalMarks} marks for the class participation '{$participation->title}'{$subjectText}." . ($remarks ? " Remarks: {$remarks}" : ''),
                                [
                                    'url' => '/dashboard/class-participations',
                                    'class_participation_id' => $participation->id,
                                    'obtained_marks' => $obtainedMarks,
                                    'total_marks' => $totalMarks,
                                ]
                            );
                        }
                    } catch (\Exception $e) {
                        // Log error but don't fail the request
                        \Log::warning('Failed to send notification for class participation marks', [
                            'error' => $e->getMessage(),
                            'student_id' => $studentId,
                            'participation_id' => $id,
                        ]);
                    }
                }

                DB::commit();

                // Load relationships
                foreach ($results as $mark) {
                    $mark->load(['student', 'classParticipation']);
                }

                return $this->success($results, 'Marks assigned successfully');
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to assign marks', 500);
        }
    }

    /**
     * Get class participation marks for a specific student (for performance report).
     *
     * @param Request $request
     * @param int $studentId
     * @return JsonResponse
     */
    public function getStudentMarks(Request $request, int $studentId): JsonResponse
    {
        try {
            $query = ClassParticipationMark::where('student_id', $studentId)
                ->with(['classParticipation.batch', 'classParticipation.subject']);

            // Filter by batch if provided
            if ($request->has('batch_id')) {
                $query->whereHas('classParticipation', function ($q) use ($request) {
                    $q->where('batch_id', $request->input('batch_id'));
                });
            }

            $marks = $query->orderBy('created_at', 'desc')->get();

            return $this->success($marks, 'Student class participation marks retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to retrieve student class participation marks', 500);
        }
    }

    /**
     * Get class participations for the authenticated student (filtered by enrolled batches).
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function studentParticipations(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            $userId = $user->id;

            // Get user's batch IDs
            $userBatchIds = [];
            if (DB::getSchemaBuilder()->hasColumn('user_batches', 'user_id')) {
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

            if (empty($userBatchIds)) {
                return $this->success([
                    'participations' => [],
                    'batches' => [],
                    'subjects' => [],
                ], 'No class participations available');
            }

            $query = ClassParticipation::query();

            // Filter by student's enrolled batches
            $query->whereIn('batch_id', $userBatchIds);

            // Filter by batch if provided
            if ($request->has('batch_id') && !empty($request->get('batch_id'))) {
                $query->where('batch_id', $request->get('batch_id'));
            }

            // Filter by subject if provided
            if ($request->has('subject_id') && !empty($request->get('subject_id'))) {
                $subjectId = $request->input('subject_id');
                if ($subjectId === 'null' || $subjectId === null) {
                    // Show only batch-level participations (no subject)
                    $query->whereNull('subject_id');
                } else {
                    $query->where('subject_id', $subjectId);
                }
            }

            $participations = $query->with(['batch', 'subject', 'creator'])
                ->orderBy('participation_date', 'desc')
                ->orderBy('created_at', 'desc')
                ->get();

            // Attach student's mark for each participation
            $participations = $participations->map(function ($participation) use ($userId) {
                $mark = ClassParticipationMark::where('class_participation_id', $participation->id)
                    ->where('student_id', $userId)
                    ->first();
                
                $participation->has_mark = $mark !== null;
                $participation->obtained_marks = $mark ? $mark->obtained_marks : null;
                $participation->total_marks = $mark ? ($mark->total_marks ?? $participation->total_marks) : $participation->total_marks;
                $participation->remarks = $mark ? $mark->remarks : null;
                $participation->marks_count = ClassParticipationMark::where('class_participation_id', $participation->id)->count();
                
                return $participation;
            });

            // Get available batches for filter
            $availableBatches = DB::table('batches')
                ->whereIn('id', $userBatchIds)
                ->where('active', true)
                ->select('id', 'title')
                ->get();

            // Get available subjects for filter (subjects that have participations in user's batches)
            $availableSubjects = DB::table('subjects')
                ->join('class_participations', 'subjects.id', '=', 'class_participations.subject_id')
                ->whereIn('class_participations.batch_id', $userBatchIds)
                ->where('subjects.active', true)
                ->distinct()
                ->select('subjects.id', 'subjects.title')
                ->get();

            return $this->success([
                'participations' => $participations,
                'batches' => $availableBatches,
                'subjects' => $availableSubjects,
            ], 'Class participations retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to retrieve class participations', 500);
        }
    }
}
