import { io } from 'socket.io-client';
import { API_BASE_URL, APP_MODE } from '../config/api';
import { storage } from '../utils/storage';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.socketUrl = null;
  }

  /**
   * Initialize socket connection
   */
  async connect() {
    // If already connected, don't create a new connection
    if (this.socket?.connected) {
      return;
    }

    // If socket exists but not connected, disconnect first to avoid duplicates
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    try {
      // Get socket configuration from backend
      const token = storage.getToken();
      if (!token) {
        console.warn('No token available for socket connection');
        return;
      }

      // Fetch socket config from backend
      const response = await fetch(`${API_BASE_URL}/socket/config`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch socket config');
      }

      const config = await response.json();
      
      if (!config.data?.enabled) {
        console.warn('Socket is disabled');
        return;
      }

      this.socketUrl = config.data.socket_url || 'http://localhost:8080';
      
      // Log the socket URL being used (for debugging)
      console.log('Connecting to socket server:', this.socketUrl);

      // Create socket connection with increased timeout for production
      // Use longer timeout in production due to network latency
      const connectionTimeout = APP_MODE === 'production' ? 30000 : 20000; // 30s production, 20s dev
      
      this.socket = io(this.socketUrl, {
        auth: {
          token: token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000, // Increased max delay
        reconnectionAttempts: 10, // Increased attempts
        timeout: connectionTimeout,
        forceNew: false,
        upgrade: true,
        rememberUpgrade: true,
        // Additional options for better connection handling
        withCredentials: false,
        autoConnect: true,
      });

      // Connection event handlers
      this.socket.on('connect', () => {
        console.log('Socket connected');
        this.isConnected = true;
        this.emit('socket_connected');
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
        this.isConnected = false;
        this.emit('socket_disconnected');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', {
          message: error.message,
          type: error.type,
          description: error.description,
          context: error.context,
          socketUrl: this.socketUrl,
        });
        this.isConnected = false;
        this.emit('socket_error', error);
      });

      // Handle timeout specifically
      this.socket.on('connect_timeout', (timeout) => {
        console.error('Socket connection timeout:', {
          timeout,
          socketUrl: this.socketUrl,
          message: 'Connection to socket server timed out. Please check if the server is running and accessible.',
        });
        this.isConnected = false;
        this.emit('socket_error', new Error('Connection timeout'));
      });

      // Handle connected event from server
      this.socket.on('connected', (data) => {
        this.emit('user_connected', data);
      });

      // Handle online users list
      this.socket.on('online_users', (users) => {
        this.emit('online_users_updated', users);
      });

      // Handle new chat message
      this.socket.on('new_message', (message) => {
        this.emit('new_message', message);
      });

      // Handle user typing indicator
      this.socket.on('user_typing', (data) => {
        this.emit('user_typing', data);
      });

      // Handle chat errors
      this.socket.on('chat_error', (error) => {
        this.emit('chat_error', error);
      });

      // Handle pong
      this.socket.on('pong', () => {
        // Keep-alive response
      });

      // Send ping periodically to keep connection alive
      this.pingInterval = setInterval(() => {
        if (this.socket?.connected) {
          this.socket.emit('ping');
        }
      }, 30000); // Every 30 seconds

    } catch (error) {
      console.error('Failed to connect socket:', error);
      this.isConnected = false;
      this.emit('socket_error', error);
    }
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }

    this.listeners.clear();
  }

  /**
   * Emit custom event to listeners
   */
  emit(event, data) {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in socket event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Subscribe to custom events
   */
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.listeners.get(event) || [];
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * Get current connection status
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socket: this.socket,
    };
  }

  /**
   * Request current online users from server
   */
  requestOnlineUsers() {
    if (this.socket?.connected) {
      this.socket.emit('get_online_users');
      console.log('Requested online users from server');
    } else {
      console.warn('Cannot request online users: socket not connected');
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();

