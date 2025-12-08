# Deployment Notes for Shared Hosting

## Important: Stored Procedures

**Shared hosting typically does not support stored procedures.** If you're importing a database dump that contains stored procedures (like `GetStudentTaskMarks`), you need to remove them before importing.

### How to Remove Stored Procedures from SQL Dump:

1. Open your SQL dump file in a text editor
2. Search for `CREATE PROCEDURE` or `PROCEDURE`
3. Remove all stored procedure definitions (from `CREATE PROCEDURE` to `END;`)
4. Save the file
5. Import the cleaned SQL file

### Example of what to remove:
```sql
CREATE DEFINER='root'@'localhost' PROCEDURE 'GetStudentTaskMarks' (IN `studentid` INT) 
BEGIN 
  -- procedure body
END;
```

## CORS Configuration

CORS is configured in `backend/config/cors.php`. For production, you may want to restrict `allowed_origins` to your specific frontend domain instead of `['*']`.

## Storage Files

The application uses a route-based storage system (`/storage/{path}`) instead of symlinks, which works on shared hosting. Files are stored in `storage/app/public/` and served through the web route.

### If Storage Route Returns 403 Forbidden

If you're getting **403 Forbidden** errors when accessing `/storage/*` URLs, you can use the direct PHP file approach:

1. **Enable Direct Storage Mode** - Add to your `.env` file:
   ```
   USE_DIRECT_STORAGE=true
   ```

2. **Upload `storage.php`** - Make sure `public/storage.php` is uploaded to your domain root (public directory).

3. **Access Files** - Files will now be accessed via:
   ```
   https://yourdomain.com/storage.php?file=User_Profile/image.jpg
   ```

The direct PHP approach bypasses Laravel routing and works even if routes are blocked by server configuration.

### File Permissions (Important for Shared Hosting)

If you're getting **403 Forbidden** errors when accessing uploaded files, you need to set proper file permissions:

**Via cPanel File Manager:**
1. Navigate to `storage/app/public/User_Profile/` (or other storage directories)
2. Right-click on files/folders → Change Permissions
3. Set permissions to:
   - **Files**: `644` (readable by owner and group, readable by others)
   - **Directories**: `755` (readable and executable by owner, readable by others)

**Via SSH (if available):**
```bash
# Set directory permissions
find storage/app/public -type d -exec chmod 755 {} \;

# Set file permissions
find storage/app/public -type f -exec chmod 644 {} \;
```

**Via PHP (create a temporary script):**
Create a file `fix-permissions.php` in the root directory:
```php
<?php
$storagePath = __DIR__ . '/storage/app/public';
$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($storagePath),
    RecursiveIteratorIterator::SELF_FIRST
);

foreach ($iterator as $item) {
    if ($item->isDir()) {
        chmod($item->getPathname(), 0755);
    } else {
        chmod($item->getPathname(), 0644);
    }
}
echo "Permissions fixed!";
```
Run it once via URL: `https://yourdomain.com/fix-permissions.php` (then delete it!)

## Database Migrations

### Option 1: Via URL (Recommended for Shared Hosting)

1. Add a migration token to your `.env` file:
   ```
   MIGRATION_TOKEN=your-strong-random-token-here
   ```

2. Visit the migration endpoint:
   ```
   https://yourdomain.com/run-migrations?token=your-strong-random-token-here
   ```
   
   Or use POST request:
   ```bash
   curl -X POST "https://yourdomain.com/run-migrations?token=your-strong-random-token-here"
   ```

3. **IMPORTANT**: After running migrations, either:
   - Remove the `MIGRATION_TOKEN` from `.env` to disable the endpoint
   - Or set `ALLOW_MIGRATIONS_IN_PRODUCTION=false` in `.env`

### Option 2: Via SSH (If Available)

Run migrations after deployment:
```bash
php artisan migrate --force
```

**Security Note**: The migration endpoint is disabled in production by default. To enable it, set `ALLOW_MIGRATIONS_IN_PRODUCTION=true` in your `.env` file, but remember to disable it again after use.

## Queue Processing (Cron Jobs for Shared Hosting)

Since shared hosting doesn't support long-running processes, queue jobs must be processed via cron jobs. The application uses the **database** queue driver by default.

### Option 1: Laravel Scheduler (Recommended if you have SSH access)

If your shared hosting supports SSH and allows running `php artisan schedule:run`, set up a cron job:

1. **Add to your `.env` file:**
   ```
   QUEUE_CONNECTION=database
   QUEUE_TOKEN=your-strong-random-token-here
   ```

