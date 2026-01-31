# Google Drive Folder Mapping

## Database Folders (as of check)

1. **User_Profile** (ID: 1)
   - Display Name: Profile Pictures Directory
   - Directory Path: `lms/User_Profile`
   - Folder ID: `1vKLAY4Yc3LSs8a9Mcn7DWn2gVGCuxbjF`
   - **Code Usage**: `uploadToGoogleDrive($file, 'User_Profile')`
   - **Updated in**: ProfileController, UserController

2. **submitted_tasks** (ID: 2)
   - Display Name: Submitted Tasks Directory
   - Directory Path: `lms/submitted_tasks`
   - Folder ID: `10cEJDpU6eNuk22_jFPNV8J18seYcark1`
   - **Code Usage**: `uploadToGoogleDrive($file, 'submitted_tasks')`
   - **Updated in**: TaskController, StudentTaskController

3. **Task_Files** (ID: 3)
   - Display Name: Task Files Directory
   - Directory Path: `lms/tasks`
   - Folder ID: `1iT6aDcWOEFg44WrAqDtxSGlQPIITL_zS`
   - **Code Usage**: `uploadToGoogleDrive($file, 'Task_Files')`
   - **Updated in**: TaskController

4. **videos** (ID: 4)
   - Display Name: Internal Videos
   - Directory Path: `lms/videos`
   - Folder ID: `1xtWMwk6jZNmz3RB0_IN5y3W0RlbSf31B`
   - **Code Usage**: `uploadToGoogleDrive($file, 'videos')`
   - **Note**: Not currently used in code, but available for future use

## Missing Folder

- **voucher_submissions**: Used in VoucherController but not found in database
  - **Action Required**: Add this folder to the database via admin panel
  - **Suggested Name**: `voucher_submissions` or `Voucher_Submissions`
  - **Suggested Directory Path**: `lms/voucher_submissions`

## Code Updates Made

✅ **ProfileController.php**: Changed `'user_profile'` → `'User_Profile'`
✅ **UserController.php**: Changed `'user_profile'` → `'User_Profile'`
✅ **TaskController.php**: Changed `'task_files'` → `'Task_Files'`
✅ **submitted_tasks**: Already matches (no change needed)
✅ **GoogleDriveFolder Model**: Enhanced with case-insensitive lookup

## Lookup Behavior

The `GoogleDriveFolder::getByName()` method now supports:
- Exact match (case-sensitive)
- Case-insensitive match on `name`
- Case-insensitive match on `display_name`
- Partial match (removes underscores and compares)

This means `'user_profile'` will still match `'User_Profile'` in the database, but using the exact name is recommended for clarity.

## Testing

Run the check script to verify mappings:
```bash
cd backend
php check_folders.php
```

Or use the API endpoint:
```
GET /api/test/google-drive-folders
```

