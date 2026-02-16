import { Server } from 'socket.io';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import fs from 'fs';
import axios from 'axios';
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

// Store online users: socketId -> user data
const onlineUsers = new Map();

// Store typing users: conversationId -> Set of user IDs who are typing
const typingUsers = new Map();

/**
 * Verify token with Laravel backend
 */
async function verifyToken(token) {
  try {
    const response = await axios.get(`${LARAVEL_API_URL}/socket/verify-token`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    if (response.data && response.data.data) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error('Token verification error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    return null;
  }
}

/**
 * Get list of online users, deduplicated by userId
 * @param {string} excludeSocketId - Socket ID to exclude from the list
 * @returns {Array} Array of unique user objects
 */
function getOnlineUsers(excludeSocketId = null) {
  const userMap = new Map();
  
  onlineUsers.forEach((user, socketId) => {
    // Skip excluded socket
    if (socketId === excludeSocketId) {
      return;
    }
    
    // Deduplicate by userId (in case same user has multiple connections)
    const userId = user.id;
    if (!userMap.has(userId)) {
      userMap.set(userId, user);
    }
  });
  
  return Array.from(userMap.values());
}

/**
 * Broadcast online users list to all connected clients
 * Each client receives a personalized list (excluding themselves)
 */
function broadcastOnlineUsers() {
  const totalSockets = io.sockets.sockets.size;
  const totalUsers = onlineUsers.size;
  console.log(`[broadcastOnlineUsers] Broadcasting to ${totalSockets} sockets, ${totalUsers} users in map`);
  
  io.sockets.sockets.forEach((socket) => {
    const currentUser = onlineUsers.get(socket.id);
    if (!currentUser) {
      console.log(`[broadcastOnlineUsers] No user found for socket ${socket.id}, skipping`);
      return;
    }
    
    // Get all online users except the current socket's user
    const otherUsers = getOnlineUsers(socket.id);
    
    // Send personalized list to this socket
    socket.emit('online_users', otherUsers);
    console.log(`[broadcastOnlineUsers] Sent ${otherUsers.length} users to ${currentUser.name} (ID: ${currentUser.id})`);
  });
}

// Authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  
  if (!token) {
    console.error('No token provided');
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const user = await verifyToken(token);
    
    if (!user) {
      console.error('Token verification failed');
      return next(new Error('Authentication error: Invalid token'));
    }

    // Attach user to socket for later use
    socket.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    next(new Error('Authentication error'));
  }
});

