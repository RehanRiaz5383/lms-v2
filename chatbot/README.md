# LMS Chatbot - Socket.IO Server

This is the Socket.IO server for the LMS chat module. It handles real-time communication for the "Who's Online" feature and future chat functionality.

## Setup Instructions

### 1. Install Dependencies

```bash
cd chatbot
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Edit `.env`:
```env
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

### 3. Run the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## Live Server Setup (Port 8080)

### Option 1: Using PM2 (Recommended)

1. Install PM2 globally:
```bash
npm install -g pm2
```

2. Start the server with PM2:
```bash
pm2 start server.js --name lms-chatbot
```

3. Save PM2 configuration:
```bash
pm2 save
```

4. Setup PM2 to start on system boot:
```bash
pm2 startup
```

5. Monitor the server:
```bash
pm2 status
pm2 logs lms-chatbot
```

### Option 2: Using systemd (Linux)

1. Create a systemd service file `/etc/systemd/system/lms-chatbot.service`:

```ini
[Unit]
Description=LMS Chatbot Socket.IO Server
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/lms/chatbot
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /path/to/lms/chatbot/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

2. Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable lms-chatbot
sudo systemctl start lms-chatbot
```

3. Check status:
```bash
sudo systemctl status lms-chatbot
```

### Option 3: Using Docker

1. Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
```

2. Build and run:
```bash
docker build -t lms-chatbot .
docker run -d -p 8080:8080 --name lms-chatbot --env-file .env lms-chatbot
```

## Firewall Configuration

Make sure port 8080 is open in your firewall:

```bash
# UFW (Ubuntu)
sudo ufw allow 8080/tcp

# FirewallD (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

## Nginx Reverse Proxy (Optional)

If you want to serve the Socket.IO server through Nginx:

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
    }
}
```

## Troubleshooting

### Server won't start
- Check if port 8080 is already in use: `lsof -i :8080` or `netstat -tulpn | grep 8080`
- Verify `.env` file exists and has correct values
- Check Node.js version: `node --version` (should be 18+)

### Connection issues
- Verify Laravel API URL is accessible
- Check CORS configuration in `.env`
- Ensure firewall allows port 8080
- Check browser console for connection errors

### Authentication fails
- Verify Laravel API is running and accessible
- Check token format in frontend
- Verify `/api/me` endpoint works in Laravel

## Monitoring

### PM2 Monitoring
```bash
pm2 monit
```

### Logs
```bash
# PM2
pm2 logs lms-chatbot

# systemd
journalctl -u lms-chatbot -f
```

## Security Notes

1. **Production**: Always use specific `FRONTEND_URL` instead of `*`
2. **HTTPS**: Use HTTPS in production for secure WebSocket connections
3. **Rate Limiting**: Consider adding rate limiting for production
4. **Token Validation**: Tokens are validated on every connection

## API Endpoints

The server doesn't expose HTTP endpoints. It only handles WebSocket connections via Socket.IO.

## Events

### Client → Server
- `ping` - Keep-alive ping

### Server → Client
- `connected` - Sent when client successfully connects
- `online_users` - List of all online users (broadcasted to all clients)
- `pong` - Response to ping

