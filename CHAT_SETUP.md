# Chat Module Setup Guide

This guide explains how to set up the Socket.IO chat module for the LMS system.

## Overview

The chat module consists of three parts:
1. **Backend (Laravel)**: Provides authentication and API endpoints
2. **Chatbot (Node.js)**: Socket.IO server for real-time communication
3. **Frontend (React)**: Client-side components and Socket.IO client

## Prerequisites

- Node.js 18+ installed
- Laravel backend running
- React frontend running
- Port 8080 available for Socket.IO server

## Step-by-Step Setup

### 1. Backend Setup (Laravel)

The backend already includes the necessary routes and controllers. You just need to add environment variables:

Add to your `.env` file:
```env
SOCKET_URL=http://localhost:8080
SOCKET_ENABLED=true
```

**For Production:**
```env
SOCKET_URL=https://socket.your-domain.com:8080
# or if using reverse proxy:
SOCKET_URL=https://socket.your-domain.com
SOCKET_ENABLED=true
```

### 2. Chatbot Server Setup

1. Navigate to the chatbot directory:
```bash
cd chatbot
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
# Development
PORT=8080
LARAVEL_API_URL=http://localhost:8000/api
FRONTEND_URL=http://localhost:5173
```

**For Production:**
```env
PORT=8080
LARAVEL_API_URL=https://your-domain.com/api
FRONTEND_URL=https://your-domain.com
```

4. Start the server:

**Development:**
```bash
npm run dev
```

**Production (using PM2):**
```bash
pm2 start server.js --name lms-chatbot
pm2 save
pm2 startup
```

### 3. Frontend Setup

The frontend components are already integrated. The Socket.IO client will automatically connect when a user is authenticated.

No additional configuration needed - the frontend will fetch the socket URL from the backend API.

## Live Server Deployment (Port 8080)

### Using PM2 (Recommended)

1. Install PM2:
```bash
npm install -g pm2
```

2. Start the chatbot server:
```bash
cd chatbot
pm2 start server.js --name lms-chatbot
pm2 save
pm2 startup
```

3. Monitor:
```bash
pm2 status
pm2 logs lms-chatbot
pm2 monit
```

### Using systemd (Linux)

1. Create service file `/etc/systemd/system/lms-chatbot.service`:
```ini
[Unit]
Description=LMS Chatbot Socket.IO Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/lms/chatbot
Environment="NODE_ENV=production"
EnvironmentFile=/path/to/lms/chatbot/.env
ExecStart=/usr/bin/node /path/to/lms/chatbot/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

2. Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable lms-chatbot
sudo systemctl start lms-chatbot
sudo systemctl status lms-chatbot
```

### Firewall Configuration

Open port 8080:
```bash
# UFW (Ubuntu)
sudo ufw allow 8080/tcp

# FirewallD (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

### Nginx Reverse Proxy (Optional)

If you want to serve Socket.IO through a subdomain:

```nginx
# /etc/nginx/sites-available/lms-chatbot
upstream socketio {
    server localhost:8080;
}

server {
    listen 80;
    server_name socket.your-domain.com;

    location / {
        proxy_pass http://socketio;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
```

Then update your `.env`:
```env
SOCKET_URL=https://socket.your-domain.com
```

## Features

### Who's Online Button
- Sticky button positioned at bottom-left (50px from left)
- Shows online user count
- Green indicator when connected
- Visible on all pages for authenticated users

### Who's Online Sidebar
- Opens when clicking the button
- Shows current user at the top
- Lists all other online users
- Displays user pictures, names, emails, and roles
- Clickable users (currently shows "Area under construction" alert)
- Connection status indicator

## Testing

1. Start the chatbot server:
```bash
cd chatbot
npm run dev
```

2. Start the Laravel backend:
```bash
cd backend
php artisan serve
```

3. Start the frontend:
```bash
cd frontend
npm run dev
```

4. Login to the application and check:
   - "Who's Online" button appears at bottom-left
   - Button shows connection status (green dot)
   - Clicking opens the sidebar
   - Online users are listed
   - Clicking a user shows "Area under construction" alert

## Troubleshooting

### Button not appearing
- Check if user is authenticated
- Check browser console for errors
- Verify socket service is connecting

### Socket connection fails
- Verify chatbot server is running on port 8080
- Check `SOCKET_URL` in backend `.env`
- Check `LARAVEL_API_URL` in chatbot `.env`
- Verify CORS settings in chatbot `.env`
- Check firewall allows port 8080

### No users showing
- Verify multiple users are logged in
- Check socket connection status in sidebar
- Check browser console for errors
- Verify token authentication is working

### Authentication errors
- Verify Laravel `/api/me` endpoint works
- Check token is being sent correctly
- Verify token hasn't expired

## Architecture

```
┌─────────────┐
│   Frontend  │
│   (React)   │
└──────┬──────┘
       │ WebSocket
       │ (Socket.IO)
       ▼
┌─────────────┐
│   Chatbot   │
│  (Node.js)  │
│  Port 8080  │
└──────┬──────┘
       │ HTTP
       │ (Token Verification)
       ▼
┌─────────────┐
│   Backend   │
│  (Laravel)  │
│  Port 8000  │
└─────────────┘
```

## Security Considerations

1. **Token Validation**: All socket connections require valid Laravel authentication tokens
2. **CORS**: Configure `FRONTEND_URL` properly in production (avoid `*`)
3. **HTTPS**: Use HTTPS in production for secure WebSocket connections
4. **Rate Limiting**: Consider adding rate limiting for production use
5. **Firewall**: Only expose port 8080 to necessary IPs if possible

## Next Steps

The chat module is ready for:
- Real-time messaging between users
- Group chats
- File sharing
- Typing indicators
- Read receipts
- Message history

The foundation is in place - you can now build upon this to add full chat functionality.