// Handle socket connections
io.on('connection', (socket) => {
  const user = socket.user;
  
  if (!user) {
    console.error('No user attached to socket');
    socket.disconnect();
    return;
  }

  console.log(`[connection] User connected: ${user.name} (ID: ${user.id}, Socket: ${socket.id})`);
  console.log(`[connection] Total users before add: ${onlineUsers.size}`);

  // Add user to online users map
  onlineUsers.set(socket.id, {
    id: user.id,
    name: user.name,
    email: user.email,
    picture: user.picture,
    picture_url: user.picture_url,
    role: user.roles?.[0]?.title || null,
    user_type: user.user_type_title || null,
  });

  console.log(`[connection] Total users after add: ${onlineUsers.size}`);

  // Get all online users except current user
  const otherUsers = getOnlineUsers(socket.id);
  console.log(`[connection] Other users count for ${user.name}: ${otherUsers.length}`);

  // Send connection confirmation with online users list
  socket.emit('connected', {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      picture_url: user.picture_url,
      role: user.roles?.[0]?.title || null,
      user_type: user.user_type_title || null,
    },
    onlineUsers: otherUsers,
  });

  // Broadcast updated online users list to all clients
  broadcastOnlineUsers();

  // Handle ping (keep-alive)
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Handle request for current online users
  socket.on('get_online_users', () => {
    const otherUsers = getOnlineUsers(socket.id);
    socket.emit('online_users', otherUsers);
    console.log(`[get_online_users] Sent ${otherUsers.length} online users to ${user.name} (ID: ${user.id})`);
    console.log(`[get_online_users] Total online users in map: ${onlineUsers.size}`);
    console.log(`[get_online_users] Users sent:`, otherUsers.map(u => ({ id: u.id, name: u.name })));
  });

  // Chat message handlers

  // Handle typing indicator
  socket.on('typing_start', (data) => {
    const { conversation_id } = data;
    if (!conversation_id) return;

    if (!typingUsers.has(conversation_id)) {
      typingUsers.set(conversation_id, new Set());
    }
    typingUsers.get(conversation_id).add(user.id);

    // Broadcast typing status to other users in the conversation
    io.sockets.sockets.forEach((otherSocket) => {
      const otherUser = onlineUsers.get(otherSocket.id);
      if (otherUser && otherUser.id !== user.id) {
        otherSocket.emit('user_typing', {
          conversation_id,
          user_id: user.id,
          user_name: user.name,
          is_typing: true,
        });
      }
    });
  });

  socket.on('typing_stop', (data) => {
    const { conversation_id } = data;
    if (!conversation_id) return;

    if (typingUsers.has(conversation_id)) {
      typingUsers.get(conversation_id).delete(user.id);
      if (typingUsers.get(conversation_id).size === 0) {
        typingUsers.delete(conversation_id);
      }
    }

    // Broadcast typing stop to other users
    io.sockets.sockets.forEach((otherSocket) => {
      const otherUser = onlineUsers.get(otherSocket.id);
      if (otherUser && otherUser.id !== user.id) {
        otherSocket.emit('user_typing', {
          conversation_id,
          user_id: user.id,
          user_name: user.name,
          is_typing: false,
        });
      }
    });
  });

  // Handle chat message
  socket.on('chat_message', async (data) => {
    const { conversation_id, message } = data;

    if (!conversation_id || !message || !message.trim()) {
      socket.emit('chat_error', { message: 'Invalid message data' });
      return;
    }

    try {
      // Save message to database via API
      const response = await axios.post(
        `${LARAVEL_API_URL}/chat/messages`,
        {
          conversation_id,
          message: message.trim(),
        },
        {
          headers: {
            'Authorization': `Bearer ${socket.handshake.auth.token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const savedMessage = response.data.data.message;
      const conversation = response.data.data.conversation;

      // Get participant IDs from conversation
      const participantIds = [conversation.user_one_id];
      if (conversation.user_two_id) {
        participantIds.push(conversation.user_two_id);
      }

      // Send message only to participants who are online
      let sentCount = 0;
      io.sockets.sockets.forEach((otherSocket) => {
        const otherUser = onlineUsers.get(otherSocket.id);
        if (otherUser && participantIds.includes(otherUser.id)) {
          otherSocket.emit('new_message', savedMessage);
          sentCount++;
          console.log(`[chat_message] Sent to ${otherUser.name} (ID: ${otherUser.id})`);
        }
      });

      // Also send to sender (in case they have multiple tabs/devices)
      socket.emit('new_message', savedMessage);

      console.log(`[chat_message] Message sent in conversation ${conversation_id} by ${user.name} to ${sentCount} participant(s): ${participantIds.join(', ')}`);
    } catch (error) {
      console.error('[chat_message] Error saving message:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      socket.emit('chat_error', {
        message: 'Failed to send message',
        error: error.message,
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`User disconnected: ${user.name} (ID: ${user.id}, Socket: ${socket.id}, Reason: ${reason})`);
    
    // Remove user from online users map
    onlineUsers.delete(socket.id);
    
    // Broadcast updated list to remaining clients
    broadcastOnlineUsers();
  });
});

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
httpServer.listen(PORT, '0.0.0.0', () => {
  const protocol = IS_PRODUCTION ? 'https' : 'http';
  console.log(`🚀 Socket.IO server running on ${protocol}://0.0.0.0:${PORT}`);
  console.log(`✅ Health check available at ${protocol}://techinnsolutions.net:${PORT}/`);
  console.log(`📡 Waiting for connections...`);
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
