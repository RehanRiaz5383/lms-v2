# Google Drive Logging Setup

This document explains how to configure application logs to be stored on Google Drive instead of (or in addition to) local `laravel.log` files.

## Features

- **Daily Folders**: Logs are organized by date (e.g., `logs/2026-01-31/`)
- **Service-Specific Files**: Separate log files for different services (e.g., `api.log`, `auth.log`, `payment.log`)
- **Configurable Storage**: Choose between local, Google Drive, or both via environment variables
- **Automatic Organization**: The system automatically creates date folders and service log files as needed
- **Queued Logging**: Logs are processed asynchronously via queue to prevent API slowdowns (enabled by default)
- **Smart Log Filtering**: By default, only warning, error, and critical logs are sent to Google Drive to prevent queue overload (configurable)

## Environment Variables

Add these variables to your `.env` file:

```env
# Log Storage Type
# Options: 'local', 'google_drive', or 'both'
# - 'local': Store logs in storage/logs/laravel.log (default)
# - 'google_drive': Store logs only on Google Drive
# - 'both': Store logs in both local file and Google Drive
LOG_STORAGE_TYPE=local

# Log Channel (optional, defaults to 'stack')
LOG_CHANNEL=stack

# Log Level for Local Logs (optional, defaults to 'debug')
# This controls the log level for local file logging
LOG_LEVEL=debug

# Google Drive Log Level (optional, defaults to 'warning')
# This controls which logs are sent to Google Drive to prevent queue overload
# Options: 'debug', 'info', 'warning', 'error', 'critical'
# - 'warning': Only log warning, error, and critical (recommended - prevents queue overload)
# - 'error': Only log error and critical
# - 'info': Log info, warning, error, and critical
# - 'debug': Log everything (not recommended - can overload queue)
LOG_GOOGLE_DRIVE_LEVEL=warning

# Service Name for General Logs (optional)
# This is used when no specific service is detected
LOG_SERVICE_NAME=general

# Google Drive Logs Folder ID (optional, can be set via admin panel)
# This should be the folder ID of the 'logs' folder in Google Drive
GOOGLE_DRIVE_FOLDER_LOGS=

# Use Queue for Google Drive Logging (optional, defaults to true)
# - true: Logs are processed asynchronously via queue (recommended for production)
# - false: Logs are written directly to Google Drive (may slow down API responses)
LOG_GOOGLE_DRIVE_USE_QUEUE=true
```

## Database Configuration

The logs folder must be configured in the database:

1. Go to **Settings > Google Drive Folders** in the admin panel
2. Find or create a folder entry with:
   - **Name**: `logs`
   - **Display Name**: `Application Logs`
   - **Directory Path**: `lms/logs`
   - **Folder ID**: Your Google Drive folder ID for logs
   - **Description**: `Folder for storing application logs (organized by date and service)`

Alternatively, you can seed the database:

```bash
php artisan db:seed --class=GoogleDriveFolderSeeder
```

Then update the `logs` folder entry with your Google Drive folder ID via the admin panel.

## Log Structure on Google Drive

When using Google Drive logging, logs are organized as follows:

```
lms/logs/
  ├── 2026-01-31/
  │   ├── api.log
  │   ├── auth.log
  │   ├── payment.log
  │   ├── console.log
  │   ├── jobs.log
  │   └── general.log
  ├── 2026-02-01/
  │   ├── api.log
  │   └── ...
  └── ...
```

## Service Detection

The system automatically detects the service name from:
1. Explicit `service` parameter in log context
2. Channel name (e.g., 'api', 'auth', 'payment')
3. File path in stack trace (e.g., `app/Http/Controllers` → 'api')
4. Falls back to 'general' if no service is detected

## Usage Examples

### Basic Logging (uses default service detection)
```php
Log::info('User logged in', ['user_id' => 1]);
// Stored in: logs/2026-01-31/general.log (or api.log if from API controller)
```

### Explicit Service Logging
```php
Log::channel('google_drive_api')->info('API request received');
// Stored in: logs/2026-01-31/api.log

Log::channel('google_drive_auth')->warning('Failed login attempt');
// Stored in: logs/2026-01-31/auth.log

Log::channel('google_drive_payment')->error('Payment processing failed');
// Stored in: logs/2026-01-31/payment.log
```

### With Service Context
```php
Log::info('Payment processed', ['service' => 'payment', 'amount' => 100]);
// Stored in: logs/2026-01-31/payment.log
```

## Available Log Channels

- `google_drive` - General Google Drive logging (service auto-detected)
- `google_drive_api` - API-specific logs
- `google_drive_auth` - Authentication logs
- `google_drive_payment` - Payment processing logs
- `google_drive_console` - Console/Artisan command logs
- `google_drive_jobs` - Queue job logs

## Switching Between Storage Types

### Use Local Storage Only (Default)
```env
LOG_STORAGE_TYPE=local
```

### Use Google Drive Only
```env
LOG_STORAGE_TYPE=google_drive
```

### Use Both Local and Google Drive
```env
LOG_STORAGE_TYPE=both
```

## Queue Configuration

### Queued Logging (Recommended - Default)

