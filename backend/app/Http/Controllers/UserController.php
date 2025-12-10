<?php

namespace App\Http\Controllers;

use App\Events\StudentBlocked;
use App\Events\StudentRegistered;
use App\Events\UserUpdated;
use App\Models\User;
use App\Models\UserType;
use App\Models\Batch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class UserController extends ApiController
{
    /**
     * Get list of users with pagination and filters.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with(['userType', 'roles', 'batches']);

        // Search filter - only apply if search term is not empty
        if ($request->has('search') && !empty($request->get('search'))) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%");
            });
        }

        // User type filter - only apply if value is provided and not empty
        if ($request->has('user_type') && $request->get('user_type') !== '' && $request->get('user_type') !== null) {
            $query->where('user_type', $request->get('user_type'));
        }

        // Block status filter - only apply if value is provided and not empty
        if ($request->has('block') && $request->get('block') !== '' && $request->get('block') !== null) {
            $query->where('block', $request->get('block'));
        }

        // Date range filter
        if ($request->has('date_from') && !empty($request->get('date_from'))) {
            $query->whereDate('created_at', '>=', $request->get('date_from'));
        }
        if ($request->has('date_to') && !empty($request->get('date_to'))) {
            $query->whereDate('created_at', '<=', $request->get('date_to'));
        }

        // Pagination
        $perPage = $request->get('per_page', 15);
        $users = $query->paginate($perPage);

        // Ensure user_type_title and roles are set for each user
        $users->getCollection()->transform(function ($user) {
            // The relationship should be loaded via with('userType', 'roles')
            // Ensure roles are loaded
            if (!$user->relationLoaded('roles')) {
                $user->load('roles');
            }
            // Set user_type_title for backward compatibility (first role or user_type)
            $user->setAttribute('user_type_title', $user->userType?->title ?? 'N/A');
            // Set roles_titles as comma-separated string of all role titles
            $rolesTitles = $user->roles->pluck('title')->toArray();
            if (empty($rolesTitles) && $user->userType) {
                $rolesTitles = [$user->userType->title];
            }
            $user->setAttribute('roles_titles', $rolesTitles);
            $user->setAttribute('roles_display', implode(', ', $rolesTitles));
            return $user;
        });

        return $this->success($users, 'Users retrieved successfully');
    }

    /**
     * Get a single user by ID.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        $user = User::with(['userType', 'batches'])->find($id);

        if (!$user) {
            return $this->notFound('User not found');
        }

        // Append user_type_title and roles_display for easier access
        $user->user_type_title = $user->userType?->title ?? 'N/A';
        $rolesTitles = $user->roles->pluck('title')->toArray();
        if (empty($rolesTitles) && $user->userType) {
            $rolesTitles = [$user->userType->title];
        }
        $user->roles_titles = $rolesTitles;
        $user->roles_display = implode(', ', $rolesTitles);

        return $this->success($user, 'User retrieved successfully');
    }

    /**
     * Create a new user.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'first_name' => 'nullable|string|max:255',
                'last_name' => 'nullable|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:8',
                'user_type' => 'required|integer|exists:user_types,id',
                'contact_no' => 'nullable|string|max:20',
                'emergency_contact_no' => 'nullable|string|max:20',
                'address' => 'nullable|string',
                'country' => 'nullable|string|max:100',
                'city' => 'nullable|string|max:100',
                'guardian_name' => 'nullable|string|max:255',
                'guardian_email' => 'nullable|email',
                'guardian_contact_no' => 'nullable|string|max:20',
                'fees' => 'nullable|numeric',
                'expected_fee_promise_date' => 'nullable|integer|min:1|max:31',
                'requested_course' => 'nullable|string',
                'source' => 'nullable|string',
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors(), 'Validation failed');
        }

        // Hash password
        $validated['password'] = Hash::make($validated['password']);

        // Extract role_ids before creating user
        $roleIds = $validated['role_ids'] ?? [];
        unset($validated['role_ids']);

        // Set user_type to first role for backward compatibility
        if (!empty($roleIds)) {
            $validated['user_type'] = $roleIds[0];
        }

        $user = User::create($validated);
        
        // Assign roles
        if (!empty($roleIds)) {
            $user->roles()->sync($roleIds);
        }
        
        $user->load('userType', 'roles');
        $user->user_type_title = $user->userType?->title ?? 'N/A';
        $rolesTitles = $user->roles->pluck('title')->toArray();
        if (empty($rolesTitles) && $user->userType) {
            $rolesTitles = [$user->userType->title];
        }
        $user->roles_titles = $rolesTitles;
        $user->roles_display = implode(', ', $rolesTitles);

        // Dispatch event if user has student role (role ID = 2)
        if (in_array(2, $roleIds)) {
            event(new StudentRegistered($user));
        }

        return $this->success($user, 'User created successfully', 201);
    }

    /**
     * Update a user.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return $this->notFound('User not found');
        }

        try {
            $validationRules = [
                'name' => 'sometimes|string|max:255',
                'first_name' => 'nullable|string|max:255',
                'last_name' => 'nullable|string|max:255',
                'email' => 'sometimes|email|unique:users,email,' . $id,
                'password' => 'sometimes|string|min:8',
                'contact_no' => 'nullable|string|max:20',
                'emergency_contact_no' => 'nullable|string|max:20',
                'address' => 'nullable|string',
                'country' => 'nullable|string|max:100',
                'city' => 'nullable|string|max:100',
                'guardian_name' => 'nullable|string|max:255',
                'guardian_email' => 'nullable|email',
                'guardian_contact_no' => 'nullable|string|max:20',
                'fees' => 'nullable|numeric',
                'expected_fee_promise_date' => 'nullable|integer|min:1|max:31',
                'requested_course' => 'nullable|string',
                'source' => 'nullable|string',
            ];
            
            // Only validate picture if it's being uploaded
            if ($request->hasFile('picture')) {
                $validationRules['picture'] = 'required|image|mimes:jpeg,png,jpg,gif|max:2048'; // 2MB max
            }
            
            $validated = $request->validate($validationRules);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors(), 'Validation failed');
        }

        // Handle profile picture upload
        if ($request->hasFile('picture')) {
            try {
                // Delete old picture if exists
                if ($user->picture) {
                    $oldPicturePath = str_replace('storage/', '', $user->picture);
                    if (Storage::disk('public')->exists($oldPicturePath)) {
                        Storage::disk('public')->delete($oldPicturePath);
                    }
                }

                // Store new picture
                $file = $request->file('picture');
                
                // Ensure User_Profile directory exists
                if (!Storage::disk('public')->exists('User_Profile')) {
                    Storage::disk('public')->makeDirectory('User_Profile');
                }

                $fileName = time() . '_' . $user->id . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $file->getClientOriginalName());
                $path = $file->storeAs('User_Profile', $fileName, 'public');
                
                // Store relative path
                $validated['picture'] = $path;
            } catch (\Exception $e) {
                return $this->error('Failed to upload profile picture: ' . $e->getMessage(), 500);
            }
        }

        // Hash password if provided
        if (isset($validated['password']) && !empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            // Remove password from validated data if not provided or empty
            unset($validated['password']);
        }

        // Track changes for notification
        $changes = array_intersect_key($validated, array_flip([
            'name', 'email', 'contact_no', 'address', 'fees'
        ]));

        $user->update($validated);
        $user->load('userType', 'roles');
        $user->user_type_title = $user->userType?->title ?? 'N/A';
        $rolesTitles = $user->roles->pluck('title')->toArray();
        if (empty($rolesTitles) && $user->userType) {
            $rolesTitles = [$user->userType->title];
        }
        $user->roles_titles = $rolesTitles;
        $user->roles_display = implode(', ', $rolesTitles);
        
        // Add picture URL if available
        if ($user->picture) {
            $user->picture_url = url('/load-storage/' . $user->picture);
        }

        // Dispatch event for any user update (all user types)
        if (!empty($changes)) {
            event(new UserUpdated($user, $changes));
        }

        return $this->success($user, 'User updated successfully');
    }

    /**
     * Update a student (for CR/Teacher - limited access).
     * CR/Teacher can only update students in batches they are assigned to.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function updateStudent(Request $request, int $id): JsonResponse
    {
        $currentUser = $request->user();
        $student = User::find($id);

        if (!$student) {
            return $this->notFound('Student not found');
        }

        // Check if current user is admin, teacher, or CR
        $currentUser->load('roles');
        $isAdmin = $currentUser->roles->contains(function ($role) {
            return strtolower($role->title) === 'admin';
        }) || $currentUser->user_type == 1;
        
        $isTeacherOrCR = $currentUser->roles->contains(function ($role) {
            $title = strtolower($role->title);
            return $title === 'teacher' || $title === 'class representative (cr)';
        });

        if (!$isAdmin && !$isTeacherOrCR) {
            return $this->error('Unauthorized. Only admins, teachers, and class representatives can update students.', 403);
        }

        // If not admin, verify that student is in a batch assigned to the teacher/CR
        if (!$isAdmin) {
            $studentBatches = DB::table('user_batches')
                ->where('user_id', $student->id)
                ->pluck('batch_id')
                ->toArray();
            
            $teacherBatches = DB::table('user_batches')
                ->where('user_id', $currentUser->id)
                ->pluck('batch_id')
                ->toArray();
            
            $hasCommonBatch = !empty(array_intersect($studentBatches, $teacherBatches));
            
            if (!$hasCommonBatch) {
                return $this->error('Unauthorized. You can only update students in batches assigned to you.', 403);
            }
        }

        // Verify student has student role
        $student->load('roles');
        $isStudent = $student->roles->contains(function ($role) {
            return strtolower($role->title) === 'student';
        }) || $student->user_type == 2;

        if (!$isStudent) {
            return $this->error('User is not a student', 400);
        }

        try {
            $validationRules = [
                'name' => 'sometimes|string|max:255',
                'first_name' => 'nullable|string|max:255',
                'last_name' => 'nullable|string|max:255',
                'email' => 'sometimes|email|unique:users,email,' . $id,
                'password' => 'sometimes|string|min:8',
                'contact_no' => 'nullable|string|max:20',
                'emergency_contact_no' => 'nullable|string|max:20',
                'address' => 'nullable|string',
                'country' => 'nullable|string|max:100',
                'city' => 'nullable|string|max:100',
                'guardian_name' => 'nullable|string|max:255',
                'guardian_email' => 'nullable|email',
                'guardian_contact_no' => 'nullable|string|max:20',
            ];
            
            // Only validate picture if it's being uploaded
            if ($request->hasFile('picture')) {
                $validationRules['picture'] = 'required|image|mimes:jpeg,png,jpg,gif|max:2048'; // 2MB max
            }
            
            $validated = $request->validate($validationRules);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors(), 'Validation failed');
        }

        // Handle profile picture upload
        if ($request->hasFile('picture')) {
            try {
                // Delete old picture if exists
                if ($student->picture) {
                    $oldPicturePath = str_replace('storage/', '', $student->picture);
                    if (Storage::disk('public')->exists($oldPicturePath)) {
                        Storage::disk('public')->delete($oldPicturePath);
                    }
                }

                // Store new picture
                $file = $request->file('picture');
                
                // Ensure User_Profile directory exists
                if (!Storage::disk('public')->exists('User_Profile')) {
                    Storage::disk('public')->makeDirectory('User_Profile');
                }

                $fileName = time() . '_' . $student->id . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $file->getClientOriginalName());
                $path = $file->storeAs('User_Profile', $fileName, 'public');
                
                // Store relative path
                $validated['picture'] = $path;
            } catch (\Exception $e) {
                return $this->error('Failed to upload profile picture: ' . $e->getMessage(), 500);
            }
        }

        // Hash password if provided
        if (isset($validated['password']) && !empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            // Remove password from validated data if not provided or empty
            unset($validated['password']);
        }

        $student->update($validated);
        $student->load('userType', 'roles');
        $student->user_type_title = $student->userType?->title ?? 'N/A';
        $rolesTitles = $student->roles->pluck('title')->toArray();
        if (empty($rolesTitles) && $student->userType) {
            $rolesTitles = [$student->userType->title];
        }
        $student->roles_titles = $rolesTitles;
        $student->roles_display = implode(', ', $rolesTitles);
        
        // Add picture URL if available
        if ($student->picture) {
            $student->picture_url = url('/load-storage/' . $student->picture);
        }

        return $this->success($student, 'Student updated successfully');
    }

    /**
     * Delete a user (soft delete).
     *
     * @param int $id
     * @return JsonResponse
     */
    public function destroy(int $id): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return $this->notFound('User not found');
        }

        $user->delete();

        return $this->success(null, 'User deleted successfully');
    }

    /**
     * Block a user.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function block(Request $request, int $id): JsonResponse
    {
        $currentUser = $request->user();
        $user = User::find($id);

        if (!$user) {
            return $this->notFound('User not found');
        }

        // Check if current user is admin, teacher, or CR
        $currentUser->load('roles');
        $isAdmin = $currentUser->roles->contains(function ($role) {
            return strtolower($role->title) === 'admin';
        }) || $currentUser->user_type == 1;
        
        $isTeacherOrCR = $currentUser->roles->contains(function ($role) {
            $title = strtolower($role->title);
            return $title === 'teacher' || $title === 'class representative (cr)';
        });

        if (!$isAdmin && !$isTeacherOrCR) {
            return $this->error('Unauthorized. Only admins, teachers, and class representatives can block users.', 403);
        }

        // If not admin, verify that user is a student in a batch assigned to the teacher/CR
        if (!$isAdmin) {
            $user->load('roles');
            $isStudent = $user->roles->contains(function ($role) {
                return strtolower($role->title) === 'student';
            }) || $user->user_type == 2;

            if (!$isStudent) {
                return $this->error('You can only block students', 403);
            }

            $studentBatches = DB::table('user_batches')
                ->where('user_id', $user->id)
                ->pluck('batch_id')
                ->toArray();
            
            $teacherBatches = DB::table('user_batches')
                ->where('user_id', $currentUser->id)
                ->pluck('batch_id')
                ->toArray();
            
            $hasCommonBatch = !empty(array_intersect($studentBatches, $teacherBatches));
            
            if (!$hasCommonBatch) {
                return $this->error('Unauthorized. You can only block students in batches assigned to you.', 403);
            }
        }

        try {
            $validated = $request->validate([
                'block_reason' => 'nullable|string|max:500',
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors(), 'Validation failed');
        }

        $user->update([
            'block' => 1,
            'block_reason' => $validated['block_reason'] ?? null,
        ]);

        $user->load('userType', 'roles');
        $user->user_type_title = $user->userType?->title ?? 'N/A';
        $rolesTitles = $user->roles->pluck('title')->toArray();
        if (empty($rolesTitles) && $user->userType) {
            $rolesTitles = [$user->userType->title];
        }
        $user->roles_titles = $rolesTitles;
        $user->roles_display = implode(', ', $rolesTitles);

        // Dispatch event if user has student role (role ID = 2)
        if ($user->hasRole(2) || $user->user_type == 2) {
            event(new StudentBlocked($user, $validated['block_reason'] ?? null));
        }

        return $this->success($user, 'User blocked successfully');
    }

    /**
     * Unblock a user.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function unblock(Request $request, int $id): JsonResponse
    {
        $currentUser = $request->user();
        $user = User::find($id);

        if (!$user) {
            return $this->notFound('User not found');
        }

        // Check if current user is admin, teacher, or CR
        $currentUser->load('roles');
        $isAdmin = $currentUser->roles->contains(function ($role) {
            return strtolower($role->title) === 'admin';
        }) || $currentUser->user_type == 1;
        
        $isTeacherOrCR = $currentUser->roles->contains(function ($role) {
            $title = strtolower($role->title);
            return $title === 'teacher' || $title === 'class representative (cr)';
        });

        if (!$isAdmin && !$isTeacherOrCR) {
            return $this->error('Unauthorized. Only admins, teachers, and class representatives can unblock users.', 403);
        }

        // If not admin, verify that user is a student in a batch assigned to the teacher/CR
        if (!$isAdmin) {
            $user->load('roles');
            $isStudent = $user->roles->contains(function ($role) {
                return strtolower($role->title) === 'student';
            }) || $user->user_type == 2;

            if (!$isStudent) {
                return $this->error('You can only unblock students', 403);
            }

            $studentBatches = DB::table('user_batches')
                ->where('user_id', $user->id)
                ->pluck('batch_id')
                ->toArray();
            
            $teacherBatches = DB::table('user_batches')
                ->where('user_id', $currentUser->id)
                ->pluck('batch_id')
                ->toArray();
            
            $hasCommonBatch = !empty(array_intersect($studentBatches, $teacherBatches));
            
            if (!$hasCommonBatch) {
                return $this->error('Unauthorized. You can only unblock students in batches assigned to you.', 403);
            }
        }

        $user->update([
            'block' => 0,
            'block_reason' => null,
        ]);

        $user->load('userType', 'roles');
        $user->user_type_title = $user->userType?->title ?? 'N/A';
        $rolesTitles = $user->roles->pluck('title')->toArray();
        if (empty($rolesTitles) && $user->userType) {
            $rolesTitles = [$user->userType->title];
        }
        $user->roles_titles = $rolesTitles;
        $user->roles_display = implode(', ', $rolesTitles);

        return $this->success($user, 'User unblocked successfully');
    }

    /**
     * Get user types for dropdown.
     *
     * @return JsonResponse
     */
    public function getUserTypes(): JsonResponse
    {
        $userTypes = UserType::all();

        return $this->success($userTypes, 'User types retrieved successfully');
    }

    /**
     * Assign batches to a user.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function assignBatches(Request $request, int $id): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return $this->notFound('User not found');
        }

        // Only allow batch assignment for teachers (user_type = 3) and students (user_type = 2)
        // Based on API docs: 1=Admin, 2=Student, 3=Teacher, 4=CHECKER
        if (!in_array((int)$user->user_type, [2, 3])) {
            return $this->error(null, 'Batch assignment is only available for teachers and students', 403);
        }

        try {
            $validated = $request->validate([
                'batch_ids' => 'required|array',
                'batch_ids.*' => 'exists:batches,id',
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors(), 'Validation failed');
        }

        $user->batches()->sync($validated['batch_ids']);
        $user->load('batches', 'roles', 'userType');
        $user->user_type_title = $user->userType?->title ?? 'N/A';
        $rolesTitles = $user->roles->pluck('title')->toArray();
        if (empty($rolesTitles) && $user->userType) {
            $rolesTitles = [$user->userType->title];
        }
        $user->roles_titles = $rolesTitles;
        $user->roles_display = implode(', ', $rolesTitles);

        return $this->success($user, 'Batches assigned successfully');
    }

    /**
     * Get available batches for assignment.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function getAvailableBatches(Request $request, int $id): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return $this->notFound('User not found');
        }

        $query = Batch::query();

        // Search filter
        if ($request->has('search') && !empty($request->get('search'))) {
            $search = $request->get('search');
            $query->where('title', 'like', "%{$search}%");
        }

        // Get all batches (not excluding assigned ones, so user can see and manage them)
        // Note: Removed active filter to show all batches, including inactive ones that might be assigned
        $batches = $query->get();
        
        // Get assigned batch IDs directly from pivot table to ensure we get all assignments
        // This works even if batches are soft-deleted
        $assignedBatchIds = \DB::table('user_batches')
            ->where('user_id', $id)
            ->pluck('batch_id')
            ->toArray();

        return $this->success([
            'batches' => $batches,
            'assigned_ids' => $assignedBatchIds,
        ], 'Batches retrieved successfully');
    }

    /**
     * Assign roles to a user.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function assignRoles(Request $request, int $id): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return $this->notFound('User not found');
        }

        try {
            $validated = $request->validate([
                'role_ids' => 'required|array',
                'role_ids.*' => 'exists:user_types,id',
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors(), 'Validation failed');
        }

        $user->roles()->sync($validated['role_ids']);
        // Update user_type to first role for backward compatibility
        if (!empty($validated['role_ids'])) {
            $user->update(['user_type' => $validated['role_ids'][0]]);
        }
        $user->load('roles', 'userType');
        $user->user_type_title = $user->userType?->title ?? 'N/A';
        $rolesTitles = $user->roles->pluck('title')->toArray();
        if (empty($rolesTitles) && $user->userType) {
            $rolesTitles = [$user->userType->title];
        }
        $user->roles_titles = $rolesTitles;
        $user->roles_display = implode(', ', $rolesTitles);

        return $this->success($user, 'Roles assigned successfully');
    }

    /**
     * Get available roles for assignment.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function getAvailableRoles(Request $request, int $id): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return $this->notFound('User not found');
        }

        $query = UserType::query();

        // Search filter
        if ($request->has('search') && !empty($request->get('search'))) {
            $search = $request->get('search');
            $query->where('title', 'like', "%{$search}%");
        }

        // Get all roles
        $roles = $query->get();
        
        // Get assigned role IDs directly from pivot table to ensure we get all assignments
        $assignedRoleIds = DB::table('user_roles')
            ->where('user_id', $id)
            ->pluck('role_id')
            ->toArray();

        return $this->success([
            'roles' => $roles,
            'assigned_ids' => $assignedRoleIds,
        ], 'Roles retrieved successfully');
    }
}

