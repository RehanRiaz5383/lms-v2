# Email Troubleshooting Guide

## Issue: Emails Not Being Received

If emails are not being received, check the following:

### 1. Queue Worker Must Be Running

Emails are sent via queue, so the queue worker must be running continuously.

**To start the queue worker:**
```bash
cd backend
php artisan queue:work
```

**For development (with auto-restart):**
```bash
php artisan queue:listen
```

**For production (as a daemon):**
```bash
php artisan queue:work --daemon
```

**Or use Supervisor (recommended for production):**
Create a supervisor config file to keep the queue worker running.

### 2. Check Queue Status

**Check if jobs are in queue:**
```bash
php artisan tinker
DB::table('jobs')->count();
```

**Check failed jobs:**
```bash
php artisan queue:failed
```

**Retry failed jobs:**
```bash
php artisan queue:retry all
```

### 3. Verify SMTP Settings

Check that SMTP settings are configured correctly in the database:
- Go to `/dashboard/settings/smtp`
- Verify:
  - Host (e.g., smtp.gmail.com)
  - Port (e.g., 587 for TLS, 465 for SSL)
  - Username (your email)
  - Password (app password for Gmail)
  - Encryption (tls or ssl)
  - From Address
  - From Name
  - Is Active: Must be checked

### 4. Check Laravel Logs

Check for errors in:
```bash
tail -f backend/storage/logs/laravel.log
```

Look for:
- "Failed to send notification email"
- SMTP connection errors
- Authentication errors

### 5. Test Email Sending

**Test SMTP connection:**
- Go to `/dashboard/settings/smtp`
- Click "Test Connection"
- Check if test email is received

**Send test email via tinker:**
```bash
php artisan tinker
$smtp = \App\Models\SmtpSetting::where('is_active', true)->first();
\App\Jobs\SendNotificationEmail::dispatch('your-email@example.com', 'Test', 'Test message', $smtp);
```

### 6. Common Issues

**Gmail:**
- Use App Password (not regular password)
- Enable "Less secure app access" (if using regular password)
- Port: 587 with TLS, or 465 with SSL

**Email in Spam:**
- Check SPF, DKIM, DMARC records
- Use proper from address
- Avoid spam trigger words

**Queue Not Processing:**
- Ensure queue worker is running
- Check database connection
- Verify `QUEUE_CONNECTION=database` in .env

### 7. Check Email Logs

The email content is logged in `storage/logs/laravel.log`. If you see the email content but it's not received:
- Queue worker might not be running
- SMTP settings might be incorrect
- Email might be in spam folder

### 8. Immediate Fix

If you need emails to send immediately (without queue):
1. Change `QUEUE_CONNECTION=sync` in `.env` (not recommended for production)
2. Or dispatch emails synchronously in the listener

