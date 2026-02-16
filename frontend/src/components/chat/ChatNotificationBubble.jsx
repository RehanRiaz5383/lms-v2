import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAppSelector } from '../../hooks/redux';
import { socketService } from '../../services/socketService';
import { getStorageUrl } from '../../config/api';

const ChatNotificationBubble = ({ onOpenChat }) => {
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [notifications, setNotifications] = useState([]); // Array of { conversation_id, sender, message, timestamp }
  const [openConversationIds, setOpenConversationIds] = useState(new Set());

  // Track which conversations are currently open
  useEffect(() => {
    const handleChatOpened = (event) => {
      const { conversationId } = event.detail;
      setOpenConversationIds((prev) => new Set([...prev, conversationId]));
    };

    const handleChatClosed = (event) => {
      const { conversationId } = event.detail;
      setOpenConversationIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(conversationId);
        return newSet;
      });
    };

    window.addEventListener('chatWindowOpened', handleChatOpened);
    window.addEventListener('chatWindowClosed', handleChatClosed);

    return () => {
      window.removeEventListener('chatWindowOpened', handleChatOpened);
      window.removeEventListener('chatWindowClosed', handleChatClosed);
    };
  }, []);

  useEffect(() => {
    // Listen for new messages
    const unsubscribe = socketService.on('new_message', (message) => {
      // Only show notification if:
      // 1. Message is not from current user
      // 2. Conversation is not currently open
      if (
        message.sender_id !== currentUser?.id &&
        !openConversationIds.has(message.conversation_id)
      ) {
        setNotifications((prev) => {
          // Check if notification already exists for this conversation
          const existingIndex = prev.findIndex(
            (n) => n.conversation_id === message.conversation_id
          );

          const notification = {
            conversation_id: message.conversation_id,
            sender: message.sender,
            message: message.message,
            timestamp: message.created_at,
          };

          if (existingIndex >= 0) {
            // Update existing notification
            const updated = [...prev];
            updated[existingIndex] = notification;
            return updated;
          } else {
            // Add new notification
            return [...prev, notification];
          }
        });
      }
    });

    // Listen for chat window opened event to remove notification
    const handleChatOpened = (event) => {
      const { conversationId } = event.detail;
      setNotifications((prev) =>
        prev.filter((n) => n.conversation_id !== conversationId)
      );
    };

    window.addEventListener('chatWindowOpened', handleChatOpened);

    return () => {
      unsubscribe();
      window.removeEventListener('chatWindowOpened', handleChatOpened);
    };
  }, [currentUser?.id, openConversationIds]);

  const handleClick = (notification) => {
    // Remove notification first
    setNotifications((prev) =>
      prev.filter((n) => n.conversation_id !== notification.conversation_id)
    );

    // Open chat window using sender's user ID
    // The ChatManager will handle finding or creating the conversation
    window.dispatchEvent(
      new CustomEvent('openChat', {
        detail: {
          userId: notification.sender?.id,
          conversationId: notification.conversation_id,
        },
      })
    );
  };

  const handleDismiss = (conversationId, e) => {
    e.stopPropagation();
    setNotifications((prev) =>
      prev.filter((n) => n.conversation_id !== conversationId)
    );
  };

  const formatMessage = (message) => {
    if (!message) return '';
    // Limit to 50 characters
    if (message.length > 50) {
      return message.substring(0, 50) + '...';
    }
    return message;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Less than 1 minute
    if (diff < 60000) {
      return 'Just now';
    }
    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    }
    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }
    // More than 24 hours
    return date.toLocaleDateString();
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed left-4 bottom-4 z-[10001] flex flex-col gap-3">
      {notifications.map((notification) => (
        <div
          key={notification.conversation_id}
          onClick={() => handleClick(notification)}
          className="bg-white rounded-lg shadow-2xl border border-gray-200 w-80 cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105 animate-slide-in-left"
        >
          <div className="flex items-start gap-3 p-4">
            {/* Sender Image */}
            <div className="flex-shrink-0">
              {notification.sender?.picture ? (
                <img
                  src={getStorageUrl(notification.sender.picture)}
                  alt={notification.sender.name}
                  className="h-12 w-12 rounded-full object-cover border-2 border-primary"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      notification.sender.name
                    )}&background=6366f1&color=fff`;
                  }}
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                  {notification.sender?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </div>

            {/* Message Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold text-sm text-gray-900 truncate">
                  {notification.sender?.name || 'Unknown'}
                </h4>
                <button
                  onClick={(e) => handleDismiss(notification.conversation_id, e)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0 ml-2"
                  title="Dismiss"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-600 truncate mb-1">
                {formatMessage(notification.message)}
              </p>
              <p className="text-xs text-gray-400">
                {formatTime(notification.timestamp)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatNotificationBubble;

