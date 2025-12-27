<?php

namespace App\Http\Controllers;

use App\Models\Quiz;
use App\Models\QuizMark;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class QuizController extends ApiController
{
    /**
     * Get all quizzes for a batch and optionally a subject.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Quiz::query();

            // Filter by batch_id if provided
            if ($request->has('batch_id')) {
                $query->where('batch_id', $request->input('batch_id'));
            }

            // Filter by subject_id if provided (null means batch-level quiz)
            if ($request->has('subject_id')) {
                $subjectId = $request->input('subject_id');
                if ($subjectId === 'null' || $subjectId === null) {
                    $query->whereNull('subject_id');
                } else {
                    $query->where('subject_id', $subjectId);
                }
            }

            $quizzes = $query->with(['batch', 'subject', 'creator'])
                ->orderBy('quiz_date', 'desc')
                ->orderBy('created_at', 'desc')
                ->get();

            // Attach marks count for each quiz
            $quizzes = $quizzes->map(function ($quiz) {
                $quiz->marks_count = QuizMark::where('quiz_id', $quiz->id)->count();
                return $quiz;
            });

            return $this->success($quizzes, 'Quizzes retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to retrieve quizzes', 500);
        }
    }

    /**
     * Create a new quiz.
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
                'quiz_date' => 'required|date',
                'description' => 'nullable|string',
                'total_marks' => 'nullable|numeric|min:0',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors()->toArray());
            }

            $quizData = [
                'batch_id' => $request->input('batch_id'),
                'quiz_date' => $request->input('quiz_date'),
                'description' => $request->input('description'),
            ];
            
            // Add title if column exists
            if (Schema::hasColumn('quizzes', 'title')) {
                $quizData['title'] = $request->input('title');
            }
            
            // Add subject_id if column exists
            if (Schema::hasColumn('quizzes', 'subject_id')) {
                $quizData['subject_id'] = $request->input('subject_id') ?: null;
            }
            
            // Add total_marks
            if ($request->has('total_marks')) {
                $quizData['total_marks'] = $request->input('total_marks');
            }
            
            // Add created_by if column exists
            if (Schema::hasColumn('quizzes', 'created_by')) {
                $quizData['created_by'] = $request->user()->id;
            }
            
            $quiz = Quiz::create($quizData);

            $quiz->load(['batch', 'subject', 'creator']);

            return $this->success($quiz, 'Quiz created successfully', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to create quiz', 500);
        }
    }

    /**
     * Get a specific quiz.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        try {
            $quiz = Quiz::with(['batch', 'subject', 'creator'])
                ->find($id);

            if (!$quiz) {
                return $this->notFound('Quiz not found');
            }

            $quiz->marks_count = QuizMark::where('quiz_id', $quiz->id)->count();

            return $this->success($quiz, 'Quiz retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to retrieve quiz', 500);
        }
    }

    /**
     * Update a quiz.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $quiz = Quiz::find($id);

            if (!$quiz) {
                return $this->notFound('Quiz not found');
            }

            $validator = Validator::make($request->all(), [
                'title' => 'sometimes|required|string|max:255',
                'batch_id' => 'sometimes|required|exists:batches,id',
                'subject_id' => 'nullable|exists:subjects,id',
                'quiz_date' => 'sometimes|required|date',
                'description' => 'nullable|string',
                'total_marks' => 'nullable|numeric|min:0',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors()->toArray());
            }

            $quiz->update($request->only([
                'title',
                'batch_id',
                'subject_id',
                'quiz_date',
                'description',
                'total_marks',
            ]));

            $quiz->load(['batch', 'subject', 'creator']);

            return $this->success($quiz, 'Quiz updated successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to update quiz', 500);
        }
    }

    /**
     * Delete a quiz.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $quiz = Quiz::find($id);

            if (!$quiz) {
                return $this->notFound('Quiz not found');
            }

            // Delete associated marks
            QuizMark::where('quiz_id', $id)->delete();

            $quiz->delete();

            return $this->success(null, 'Quiz deleted successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to delete quiz', 500);
        }
    }

    /**
     * Get students for a quiz (batch students or batch+subject students).
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function getStudents(int $id): JsonResponse
    {
        try {
            $quiz = Quiz::with(['batch', 'subject'])->find($id);

            if (!$quiz) {
                return $this->notFound('Quiz not found');
            }

            // Get students enrolled in the batch
            $query = DB::table('user_batches')
                ->join('users', 'users.id', '=', 'user_batches.user_id')
                ->where('user_batches.batch_id', $quiz->batch_id)
                ->where('users.user_type', 2) // Students only
                ->select('users.id', 'users.name', 'users.first_name', 'users.last_name', 'users.email');

            // If quiz is subject-specific, filter by students enrolled in that subject
            if ($quiz->subject_id) {
                // Get students who have this subject in their batch
                // For now, we'll return all batch students (subject filtering can be added later if needed)
            }

            $students = $query->orderBy('users.name')
                ->get()
                ->map(function ($student) {
                    $student->full_name = $student->name ?? trim(($student->first_name ?? '') . ' ' . ($student->last_name ?? ''));
                    return $student;
                });

            // Attach existing marks
            $marks = QuizMark::where('quiz_id', $id)
                ->with('student')
                ->get()
                ->keyBy('student_id');

            $students = $students->map(function ($student) use ($marks, $quiz) {
                $mark = $marks->get($student->id);
                $student->has_mark = $mark !== null;
                $student->obtained_marks = $mark ? $mark->obtained_marks : null;
                $student->total_marks = $mark ? ($mark->total_marks ?? $quiz->total_marks) : $quiz->total_marks;
                $student->remarks = $mark ? $mark->remarks : null;
                $student->mark_id = $mark ? $mark->id : null;
                return $student;
            });

            return $this->success([
                'quiz' => $quiz,
                'students' => $students,
            ], 'Students retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to retrieve students', 500);
        }
    }

    /**
     * Assign marks to students for a quiz.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function assignMarks(Request $request, int $id): JsonResponse
    {
        try {
            $quiz = Quiz::find($id);

            if (!$quiz) {
                return $this->notFound('Quiz not found');
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
                    $totalMarks = $markData['total_marks'] ?? $quiz->total_marks ?? $obtainedMarks;
                    $remarks = $markData['remarks'] ?? null;

                    // Check if mark already exists
                    $existingMark = QuizMark::where('quiz_id', $id)
                        ->where('student_id', $studentId)
                        ->first();

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
                        $mark = QuizMark::create([
                            'quiz_id' => $id,
                            'student_id' => $studentId,
                            'obtained_marks' => $obtainedMarks,
                            'total_marks' => $totalMarks,
                            'remarks' => $remarks,
                            'created_by' => $createdBy,
                        ]);
                        $results[] = $mark;
                    }
                }

                DB::commit();

                // Load relationships
                foreach ($results as $mark) {
                    $mark->load(['student', 'quiz']);
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
     * Get quiz marks for a specific student (for performance report).
     *
     * @param Request $request
     * @param int $studentId
     * @return JsonResponse
     */
    public function getStudentMarks(Request $request, int $studentId): JsonResponse
    {
        try {
            $query = QuizMark::where('student_id', $studentId)
                ->with(['quiz.batch', 'quiz.subject']);

            // Filter by batch if provided
            if ($request->has('batch_id')) {
                $query->whereHas('quiz', function ($q) use ($request) {
                    $q->where('batch_id', $request->input('batch_id'));
                });
            }

            $marks = $query->orderBy('created_at', 'desc')->get();

            return $this->success($marks, 'Student quiz marks retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to retrieve student quiz marks', 500);
        }
    }
}
