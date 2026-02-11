# Backfill Google Drive File IDs for Videos

This guide explains how to backfill Google Drive file IDs for existing videos that are already stored on Google Drive but don't have the `google_drive_file_id` stored in the database.

## Overview

When videos are uploaded to Google Drive, the system now automatically stores the Google Drive file ID. However, videos that were uploaded before this feature was implemented don't have the file ID stored. This script searches Google Drive for these existing videos and updates the database with their file IDs.

## Prerequisites

1. **Google Drive Folder Configuration**: Ensure the 'videos' folder is configured in the database:
   - Go to **Settings > Google Drive Folders** in the admin panel
   - Verify that the 'videos' folder exists and has a valid folder ID
   - The folder should have `name = 'videos'` and `directory_path = 'lms/videos'` (or similar)

2. **Google Drive API Credentials**: Ensure your `.env` file has:
   ```env
   GOOGLE_DRIVE_CLIENT_ID=your_client_id
   GOOGLE_DRIVE_CLIENT_SECRET=your_client_secret
   GOOGLE_DRIVE_REFRESH_TOKEN=your_refresh_token
   GOOGLE_DRIVE_API_KEY=your_api_key
   ```

3. **Database Migration**: Ensure the migration has been run:
   ```bash
   php artisan migrate
   ```

## Running the Script

### Basic Usage

Run the command to process all videos that need file IDs:

```bash
cd backend
php artisan videos:backfill-google-drive-ids
```

### Dry Run (Recommended First)

Before making actual changes, run in dry-run mode to see what would be updated:

```bash
php artisan videos:backfill-google-drive-ids --dry-run
```

This will show you:
- How many videos will be processed
- Which videos will be updated
- Which videos cannot be found
- Any errors that occur

**No changes will be made to the database in dry-run mode.**

### Limit Processing

To process only a limited number of videos (useful for testing):

```bash
php artisan videos:backfill-google-drive-ids --limit=10
```

### Combined Options

You can combine options:

```bash
# Dry run with limit
php artisan videos:backfill-google-drive-ids --dry-run --limit=5

# Process first 50 videos
php artisan videos:backfill-google-drive-ids --limit=50
```

## How It Works

1. **Finds Videos**: The script finds all videos with:
   - `source_type = 'internal'`
   - `google_drive_file_id IS NULL`
   - `path IS NOT NULL`

2. **Extracts Filename**: For each video, it extracts the filename from the stored path (e.g., `lms/videos/video.mp4` → `video.mp4`)

3. **Searches Google Drive**: Searches for the file in the configured 'videos' folder on Google Drive

4. **Updates Database**: If found, updates the video record with the Google Drive file ID

## Output

The script provides:
- Progress bar showing processing status
- Summary table with:
  - **Successfully updated**: Videos that were found and updated
  - **Not found in Google Drive**: Videos that couldn't be found (may need manual review)
  - **Failed**: Videos that encountered errors during processing
  - **Total processed**: Total number of videos processed

## Example Output

```
Starting Google Drive file ID backfill for videos...

Found 25 video(s) to process.

Using Google Drive folder: Videos (ID: 1xtWMwk6jZNmz3RB0_IN5y3W0RlbSf31B)

 25/25 [████████████████████████] 100%

Backfill Summary:
+----------------------+-------+
| Status               | Count |
+----------------------+-------+
| Successfully updated | 23    |
| Not found            | 2     |
| Failed               | 0     |
| Total processed      | 25    |
+----------------------+-------+
```

## Troubleshooting

### "Videos folder is not configured"

**Error**: `Videos folder is not configured in Google Drive Folders`

**Solution**:
1. Go to **Settings > Google Drive Folders** in admin panel
2. Add or update the 'videos' folder entry
3. Ensure it has a valid folder ID

### "No videos found"

**Message**: `No videos found that need file ID backfill`

**Meaning**: All videos already have file IDs, or there are no internal videos in the database.

### Videos Not Found

If videos show as "Not found in Google Drive", possible reasons:
- File was deleted from Google Drive
- File was moved to a different folder
- Filename doesn't match exactly (check for typos or different naming)
- File is in a different Google Drive account

**Solution**: 
- Check Google Drive manually for the file
- Verify the filename matches exactly
- If file exists but with different name, you may need to update the path in the database first

### Authentication Errors

**Error**: `Failed to initialize Google Drive client`

**Solution**:
- Verify Google Drive credentials in `.env`
- Check that the refresh token is valid
- Ensure the service account/user has access to the videos folder

## After Running

Once the backfill is complete:

1. **Verify Results**: Check a few videos in the admin panel to ensure they have file IDs
2. **Test Downloads**: Try downloading a video to verify direct download works
3. **Monitor**: Check logs for any errors: `storage/logs/laravel.log`

## Notes

- The script processes videos one at a time to avoid rate limiting
- If a video has multiple files with the same name in Google Drive, it uses the first match
- The script is safe to run multiple times (it only updates videos without file IDs)
- Videos that already have file IDs are skipped automatically

## Manual Update (If Needed)

If a video cannot be found automatically, you can manually update it:

1. Find the video file in Google Drive
2. Get the file ID from the URL: `https://drive.google.com/file/d/FILE_ID_HERE/view`
3. Update the database:
   ```sql
   UPDATE videos 
   SET google_drive_file_id = 'FILE_ID_HERE' 
   WHERE id = VIDEO_ID;
   ```

Or use Laravel Tinker:
```bash
php artisan tinker
```
```php
$video = Video::find(VIDEO_ID);
$video->google_drive_file_id = 'FILE_ID_HERE';
$video->save();
```

