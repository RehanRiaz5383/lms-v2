import { useState, useEffect } from 'react';
import { X, User, Users } from 'lucide-react';
import { useAppSelector } from '../../hooks/redux';
import { socketService } from '../../services/socketService';
import { getStorageUrl } from '../../config/api';
import { useToast } from '../ui/toast';

const WhosOnlineSidebar = ({ isOpen, onClose }) => {
  const { user: currentUserFromStore } = useAppSelector((state) => state.auth);
  const [currentUser, setCurrentUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const { info } = useToast();

  // Check if current user is admin (not a student)
  const isAdmin = currentUserFromStore && !(
    currentUserFromStore?.roles?.some(role => role.title?.toLowerCase() === 'student') || 
    currentUserFromStore?.user_type_title?.toLowerCase() === 'student'
  );

  useEffect(() => {
    if (!isOpen) return;

    // Always set current user from Redux store when sidebar opens (ensures it's always shown)
    if (currentUserFromStore) {
      setCurrentUser({
        id: currentUserFromStore.id,
        name: currentUserFromStore.name,
        email: currentUserFromStore.email,
        picture: currentUserFromStore.picture,
        picture_url: currentUserFromStore.picture_url,
        role: currentUserFromStore.roles?.[0]?.title || null,
        user_type: currentUserFromStore.user_type_title || null,
      });
    }

    // Helper function to filter out current user
    const filterCurrentUser = (users) => {
      if (!users || !Array.isArray(users)) {
        return [];
      }
      const currentUserId = currentUserFromStore?.id;
      if (currentUserId) {
        // Convert both to strings for comparison (in case one is string and other is number)
        return users.filter(user => {
          const userId = user?.id;
          return String(userId) !== String(currentUserId);
        });
      }
      return users;
    };

    // Subscribe to user connected event
    const unsubscribeUserConnected = socketService.on('user_connected', (data) => {
      setCurrentUser(data.user);
      // Filter out current user from the initial list
      const filtered = filterCurrentUser(data.onlineUsers);
      setOnlineUsers(filtered);
    });

    // Subscribe to online users updates
    const unsubscribeUsers = socketService.on('online_users_updated', (users) => {
      // The server should already exclude current user, but we filter again for safety
      if (!users || !Array.isArray(users)) {
        console.warn('Received invalid users list:', users);
        setOnlineUsers([]);
        return;
      }
      const filtered = filterCurrentUser(users);
      // Always update state (React will handle re-rendering efficiently)
      setOnlineUsers(filtered);
      console.log('Online users updated in sidebar:', { 
        received: users.length, 
        filtered: filtered.length,
        currentUserId: currentUserFromStore?.id,
        receivedUsers: users.map(u => ({ id: u.id, name: u.name })),
        filteredUsers: filtered.map(u => ({ id: u.id, name: u.name }))
      });
    });

    // Subscribe to connection status
    const unsubscribeConnected = socketService.on('socket_connected', () => {
      setIsConnected(true);
    });

    const unsubscribeDisconnected = socketService.on('socket_disconnected', () => {
      setIsConnected(false);
    });

    // Get initial status
    const status = socketService.getConnectionStatus();
    setIsConnected(status.connected);

    // Request current online users when sidebar opens (if socket is connected)
    // This ensures we get the latest list immediately
    if (status.connected && status.socket) {
      // Request current online users from server
      status.socket.emit('get_online_users');
      console.log('Requested online users from server');
    }

    return () => {
      unsubscribeUserConnected();
      unsubscribeUsers();
      unsubscribeConnected();
      unsubscribeDisconnected();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentUserFromStore?.id]); // Only depend on user ID to avoid unnecessary re-renders

  const handleUserClick = (user) => {
    info('Area under construction');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998]"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-[9999] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h2 className="font-semibold text-lg">Who's Online</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Connection Status */}
        <div className="px-4 py-2 border-b bg-gray-50">
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className={isConnected ? 'text-green-700' : 'text-red-700'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Current User */}
          {(currentUser || currentUserFromStore) && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                You
              </h3>
              <div
                onClick={() => handleUserClick(currentUser || currentUserFromStore)}
                className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg cursor-pointer hover:bg-primary/10 transition-colors"
              >
                <div className="relative">
                  {(currentUser?.picture || currentUserFromStore?.picture) ? (
                    <img
                      src={getStorageUrl(currentUser?.picture || currentUserFromStore?.picture)}
                      alt={currentUser?.name || currentUserFromStore?.name}
                      className="h-12 w-12 rounded-full object-cover border-2 border-primary"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || currentUserFromStore?.name || 'User')}&background=6366f1&color=fff`;
                      }}
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                      {(currentUser?.name || currentUserFromStore?.name)?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {currentUser?.name || currentUserFromStore?.name}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {currentUser?.email || currentUserFromStore?.email}
                  </p>
                  {(currentUser?.role || currentUserFromStore?.roles?.[0]?.title) && (
                    <p className="text-xs text-primary mt-1">
                      {currentUser?.role || currentUserFromStore?.roles?.[0]?.title}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Online Users */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Online Users ({onlineUsers.length})
            </h3>
            {onlineUsers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No other users online
              </p>
            ) : (
              <div className="space-y-2">
                {onlineUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleUserClick(user)}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="relative">
                      {user.picture ? (
                        <img
                          src={getStorageUrl(user.picture)}
                          alt={user.name}
                          className="h-12 w-12 rounded-full object-cover border-2 border-gray-300"
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff`;
                          }}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold">
                          {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {user.name}
                      </p>
                      {/* Show email only for admin users */}
                      {isAdmin && (
                        <p className="text-sm text-gray-500 truncate">
                          {user.email}
                        </p>
                      )}
                      {user.role && (
                        <p className="text-xs text-primary mt-1">{user.role}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default WhosOnlineSidebar;

