import { useState, useEffect, useRef } from 'react';
import { X, Minimize2, Maximize2, Send, Smile } from 'lucide-react';
import { useAppSelector } from '../../hooks/redux';
import { socketService } from '../../services/socketService';
import { chatService } from '../../services/chatService';
import { getStorageUrl } from '../../config/api';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useToast } from '../ui/toast';

const ChatWindow = ({ conversation, otherUser, onClose, onMinimize, isMinimized: externalMinimized }) => {
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(externalMinimized || false);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const { error: showError } = useToast();

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!conversation?.id) return;

    const loadMessages = async () => {
      try {
        setLoading(true);
        const response = await chatService.getMessages(conversation.id);
        if (response.data) {
          setMessages(response.data);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
        showError('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();

    // Mark messages as read
    chatService.markAsRead(conversation.id).catch(console.error);
  }, [conversation?.id, showError]);

  // Listen for new messages
  useEffect(() => {
    const unsubscribe = socketService.on('new_message', (message) => {
      if (message.conversation_id === conversation?.id) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });
        // Mark as read if it's not our message
        if (message.sender_id !== currentUser?.id) {
          chatService.markAsRead(conversation.id).catch(console.error);
        }
      }
    });

    return unsubscribe;
  }, [conversation?.id, currentUser?.id]);

  // Listen for typing indicators
  useEffect(() => {
    const unsubscribe = socketService.on('user_typing', (data) => {
      if (data.conversation_id === conversation?.id && data.user_id !== currentUser?.id) {
        if (data.is_typing) {
          setTypingUsers((prev) => {
            if (!prev.includes(data.user_id)) {
              return [...prev, data.user_id];
            }
            return prev;
          });
        } else {
          setTypingUsers((prev) => prev.filter((id) => id !== data.user_id));
        }
      }
    });

    return unsubscribe;
  }, [conversation?.id, currentUser?.id]);

  const handleSendMessage = async (message, attachment = null) => {
    if ((!message.trim() && !attachment) || sending) return;

    try {
      setSending(true);
      
      // Send via socket
      const status = socketService.getConnectionStatus();
      if (status.connected && status.socket) {
        const messageData = {
          conversation_id: conversation.id,
          message: message.trim() || '',
        };
        if (attachment) {
          messageData.attachment_path = attachment.attachment_path;
          messageData.attachment_name = attachment.attachment_name;
          messageData.attachment_type = attachment.attachment_type;
          messageData.attachment_size = attachment.attachment_size;
          messageData.google_drive_file_id = attachment.google_drive_file_id;
        }
        status.socket.emit('chat_message', messageData);
      } else {
        // Fallback to API if socket not connected
        await chatService.sendMessage(conversation.id, message, attachment);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      showError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (externalMinimized !== undefined) {
      setIsMinimized(externalMinimized);
    }
  }, [externalMinimized]);

  const handleMinimize = () => {
    const newMinimized = !isMinimized;
    setIsMinimized(newMinimized);
    if (onMinimize) {
      onMinimize(newMinimized);
    }
  };

  if (isMinimized) {
    return (
      <div
        className="fixed bottom-4 right-4 w-64 bg-white rounded-lg shadow-2xl border border-gray-200 z-[10000] cursor-pointer hover:shadow-xl transition-shadow"
        onClick={handleMinimize}
      >
        <div className="flex items-center justify-between p-3 bg-primary text-primary-foreground rounded-t-lg">
          <div className="flex items-center gap-2">
            {otherUser?.picture ? (
              <img
                src={getStorageUrl(otherUser.picture)}
                alt={otherUser.name}
                className="h-6 w-6 rounded-full object-cover"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}&background=6366f1&color=fff&size=24`;
                }}
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-semibold">
                {otherUser?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
            <span className="font-semibold text-sm truncate">{otherUser?.name || 'Chat'}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 z-[10000] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-3">
          {otherUser?.picture ? (
            <img
              src={getStorageUrl(otherUser.picture)}
              alt={otherUser.name}
              className="h-10 w-10 rounded-full object-cover border-2 border-white"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}&background=6366f1&color=fff`;
              }}
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center font-semibold">
              {otherUser?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
          <div>
            <h3 className="font-semibold">{otherUser?.name || 'Chat'}</h3>
            {typingUsers.length > 0 && (
              <p className="text-xs opacity-90">typing...</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleMinimize}
            className="p-1.5 hover:bg-white/20 rounded transition-colors"
            title="Minimize"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-gray-500">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <MessageList messages={messages} currentUserId={currentUser?.id} />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput
        onSend={handleSendMessage}
        sending={sending}
        conversationId={conversation?.id}
      />
    </div>
  );
};

export default ChatWindow;

