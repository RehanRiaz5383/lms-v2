import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { useAppSelector } from '../../hooks/redux';
import { socketService } from '../../services/socketService';

const WhosOnlineButton = ({ onClick }) => {
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [onlineCount, setOnlineCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Subscribe to online users updates
    const unsubscribeUsers = socketService.on('online_users_updated', (users) => {
      // Filter out current user to ensure count is accurate
      // Convert to strings for comparison (handles string vs number mismatch)
      const currentUserId = currentUser?.id;
      if (currentUserId && users && Array.isArray(users)) {
        const filteredUsers = users.filter(user => String(user?.id) !== String(currentUserId));
        setOnlineCount(filteredUsers.length);
      } else if (users && Array.isArray(users)) {
        setOnlineCount(users.length);
      } else {
        setOnlineCount(0);
      }
    });

    // Subscribe to connection status
    const unsubscribeConnected = socketService.on('socket_connected', () => {
      setIsConnected(true);
    });

    const unsubscribeDisconnected = socketService.on('socket_disconnected', () => {
      setIsConnected(false);
    });

    // Get initial count
    const status = socketService.getConnectionStatus();
    setIsConnected(status.connected);

    return () => {
      unsubscribeUsers();
      unsubscribeConnected();
      unsubscribeDisconnected();
    };
  }, [currentUser]);

  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 z-[9999] flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
      style={{ left: '50px' }}
      title="Who's Online"
    >
      <div className="relative">
        <Users className="h-5 w-5" />
        {isConnected && (
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></span>
        )}
      </div>
      <span className="font-semibold">Who's Online</span>
      {onlineCount > 0 && (
        <span className="bg-white text-primary px-2 py-0.5 rounded-full text-xs font-bold">
          {onlineCount}
        </span>
      )}
    </button>
  );
};

export default WhosOnlineButton;

