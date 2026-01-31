<?php

namespace App\Http\Controllers;

use App\Models\GoogleDriveFolder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class GoogleDriveFolderController extends ApiController
{
    /**
     * Get all Google Drive folders
     */
    public function index(): JsonResponse
    {
        $folders = GoogleDriveFolder::orderBy('display_name')->get();
        return $this->success($folders, 'Google Drive folders retrieved successfully');
    }

    /**
     * Get a single Google Drive folder
     */
    public function show(int $id): JsonResponse
    {
        $folder = GoogleDriveFolder::find($id);
        
        if (!$folder) {
            return $this->notFound('Google Drive folder not found');
        }

        return $this->success($folder, 'Google Drive folder retrieved successfully');
    }

    /**
     * Create a new Google Drive folder
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:google_drive_folders,name',
            'display_name' => 'required|string|max:255',
            'directory_path' => 'required|string|max:255',
            'folder_id' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors()->toArray());
        }

        $folder = GoogleDriveFolder::create($request->only([
            'name',
            'display_name',
            'directory_path',
            'folder_id',
            'description',
            'is_active',
        ]));

        return $this->success($folder, 'Google Drive folder created successfully', 201);
    }

    /**
     * Update a Google Drive folder
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $folder = GoogleDriveFolder::find($id);
        
        if (!$folder) {
            return $this->notFound('Google Drive folder not found');
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255|unique:google_drive_folders,name,' . $id,
            'display_name' => 'sometimes|required|string|max:255',
            'directory_path' => 'sometimes|required|string|max:255',
            'folder_id' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors()->toArray());
        }

        $folder->update($request->only([
            'name',
            'display_name',
            'directory_path',
            'folder_id',
            'description',
            'is_active',
        ]));

        return $this->success($folder, 'Google Drive folder updated successfully');
    }

    /**
     * Delete a Google Drive folder
     */
    public function destroy(int $id): JsonResponse
    {
        $folder = GoogleDriveFolder::find($id);
        
        if (!$folder) {
            return $this->notFound('Google Drive folder not found');
        }

        // Don't allow deletion of system folders (those that are in use)
        $systemFolders = ['user_profile', 'task_files', 'submitted_tasks', 'voucher_submissions'];
        if (in_array($folder->name, $systemFolders)) {
            return $this->error('Cannot delete system folders. You can only deactivate them.', 'Deletion not allowed', 403);
        }

        $folder->delete();

        return $this->success(null, 'Google Drive folder deleted successfully');
    }
}
