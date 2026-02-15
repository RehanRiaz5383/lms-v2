# Socket Timeout Error Troubleshooting Guide

If you're experiencing socket timeout errors on the live server, follow these steps to diagnose and fix the issue.

## Changes Made

### 1. Client-Side (Frontend)
- **Increased connection timeout**: 30 seconds for production, 20 seconds for development
- **Increased reconnection attempts**: From 5 to 10 attempts
- **Increased max reconnection delay**: From 5 seconds to 10 seconds
- **Added timeout event handler**: Specific handling for `connect_timeout` events
- **Better error logging**: More detailed error messages with socket URL and error context

### 2. Server-Side (Node.js Socket Server)
- **Added connection timeout**: 30 seconds for initial connection
- **Added ping timeout**: 60 seconds before considering connection closed
- **Added ping interval**: 25 seconds between pings
- **Token verification timeout**: 10 seconds for token verification
- **Better error handling**: More detailed error messages for connection issues

## Troubleshooting Steps

### Step 1: Verify Socket Server is Running

Check if the socket server is running on port 8080:

```bash
# Check if process is running
pm2 status

# Check if port 8080 is listening
netstat -tulpn | grep 8080
# or
lsof -i :8080

# Check socket server logs
pm2 logs lms-chatbot
```

### Step 2: Test Socket Server Accessibility

Test if the socket server is accessible from your browser:

1. **Health Check**: Open `https://your-domain.com:8080/` or `https://your-domain.com:8080/health` in your browser. It should return "online!".

2. **From Server**: Test from the server itself:
   ```bash
   curl http://localhost:8080/
   # Should return: online!
   ```

3. **From External Network**: Test from outside the server:
   ```bash
   curl https://your-domain.com:8080/
   # Should return: online!
   ```

### Step 3: Verify Firewall Configuration

Ensure port 8080 is open in your firewall:

```bash
# UFW (Ubuntu)
sudo ufw status
sudo ufw allow 8080/tcp

# FirewallD (CentOS/RHEL)
sudo firewall-cmd --list-ports
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

### Step 4: Check Socket URL Configuration

Verify the `SOCKET_URL` in your Laravel `.env` file:

```env
# For production with direct port access
SOCKET_URL=https://your-domain.com:8080
SOCKET_ENABLED=true

# Or if using Nginx reverse proxy
SOCKET_URL=https://socket.your-domain.com
SOCKET_ENABLED=true
```

After updating `.env`, clear Laravel cache:
```bash
php artisan config:clear
php artisan cache:clear
```

### Step 5: Check Network Connectivity

Verify the socket server can reach the Laravel API:

```bash
# From the server, test Laravel API
curl -H "Authorization: Bearer YOUR_TOKEN" https://your-domain.com/api/me
```

### Step 6: Check Browser Console

Open browser developer tools (F12) and check:

1. **Console tab**: Look for socket connection errors
2. **Network tab**: Check if WebSocket connection is being attempted
3. **Application tab**: Check if there are any service worker issues

### Step 7: Verify CORS Configuration

Check the `FRONTEND_URL` in your `chatbot/.env` file:

```env
FRONTEND_URL=https://your-domain.com
```

Make sure it matches your actual frontend URL.

### Step 8: Check PM2 Process

If using PM2, ensure the process is running correctly:

```bash
# Check status
pm2 status

# Restart if needed
pm2 restart lms-chatbot

# Check logs for errors
pm2 logs lms-chatbot --lines 100

# If process is not running, start it
cd /var/www/lms/chatbot
pm2 start server.js --name lms-chatbot
pm2 save
```

## Common Issues and Solutions

### Issue 1: "Connection timeout" error
**Possible causes:**
- Socket server is not running
- Port 8080 is blocked by firewall
- Incorrect `SOCKET_URL` in Laravel `.env`
- Network connectivity issues

**Solutions:**
1. Verify socket server is running: `pm2 status`
2. Check firewall: `sudo ufw status`
3. Verify `SOCKET_URL` in `.env` matches your server URL
4. Test health check endpoint: `curl https://your-domain.com:8080/`

### Issue 2: "Token verification timeout"
**Possible causes:**
- Laravel API is not accessible from socket server
- Laravel API is slow to respond
- Network issues between socket server and Laravel

**Solutions:**
1. Verify `LARAVEL_API_URL` in `chatbot/.env`:
   ```env
   LARAVEL_API_URL=https://your-domain.com/api
   ```
2. Test Laravel API from socket server:
   ```bash
   curl https://your-domain.com/api/me
   ```
3. Check Laravel API response time

### Issue 3: "WebSocket connection failed"
**Possible causes:**
- Browser blocking WebSocket connections
- Proxy/Nginx not configured for WebSocket
- SSL certificate issues

**Solutions:**
1. Check if using HTTPS (required for secure WebSocket)
2. Verify Nginx configuration for WebSocket (if using reverse proxy)
3. Check browser console for SSL errors

### Issue 4: Connection works locally but not on live server
**Possible causes:**
- Different environment variables
- Firewall blocking port
- Network configuration differences

**Solutions:**
1. Compare `.env` files between local and production
2. Verify firewall rules
3. Check server network configuration

## Testing Socket Connection

### Manual Test Script

Create a test file `test-socket.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Socket Test</title>
    <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
</head>
<body>
    <h1>Socket Connection Test</h1>
    <div id="status">Connecting...</div>
    <div id="log"></div>
    
    <script>
        const socketUrl = 'https://your-domain.com:8080';
        const token = 'YOUR_AUTH_TOKEN'; // Get from browser localStorage
        
        const socket = io(socketUrl, {
            auth: { token: token },
            transports: ['websocket', 'polling'],
            timeout: 30000,
        });
        
        socket.on('connect', () => {
            document.getElementById('status').textContent = 'Connected!';
            document.getElementById('log').innerHTML += '<p>Connected to: ' + socketUrl + '</p>';
        });
        
        socket.on('connect_error', (error) => {
            document.getElementById('status').textContent = 'Connection Error';
            document.getElementById('log').innerHTML += '<p>Error: ' + error.message + '</p>';
        });
        
        socket.on('connect_timeout', () => {
            document.getElementById('status').textContent = 'Connection Timeout';
            document.getElementById('log').innerHTML += '<p>Connection timed out</p>';
        });
    </script>
</body>
</html>
```

## Monitoring

### PM2 Monitoring
```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs lms-chatbot

# View specific log lines
pm2 logs lms-chatbot --lines 50
```

### Server Logs
Check the socket server console output for:
- Connection attempts
- Authentication errors
- Token verification issues
- Broadcasting events

## Next Steps

If the issue persists after following these steps:

1. **Check server resources**: Ensure server has enough CPU and memory
2. **Review network configuration**: Check for any proxy or load balancer issues
3. **Test with different browsers**: Rule out browser-specific issues
4. **Check SSL certificate**: Ensure valid SSL certificate for HTTPS connections
5. **Review server logs**: Check both Laravel and Node.js logs for errors

## Support

If you continue to experience issues, provide:
- Browser console errors
- Socket server logs (`pm2 logs lms-chatbot`)
- Laravel logs (`storage/logs/laravel.log`)
- Network tab screenshots from browser
- Server configuration details (firewall, Nginx, etc.)

