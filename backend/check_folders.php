<?php

/**
 * Script to check Google Drive folders in database and map them to code usage
 * Run: php check_folders.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\GoogleDriveFolder;

echo "\n=== Google Drive Folders in Database ===\n\n";

$folders = GoogleDriveFolder::all();

if ($folders->isEmpty()) {
    echo "No folders found in database.\n";
    echo "Please add folders using the admin panel at /dashboard/settings/google-drive-folders\n\n";
    exit(0);
}

echo "Found " . $folders->count() . " folder(s):\n\n";

$mapping = [
    'Profile Pictures' => null,
    'Task Files' => null,
    'Submitted Tasks' => null,
    'Voucher Submissions' => null,
    'Videos' => null,
];

foreach ($folders as $folder) {
    echo "ID: {$folder->id}\n";
    echo "  Name: {$folder->name}\n";
    echo "  Display Name: {$folder->display_name}\n";
    echo "  Directory Path: {$folder->directory_path}\n";
    echo "  Folder ID: " . ($folder->folder_id ?: 'NOT SET') . "\n";
    echo "  Active: " . ($folder->is_active ? 'Yes' : 'No') . "\n";
    echo "\n";
    
    // Try to map to known categories
    $nameLower = strtolower($folder->name);
    $displayLower = strtolower($folder->display_name);
    
    if ((strpos($nameLower, 'user') !== false || strpos($nameLower, 'profile') !== false) ||
        (strpos($displayLower, 'user') !== false || strpos($displayLower, 'profile') !== false)) {
        $mapping['Profile Pictures'] = $folder->name;
    }
    if ((strpos($nameLower, 'task') !== false && strpos($nameLower, 'file') !== false) ||
        (strpos($displayLower, 'task') !== false && strpos($displayLower, 'file') !== false)) {
        $mapping['Task Files'] = $folder->name;
    }
    if (strpos($nameLower, 'submitted') !== false || strpos($nameLower, 'submission') !== false ||
        strpos($displayLower, 'submitted') !== false || strpos($displayLower, 'submission') !== false) {
        $mapping['Submitted Tasks'] = $folder->name;
    }
    if (strpos($nameLower, 'voucher') !== false || strpos($displayLower, 'voucher') !== false) {
        $mapping['Voucher Submissions'] = $folder->name;
    }
    if (strpos($nameLower, 'video') !== false || strpos($displayLower, 'video') !== false) {
        $mapping['Videos'] = $folder->name;
    }
}

echo "\n=== Code Mapping Guide ===\n\n";
echo "Use these folder names in your code:\n\n";

if ($mapping['Profile Pictures']) {
    echo "✓ Profile Pictures: Use folder name '{$mapping['Profile Pictures']}'\n";
    echo "  Example: uploadToGoogleDrive(\$file, '{$mapping['Profile Pictures']}')\n\n";
} else {
    echo "✗ Profile Pictures: No matching folder found\n";
    echo "  Expected: folder with 'user' or 'profile' in name\n\n";
}

if ($mapping['Task Files']) {
    echo "✓ Task Files: Use folder name '{$mapping['Task Files']}'\n";
    echo "  Example: uploadToGoogleDrive(\$file, '{$mapping['Task Files']}')\n\n";
} else {
    echo "✗ Task Files: No matching folder found\n";
    echo "  Expected: folder with 'task' and 'file' in name\n\n";
}

if ($mapping['Submitted Tasks']) {
    echo "✓ Submitted Tasks: Use folder name '{$mapping['Submitted Tasks']}'\n";
    echo "  Example: uploadToGoogleDrive(\$file, '{$mapping['Submitted Tasks']}')\n\n";
} else {
    echo "✗ Submitted Tasks: No matching folder found\n";
    echo "  Expected: folder with 'submitted' or 'submission' in name\n\n";
}

if ($mapping['Voucher Submissions']) {
    echo "✓ Voucher Submissions: Use folder name '{$mapping['Voucher Submissions']}'\n";
    echo "  Example: uploadToGoogleDrive(\$file, '{$mapping['Voucher Submissions']}')\n\n";
} else {
    echo "✗ Voucher Submissions: No matching folder found\n";
    echo "  Expected: folder with 'voucher' in name\n\n";
}

if ($mapping['Videos']) {
    echo "✓ Videos: Use folder name '{$mapping['Videos']}'\n";
    echo "  Example: uploadToGoogleDrive(\$file, '{$mapping['Videos']}')\n\n";
} else {
    echo "✗ Videos: No matching folder found (optional)\n";
    echo "  Expected: folder with 'video' in name\n\n";
}

echo "\n=== Current Code Usage ===\n\n";
echo "The code currently uses these folder names:\n";
echo "  - ProfileController: 'user_profile'\n";
echo "  - UserController: 'user_profile'\n";
echo "  - TaskController: 'task_files' and 'submitted_tasks'\n";
echo "  - StudentTaskController: 'submitted_tasks'\n";
echo "  - VoucherController: 'voucher_submissions'\n\n";

echo "=== Next Steps ===\n\n";
echo "1. Check the folder names above\n";
echo "2. If they don't match, update the code to use the exact names from database\n";
echo "3. Or update the database folder names to match the code\n";
echo "4. The lookup is now case-insensitive, so 'User_Profile' will match 'user_profile'\n\n";

