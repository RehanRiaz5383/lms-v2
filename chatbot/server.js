import { Server } from 'socket.io';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https'; // Add this
import fs from 'fs'; // Add this
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 8080;
const LARAVEL_API_URL = process.env.LARAVEL_API_URL || 'https://lms-v2.techinnsolutions.net/api';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

let httpServer;

// --- SSL Adjustment Start ---
if (IS_PRODUCTION) {
  try {
    const options = {
      // Path to your Certbot certificates
      key: fs.readFileSync('/etc/letsencrypt/live/techinnsolutions.net/privkey.pem'),
      cert: fs.readFileSync('/etc/letsencrypt/live/techinnsolutions.net/fullchain.pem'),
    };
    httpServer = createHttpsServer(options);
    console.log('🔒 SSL Certificates loaded successfully.');
  } catch (error) {
    console.error('❌ Failed to load SSL certificates, falling back to HTTP:', error.message);
    httpServer = createHttpServer();
  }
} else {
  httpServer = createHttpServer();
  console.log('🛡️ Running in development mode (HTTP).');
}
// --- SSL Adjustment End ---

// Create Socket.IO server with CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 30000,
  allowEIO3: true,
});

// ... [Rest of your verifyToken and onlineUsers logic remains exactly the same] ...

// HTTP/HTTPS endpoint for health check
httpServer.on('request', (req, res) => {
  if (req.url === '/' || req.url === '/health' || req.url === '/status') {
    res.writeHead(200, { 
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*'
    });
    res.end('online!');
    return;
  }
});

// Start server
httpServer.listen(PORT, '0.0.0.0', () => { // Explicitly bind to 0.0.0.0
  const protocol = IS_PRODUCTION ? 'https' : 'http';
  console.log(`🚀 Socket.IO server running on ${protocol}://0.0.0.0:${PORT}`);
  console.log(`✅ Health check available at ${protocol}://techinnsolutions.net:${PORT}/`);
});

// ... [Keep your existing socket connection logic and graceful shutdown] ...