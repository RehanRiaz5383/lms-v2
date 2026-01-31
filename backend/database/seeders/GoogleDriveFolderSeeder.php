<?php

namespace Database\Seeders;

use App\Models\GoogleDriveFolder;
use Illuminate\Database\Seeder;

class GoogleDriveFolderSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $folders = [
            [
                'name' => 'user_profile',
                'display_name' => 'User Profile',
                'directory_path' => 'lms/User_Profile',
                'folder_id' => env('GOOGLE_DRIVE_FOLDER_USER_PROFILE', '1vKLAY4Yc3LSs8a9Mcn7DWn2gVGCuxbjF'),
                'description' => 'Folder for storing user profile pictures',
                'is_active' => true,
            ],
            [
                'name' => 'task_files',
                'display_name' => 'Task Files',
                'directory_path' => 'lms/Task_Files',
                'folder_id' => env('GOOGLE_DRIVE_FOLDER_TASK_FILES', ''),
                'description' => 'Folder for storing task files uploaded by teachers/admins',
                'is_active' => true,
            ],
            [
                'name' => 'submitted_tasks',
                'display_name' => 'Submitted Tasks',
                'directory_path' => 'lms/submitted_tasks',
                'folder_id' => env('GOOGLE_DRIVE_FOLDER_SUBMITTED_TASKS', ''),
                'description' => 'Folder for storing student task submissions',
                'is_active' => true,
            ],
            [
                'name' => 'voucher_submissions',
                'display_name' => 'Voucher Submissions',
                'directory_path' => 'lms/voucher_submissions',
                'folder_id' => env('GOOGLE_DRIVE_FOLDER_VOUCHER_SUBMISSIONS', ''),
                'description' => 'Folder for storing payment proof files for vouchers',
                'is_active' => true,
            ],
            [
                'name' => 'videos',
                'display_name' => 'Videos',
                'directory_path' => 'lms/videos',
                'folder_id' => env('GOOGLE_DRIVE_FOLDER_VIDEOS', ''),
                'description' => 'Folder for storing video files',
                'is_active' => true,
            ],
            [
                'name' => 'feed',
                'display_name' => 'Feed',
                'directory_path' => 'lms/feed',
                'folder_id' => env('GOOGLE_DRIVE_FOLDER_FEED', ''),
                'description' => 'Folder for storing feed/media files',
                'is_active' => true,
            ],
        ];

        foreach ($folders as $folder) {
            GoogleDriveFolder::updateOrCreate(
                ['name' => $folder['name']],
                $folder
            );
        }
    }
}
