import { Server } from 'socket.io';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 8080;
const LARAVEL_API_URL = process.env.LARAVEL_API_URL || 'https://lms-v2.techinnsolutions.net/api';

// Create HTTP server
const httpServer = createServer();

// Create Socket.IO server with CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000, // 60 seconds - time to wait for pong before considering connection closed
  pingInterval: 25000, // 25 seconds - interval between pings
  connectTimeout: 30000, // 30 seconds - time to wait for connection
  allowEIO3: true, // Allow Engine.IO v3 clients
});

// Store online users
const onlineUsers = new Map(); // Map<socketId, {userId, name, email, picture, role, socket}>

/**
 * Verify token with Laravel backend
 */
async function verifyToken(token) {
  try {
    const axios = (await import('axios')).default;
    const response = await axios.get(`${LARAVEL_API_URL}/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      timeout: 10000, // 10 second timeout for token verification
      validateStatus: function (status) {
        return status >= 200 && status < 500; // Don't throw on 4xx errors
      },
    });
    
    if (response.status === 200 && response.data && response.data.data) {
      return response.data.data;
    }
    
    if (response.status === 401) {
      console.error('Token verification failed: Unauthorized');
    } else {
      console.error('Token verification failed: Unexpected response', response.status);
    }
    return null;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('Token verification timeout:', error.message);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Token verification failed: Cannot connect to Laravel API at', LARAVEL_API_URL);
    } else {
      console.error('Token verification failed:', error.message);
    }
    return null;
  }
}

/**
 * Get all online users (excluding current user)
 */
function getOnlineUsers(excludeSocketId = null) {
  const users = [];
  onlineUsers.forEach((userData, socketId) => {
    if (socketId !== excludeSocketId) {
      users.push({
        id: userData.userId,
        name: userData.name,
        email: userData.email,
        picture: userData.picture,
        role: userData.role,
        user_type: userData.user_type,
      });
    }
  });
  return users;
}

/**
 * Broadcast online users list to all connected clients
 * Each client receives a list excluding themselves
 */
function broadcastOnlineUsers() {
  // Send personalized list to each client (excluding themselves)
  console.log(`\n=== Broadcasting to ${onlineUsers.size} connected users ===`);
  onlineUsers.forEach((userData, socketId) => {
    const otherUsers = getOnlineUsers(socketId);
    const socket = userData.socket;
    if (socket && socket.connected) {
      // Remove duplicates by userId (in case same user has multiple connections)
      const uniqueUsers = otherUsers.filter((user, index, self) => 
        index === self.findIndex(u => u.id === user.id)
      );
      // Debug log
      console.log(`Broadcasting to ${userData.name} (ID: ${userData.userId}, Socket: ${socketId}):`, {
        totalOnline: onlineUsers.size,
        otherUsers: uniqueUsers.length,
        users: uniqueUsers.map(u => ({ id: u.id, name: u.name }))
      });
      socket.emit('online_users', uniqueUsers);
    } else {
      console.warn(`Socket not connected for ${userData.name} (${socketId})`);
    }
  });
  console.log(`=== End broadcast ===\n`);
}

// Socket.IO connection handling with timeout
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication token required'));
  }

  try {
    // Set a timeout for token verification
    const verificationPromise = verifyToken(token);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Token verification timeout')), 10000)
    );

    const user = await Promise.race([verificationPromise, timeoutPromise]);
    
    if (!user) {
      return next(new Error('Authentication failed'));
    }

    // Attach user data to socket
    socket.userId = user.id;
    socket.userData = user;
    
    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    return next(new Error('Authentication failed: ' + error.message));
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId} (${socket.userData.name})`);

  // Add user to online users
  onlineUsers.set(socket.id, {
    userId: socket.userId,
    name: socket.userData.name,
    email: socket.userData.email,
    picture: socket.userData.picture || null,
    role: socket.userData.roles?.[0]?.title || null,
    user_type: socket.userData.user_type_title || null,
    socket: socket,
  });

  // Send current user's info and online users list
  socket.emit('connected', {
    user: {
      id: socket.userId,
      name: socket.userData.name,
      email: socket.userData.email,
      picture: socket.userData.picture || null,
      role: socket.userData.roles?.[0]?.title || null,
      user_type: socket.userData.user_type_title || null,
    },
    onlineUsers: getOnlineUsers(socket.id),
  });

  // Broadcast updated online users list to all clients
  broadcastOnlineUsers();

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId} (${socket.userData.name})`);
    onlineUsers.delete(socket.id);
    broadcastOnlineUsers();
  });

  // Handle ping (for keeping connection alive)
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Handle request for current online users
  socket.on('get_online_users', () => {
    const otherUsers = getOnlineUsers(socket.id);
    const uniqueUsers = otherUsers.filter((user, index, self) => 
      index === self.findIndex(u => u.id === user.id)
    );
    socket.emit('online_users', uniqueUsers);
  });
});

// HTTP endpoint for health check / testing
httpServer.on('request', (req, res) => {
  // Handle health check paths immediately
  if (req.url === '/' || req.url === '/health' || req.url === '/status') {
    res.writeHead(200, { 
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*'
    });
    res.end('online!');
    return;
  }
  
  // For all other routes (including /socket.io/), let Socket.IO handle them
  // Don't respond here - Socket.IO will process the request
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
  console.log(`📡 Laravel API URL: ${LARAVEL_API_URL}`);
  console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || '*'}`);
  console.log(`✅ Health check available at http://localhost:${PORT}/`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

