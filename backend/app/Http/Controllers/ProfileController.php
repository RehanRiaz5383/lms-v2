<?php

namespace App\Http\Controllers;

use App\Traits\UploadsToGoogleDrive;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

class ProfileController extends ApiController
{
    use UploadsToGoogleDrive;
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

        // The picture_url accessor (getPictureUrlAttribute) will automatically be used
        // when the model is serialized to JSON. It correctly handles both Google Drive
        // paths (lms/User_Profile/...) and legacy local storage paths.
        // No need to manually set it - just access it to ensure it's included in JSON
        if ($user->picture) {
            // Access the property to trigger the accessor and include it in JSON
            $user->picture_url;
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
                $validationRules['picture'] = 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048'; // 2MB max
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
                    try {
                        // Try to delete old picture (don't fail if it doesn't exist)
                        $oldPath = $user->picture;
                        if (strpos($oldPath, 'lms/User_Profile/') === 0 || strpos($oldPath, 'lms/User_Profile/') !== false || strpos($oldPath, 'User_Profile/') !== false) {
                            // Path is already in correct format (with or without lms prefix)
                            try {
                                // Ensure path has lms prefix
                                if (strpos($oldPath, 'lms/User_Profile/') !== 0) {
                                    $oldPath = 'lms/' . $oldPath;
                                }
                                Storage::disk('google')->delete($oldPath);
                            } catch (\Exception $e) {
                                \Log::warning('Could not delete old picture from Google Drive', [
                                    'path' => $oldPath,
                                    'error' => $e->getMessage()
                                ]);
                            }
                        }
                    } catch (\Exception $e) {
                        \Log::warning('Error deleting old picture', ['error' => $e->getMessage()]);
                        // Continue with upload even if deletion fails
                    }
                }

                // Store new picture
                $file = $request->file('picture');
                \Log::info('Uploading file to Google Drive', [
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                ]);

                // Upload to Google Drive using folder name (from database)
                $remoteFilePath = $this->uploadToGoogleDrive($file, 'User_Profile');
                
                // Store relative path for database
                $validated['picture'] = $remoteFilePath;
            } catch (\Exception $e) {
                \Log::error('Google Drive file upload error', [
                    'error' => $e->getMessage(),
                    'error_class' => get_class($e),
                    'trace' => $e->getTraceAsString(),
                ]);
                return $this->error('Failed to upload profile picture: ' . $e->getMessage(), 500);
            }
        }

        $user->update($validated);
        $user->load('userType', 'roles');

        // Add full URL for picture (Google Drive)
        if ($user->picture) {
            $user->picture_url = url('/api/storage/google/' . $user->picture);
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