2. **Set up a cron job in cPanel (or via SSH):**
   ```
   * * * * * cd /path/to/your/laravel/project && php artisan schedule:run >> /dev/null 2>&1
   ```
   
   Replace `/path/to/your/laravel/project` with your actual Laravel project path (e.g., `/home/username/public_html/lms-v2` or `/home/username/sites-data/lms-v2`).

3. **The scheduler will automatically process queue jobs every minute.**

### Option 2: URL-Based Queue Processing (Recommended for cPanel-only hosting)

If you don't have SSH access, use the URL-based queue processing endpoint:

1. **Add to your `.env` file:**
   ```
   QUEUE_CONNECTION=database
   QUEUE_TOKEN=your-strong-random-token-here
   ```

2. **Set up a cron job in cPanel:**
   - Go to **cPanel → Cron Jobs**
   - Add a new cron job with:
     - **Minute**: `*` (every minute)
     - **Hour**: `*`
     - **Day**: `*`
     - **Month**: `*`
     - **Weekday**: `*`
     - **Command**: 
       ```bash
       curl -s "https://yourdomain.com/process-queue?token=your-strong-random-token-here" > /dev/null 2>&1
       ```
       
       Or using `wget`:
       ```bash
       wget -q -O - "https://yourdomain.com/process-queue?token=your-strong-random-token-here" > /dev/null 2>&1
       ```
   
   Replace:
   - `yourdomain.com` with your actual domain
   - `your-strong-random-token-here` with the token you set in `.env`

3. **The cron job will call the endpoint every minute, processing one queue job per call.**

### Option 3: Process Multiple Jobs Per Minute

If you have many queued jobs and want to process multiple jobs per minute:

1. **Create multiple cron jobs** (e.g., every 30 seconds):
   ```bash
   */1 * * * * curl -s "https://yourdomain.com/process-queue?token=YOUR_TOKEN" > /dev/null 2>&1
   */1 * * * * sleep 30 && curl -s "https://yourdomain.com/process-queue?token=YOUR_TOKEN" > /dev/null 2>&1
   ```

2. **Or use a script that processes multiple jobs:**
   Create a file `process-queue-batch.php` in your public directory:
   ```php
   <?php
   $token = 'your-strong-random-token-here';
   $domain = 'https://yourdomain.com';
   $jobsToProcess = 5; // Process 5 jobs per call
   
   for ($i = 0; $i < $jobsToProcess; $i++) {
       $ch = curl_init("{$domain}/process-queue?token={$token}");
       curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
       curl_setopt($ch, CURLOPT_TIMEOUT, 10);
       curl_exec($ch);
       curl_close($ch);
       usleep(500000); // Wait 0.5 seconds between jobs
   }
   ```
   
   Then set up a cron job to call this script:
   ```bash
   * * * * * php /path/to/public/process-queue-batch.php > /dev/null 2>&1
   ```

### Verifying Queue Processing

1. **Check if jobs are being processed:**
   - Visit: `https://yourdomain.com/process-queue?token=YOUR_TOKEN`
   - You should see a JSON response with `"success": true` and `"remaining_jobs"` count

2. **Monitor queue status:**
   - Check the `jobs` table in your database
   - Jobs should decrease over time as they're processed
   - Failed jobs will be moved to the `failed_jobs` table

3. **Check logs:**
   - Laravel logs: `storage/logs/laravel.log`
   - Look for queue processing messages

### Troubleshooting

**Jobs not processing:**
- Verify `QUEUE_CONNECTION=database` in `.env`
- Check that the `jobs` table exists (run migrations)
- Verify the cron job is running (check cPanel cron job logs)
- Check that `QUEUE_TOKEN` matches in both `.env` and cron job command

**Jobs failing:**
- Check `failed_jobs` table for error details
- Review `storage/logs/laravel.log` for error messages
- Ensure SMTP settings are configured if jobs involve email sending

**Cron job not working:**
- Verify the cron job path is correct
- Test the URL manually in a browser (with token)
- Check cPanel cron job execution logs
- Ensure your hosting provider allows cron jobs

## Environment Configuration

Make sure to update `.env` file with:
- Database credentials
- `APP_URL` (your production URL)
- `APP_ENV=production`
- `APP_DEBUG=false`
- `QUEUE_CONNECTION=database` (for queue processing)
- `QUEUE_TOKEN=your-strong-random-token-here` (for queue processing via URL)
- `MIGRATION_TOKEN=your-strong-random-token-here` (for running migrations via URL)
- `ALLOW_MIGRATIONS_IN_PRODUCTION=false` (set to `true` only when you need to run migrations, then set back to `false`)

