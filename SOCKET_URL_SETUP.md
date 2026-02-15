# Socket URL Configuration Guide

## Problem
The frontend is trying to connect to `ws://localhost:8080` instead of the production socket server URL.

## Solution

### Option 1: Set SOCKET_URL in Backend .env (Recommended)

Add the following to your **backend `.env` file** on the live server:

```env
SOCKET_URL=https://lms-v2.techinnsolutions.net:8080
SOCKET_ENABLED=true
```

**OR** if your socket server is on a different domain/subdomain:

```env
SOCKET_URL=https://socket.techinnsolutions.net:8080
SOCKET_ENABLED=true
```

**OR** if using the same domain without subdomain:

```env
SOCKET_URL=https://techinnsolutions.net:8080
SOCKET_ENABLED=true
```

### Option 2: Auto-Construction from APP_URL

If `SOCKET_URL` is not set, the backend will automatically construct it from `APP_URL`:
- If `APP_URL=https://lms-v2.techinnsolutions.net`
- Then `SOCKET_URL` will be `https://lms-v2.techinnsolutions.net:8080`

**Note**: Make sure your `APP_URL` in backend `.env` is set correctly:
```env
APP_URL=https://lms-v2.techinnsolutions.net
```

## How It Works

1. Frontend calls `/api/socket/config` endpoint
2. Backend reads `SOCKET_URL` from `.env` (or constructs from `APP_URL`)
3. Frontend receives the socket URL and connects to it
4. Socket.IO client connects using the provided URL

## Verification

After setting the environment variable:

1. **Clear Laravel config cache** (if using config caching):
   ```bash
   cd /var/www/lms/backend
   php artisan config:clear
   php artisan cache:clear
   ```

2. **Check the API response**:
   ```bash
   curl https://lms-v2.techinnsolutions.net/api/socket/config \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Accept: application/json"
   ```
   
   Should return:
   ```json
   {
     "data": {
       "socket_url": "https://lms-v2.techinnsolutions.net:8080",
       "enabled": true
     }
   }
   ```

3. **Check browser console**: After refreshing, you should see:
   ```
   Connecting to socket server: https://lms-v2.techinnsolutions.net:8080
   ```

## Important Notes

- **HTTPS vs HTTP**: If your main site uses HTTPS, the socket URL should also use HTTPS (or WSS for WebSocket)
- **Port 8080**: Make sure port 8080 is open in your firewall
- **CORS**: The chatbot server's `FRONTEND_URL` in `.env` should match your frontend domain
- **Same-Origin Policy**: If socket is on a different domain, ensure CORS is properly configured

## Troubleshooting

### Still seeing localhost:8080?

1. Check backend `.env` has `SOCKET_URL` set correctly
2. Clear Laravel cache: `php artisan config:clear`
3. Restart PHP-FPM or your web server
4. Check browser console for the actual URL being used

### Connection refused?

1. Verify chatbot server is running: `pm2 status lms-chatbot`
2. Check port 8080 is open: `netstat -tulpn | grep 8080`
3. Test health check: `curl http://localhost:8080/` (should return "online!")

### CORS errors?

1. Check chatbot `.env` has correct `FRONTEND_URL`:
   ```env
   FRONTEND_URL=https://lms-v2.techinnsolutions.net
   ```
2. Restart chatbot server: `pm2 restart lms-chatbot`

