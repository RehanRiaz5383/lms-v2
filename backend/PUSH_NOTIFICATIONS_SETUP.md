# Push Notifications Setup Guide

## Step 1: Generate VAPID Keys

VAPID keys are required for Web Push Notifications. You have several options:

### Option 1: Using Node.js (Recommended)
```bash
npm install -g web-push
web-push generate-vapid-keys
```

### Option 2: Using Online Generator
Visit: https://web-push-codelab.glitch.me/

### Option 3: Using PHP (if dependencies are available)
```bash
cd backend
php generate-vapid-keys.php
```

## Step 2: Add Keys to .env

After generating the keys, add them to your `.env` file:

```env
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
```

**Important:** 
- The public key will be sent to browsers (safe to expose)
- The private key must be kept secret (never commit to version control)

## Step 3: Run Migration

```bash
cd backend
php artisan migrate
```

This will create the `push_notification_subscriptions` table.

## Step 4: Test Push Notifications

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Deploy to production (HTTPS required for push notifications)

3. Users can enable push notifications in Settings → Notifications

## How It Works

1. **User Subscription**: When a user enables push notifications, their browser subscription is saved to the database
2. **Notification Creation**: When any notification is created in the system, a push notification is automatically sent
3. **Service Worker**: The service worker receives push events and displays notifications even when the app is closed

## Troubleshooting

### Push notifications not working:
- Ensure your site is served over HTTPS (required for push notifications)
- Check that VAPID keys are correctly set in .env
- Verify the service worker is registered (check browser DevTools → Application → Service Workers)
- Check browser console for errors

### VAPID key generation fails:
- Use Node.js method: `npm install -g web-push && web-push generate-vapid-keys`
- Or use the online generator at https://web-push-codelab.glitch.me/

### Notifications not received:
- Check browser notification permissions
- Verify user has subscribed (check `push_notification_subscriptions` table)
- Check Laravel logs for push notification errors

## Integration

Push notifications are automatically sent when:
- Tasks are assigned to students
- Task grades are awarded/updated
- Vouchers are generated
- Payment proofs are submitted
- Any notification is created via `Notification::createNotification()` or `$user->sendCrmNotification()`

All existing notification creation points have been updated to also send push notifications.