By default, Google Drive logging uses Laravel's queue system to process logs asynchronously. This prevents API slowdowns and ensures your application remains responsive.

**Benefits:**
- ✅ Non-blocking: API responses are not delayed by Google Drive API calls
- ✅ Retry mechanism: Failed log writes are automatically retried (3 attempts with backoff)
- ✅ Better performance: Logs are batched and processed in the background

**Requirements:**
- Queue worker must be running: `php artisan queue:work`
- Or use a process manager like Supervisor to keep the queue worker running

**Enable Queued Logging:**
```env
LOG_GOOGLE_DRIVE_USE_QUEUE=true
```

**Start Queue Worker:**
```bash
# Development
php artisan queue:work

# Production (with Supervisor or similar)
php artisan queue:work --daemon
```

### Synchronous Logging (Not Recommended)

If you need synchronous logging (logs written immediately), you can disable the queue:

```env
LOG_GOOGLE_DRIVE_USE_QUEUE=false
```

**⚠️ Warning**: Synchronous logging may slow down your API responses, especially during high traffic periods or when Google Drive API is slow.

### Queue Configuration

Make sure your queue connection is properly configured in `config/queue.php`. The default `sync` driver processes jobs immediately (synchronously), while `database`, `redis`, or `sqs` process jobs asynchronously.

**Recommended Queue Driver:**
```env
QUEUE_CONNECTION=database
# or
QUEUE_CONNECTION=redis
```

**Create Queue Table (if using database driver):**
```bash
php artisan queue:table
php artisan migrate
```

## Log Level Filtering

### Default Behavior (Recommended)

By default, **only warning, error, and critical logs** are sent to Google Drive. This prevents queue overload and ensures only important logs are stored remotely.

**Why filter logs?**
- 🚫 Prevents queue overload: Debug and info logs can generate thousands of queue jobs
- 💰 Reduces API costs: Fewer Google Drive API calls
- ⚡ Better performance: Queue processes fewer jobs
- 📊 Focus on important logs: Only warnings, errors, and critical issues are stored remotely

**What gets logged to Google Drive by default:**
- ✅ Warning logs: `Log::warning()`
- ✅ Error logs: `Log::error()`
- ✅ Critical logs: `Log::critical()`
- ❌ Debug logs: `Log::debug()` (stored locally only)
- ❌ Info logs: `Log::info()` (stored locally only)

**What gets logged locally:**
- All log levels (debug, info, warning, error, critical) are still logged to `storage/logs/laravel.log`

### Configuring Log Levels

You can customize which logs are sent to Google Drive:

```env
# Only warnings, errors, and critical (default - recommended)
LOG_GOOGLE_DRIVE_LEVEL=warning

# Only errors and critical
LOG_GOOGLE_DRIVE_LEVEL=error

# Info, warnings, errors, and critical
LOG_GOOGLE_DRIVE_LEVEL=info

# Everything including debug (not recommended - can overload queue)
LOG_GOOGLE_DRIVE_LEVEL=debug
```

**Log Level Hierarchy:**
- `debug` - All logs (debug, info, warning, error, critical)
- `info` - Info, warning, error, critical
- `warning` - Warning, error, critical (default)
- `error` - Error, critical
- `critical` - Critical only

## Troubleshooting

### Logs Not Appearing on Google Drive

1. **Check Folder Configuration**: Ensure the 'logs' folder is configured in the database with a valid folder ID
2. **Check Credentials**: Verify Google Drive OAuth2 credentials are set in `.env`
3. **Check Permissions**: Ensure the Google Drive folder is shared with the service account/user
4. **Check Queue Worker**: If using queued logging, ensure the queue worker is running (`php artisan queue:work`)
5. **Check Failed Jobs**: Check for failed jobs in the `failed_jobs` table or run `php artisan queue:failed`
6. **Check Logs**: Check `storage/logs/laravel.log` for any Google Drive logging errors

### Queue Issues

**Jobs Not Processing:**
- Ensure queue worker is running: `php artisan queue:work`
- Check queue connection in `.env`: `QUEUE_CONNECTION=database` (or redis, sqs)
- Verify queue table exists: `php artisan migrate` (if using database driver)

**Jobs Failing:**
- Check failed jobs: `php artisan queue:failed`
- Retry failed jobs: `php artisan queue:retry all`
- Check `storage/logs/laravel.log` for error details

### Fallback Behavior

If Google Drive logging fails, the system will:
- Log the error to the local `laravel.log` file
- Continue operating normally (logging failures won't crash the application)

## Notes

- Log files are created automatically when first needed
- Date folders are created automatically for each day
- The system handles concurrent writes safely
- Old log files remain on Google Drive (no automatic cleanup - manage manually if needed)
- **Queued logging is enabled by default** to prevent API slowdowns
- **Only warning, error, and critical logs are sent to Google Drive by default** to prevent queue overload
- All log levels (including debug and info) are still logged locally to `storage/logs/laravel.log`
- Failed log jobs are automatically retried 3 times with exponential backoff (10s, 30s, 60s)
- If all retries fail, the error is logged to the local `laravel.log` file
- You can change the Google Drive log level via `LOG_GOOGLE_DRIVE_LEVEL` environment variable

