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

## Environment Configuration

Make sure to update `.env` file with:
- Database credentials
- `APP_URL` (your production URL)
- `APP_ENV=production`
- `APP_DEBUG=false`
- `MIGRATION_TOKEN=your-strong-random-token-here` (for running migrations via URL)
- `ALLOW_MIGRATIONS_IN_PRODUCTION=false` (set to `true` only when you need to run migrations, then set back to `false`)

