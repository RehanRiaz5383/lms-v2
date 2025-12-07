<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProfileController extends ApiController
{
    /**
     * Get current user's profile.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load('userType', 'roles');

        // Add picture URL if available
        if ($user->picture) {
            $user->picture_url = url('/storage/' . $user->picture);
        }

        // Ensure user_type_title is set
        if ($user->userType) {
            $user->user_type_title = $user->userType->title;
        }

        // Format roles for response
        $user->roles = $user->roles->map(function($role) {
            return [
                'id' => $role->id,
                'title' => $role->title,
            ];
        });

        return $this->success($user, 'Profile retrieved successfully');
    }

    /**
     * Update current user's profile.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        // Debug: Log request data
        \Log::info('Profile update request', [
            'has_file' => $request->hasFile('picture'),
            'all_files' => $request->allFiles(),
            'all_input' => array_keys($request->all()),
            'content_type' => $request->header('Content-Type'),
            'method' => $request->method(),
            'input_keys' => array_keys($request->input()),
        ]);

        try {
            $validationRules = [
                'name' => 'sometimes|string|max:255',
                'first_name' => 'nullable|string|max:255',
                'last_name' => 'nullable|string|max:255',
                'email' => 'sometimes|email|unique:users,email,' . $user->id,
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
            \Log::error('Profile update validation failed', ['errors' => $e->errors()]);
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
                \Log::info('Uploading file', [
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                ]);

                // Ensure User_Profile directory exists
                if (!Storage::disk('public')->exists('User_Profile')) {
                    Storage::disk('public')->makeDirectory('User_Profile');
                }

                $fileName = time() . '_' . $user->id . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $file->getClientOriginalName());
                $path = $file->storeAs('User_Profile', $fileName, 'public');
                
                \Log::info('File stored', ['path' => $path, 'full_path' => storage_path('app/public/' . $path)]);
                
                // Verify file exists
                if (!Storage::disk('public')->exists($path)) {
                    \Log::error('File was not stored successfully', ['path' => $path]);
                    return $this->error('Failed to store profile picture', 500);
                }
                
                // Store relative path (without 'storage/' prefix for database)
                $validated['picture'] = $path;
            } catch (\Exception $e) {
                \Log::error('File upload error', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
                return $this->error('Failed to upload profile picture: ' . $e->getMessage(), 500);
            }
        }

        $user->update($validated);
        $user->load('userType', 'roles');

        // Add full URL for picture
        if ($user->picture) {
            $user->picture_url = url('/storage/' . $user->picture);
            \Log::info('Profile picture URL', ['url' => $user->picture_url, 'path' => $user->picture]);
        }

        // Ensure user_type_title is set
        if ($user->userType) {
            $user->user_type_title = $user->userType->title;
        }

        // Format roles for response
        $user->roles = $user->roles->map(function($role) {
            return [
                'id' => $role->id,
                'title' => $role->title,
            ];
        });

        return $this->success($user, 'Profile updated successfully');
    }

    /**
     * Change password.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        try {
            $validated = $request->validate([
                'current_password' => 'required|string',
                'new_password' => 'required|string|min:8|confirmed',
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors(), 'Validation failed');
        }

        // Verify current password
        if (!Hash::check($validated['current_password'], $user->password)) {
            return $this->unauthorized('Invalid current password', [
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        // Update password
        $user->update([
            'password' => Hash::make($validated['new_password']),
        ]);

        return $this->success(null, 'Password changed successfully');
    }
}

