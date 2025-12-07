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
            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'first_name' => 'nullable|string|max:255',
                'last_name' => 'nullable|string|max:255',
                'email' => 'sometimes|email|unique:users,email,' . $id,
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

        // Dispatch event for any user update (all user types)
        if (!empty($changes)) {
            event(new UserUpdated($user, $changes));
        }

        return $this->success($user, 'User updated successfully');
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
        $user = User::find($id);

        if (!$user) {
            return $this->notFound('User not found');
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
     * @param int $id
     * @return JsonResponse
     */
    public function unblock(int $id): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return $this->notFound('User not found');
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

