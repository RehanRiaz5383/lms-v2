import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';
import { chatService } from '../services/chatService';
import { socketService } from '../services/socketService';
import { getStorageUrl } from '../config/api';
import { MessageSquare, Search, Send, Smile } from 'lucide-react';
import { useToast } from '../components/ui/toast';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';

const Inbox = () => {
  const { conversationId: urlConversationId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const refreshTimeoutRef = useRef(null);
  const { error: showError, success: showSuccess } = useToast();

  // Load conversations
  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await chatService.getConversations();
      if (response.data) {
        setConversations(response.data);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
      showError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      // Connect socket if not already connected
      const status = socketService.getConnectionStatus();
      if (!status.connected) {
        socketService.connect().catch((err) => {
          console.error('Failed to connect socket:', err);
        });
      }
      loadConversations();
    }
  }, [currentUser, showError]);

  // Handle URL-based conversation selection
  useEffect(() => {
    if (conversations.length === 0) return;

    const userId = searchParams.get('user');
    const convId = urlConversationId || searchParams.get('conversation');

    if (convId) {
      const conversation = conversations.find((c) => c.id === parseInt(convId));
      if (conversation && conversation.id !== selectedConversation?.id) {
        setSelectedConversation(conversation);
        loadMessages(conversation.id);
      }
    } else if (userId) {
      const conversation = conversations.find(
        (c) => c.other_user?.id === parseInt(userId)
      );
      if (conversation) {
        setSelectedConversation(conversation);
        loadMessages(conversation.id);
        // Update URL to use conversation ID
        navigate(`/dashboard/inbox/${conversation.id}`, { replace: true });
      } else {
        // Conversation doesn't exist yet, create it
        const createAndOpenConversation = async () => {
          try {
            const response = await chatService.getOrCreateConversation(parseInt(userId));
            const newConversation = response.data.conversation;
            // Reload conversations to get the new one
            const convsResponse = await chatService.getConversations();
            if (convsResponse.data) {
              setConversations(convsResponse.data);
              const foundConv = convsResponse.data.find(
                (c) => c.id === newConversation.id
              );
              if (foundConv) {
                setSelectedConversation(foundConv);
                loadMessages(foundConv.id);
                navigate(`/dashboard/inbox/${foundConv.id}`, { replace: true });
              }
            }
          } catch (err) {
            console.error('Failed to create conversation:', err);
            showError('Failed to open conversation');
          }
        };
        createAndOpenConversation();
      }
    }
  }, [urlConversationId, searchParams, conversations, navigate, selectedConversation, showError]);

  // Load messages for selected conversation
  const loadMessages = async (convId) => {
    try {
      setMessagesLoading(true);
      const response = await chatService.getMessages(convId);
      if (response.data) {
        setMessages(response.data);
        // Scroll to bottom after messages are loaded - use longer timeout to ensure DOM is ready
        setTimeout(() => {
          if (messagesEndRef.current) {
            const messagesContainer = messagesEndRef.current.closest('.overflow-y-auto');
            if (messagesContainer) {
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end', inline: 'nearest' });
          }
        }, 400);
      }
      // Mark as read
      await chatService.markAsRead(convId);
      // Update conversation unread count to 0
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === convId ? { ...conv, unread_count: 0 } : conv
        )
      );
    } catch (err) {
      console.error('Failed to load messages:', err);
      showError('Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  };

  // Handle conversation selection
  const handleConversationClick = (conversation) => {
    setSelectedConversation(conversation);
    loadMessages(conversation.id);
    // Update URL
    navigate(`/dashboard/inbox/${conversation.id}`, { replace: true });
    // Refresh conversations to update unread counts after marking as read
    setTimeout(() => {
      loadConversations();
    }, 500);
  };

  // Listen for new messages
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = socketService.on('new_message', (newMessage) => {
      // Update messages if this conversation is selected
      if (selectedConversation && newMessage.conversation_id === selectedConversation.id) {
        setMessages((prev) => {
          // Check if message already exists (by ID or by temp ID replacement)
          const existingIndex = prev.findIndex((m) => m.id === newMessage.id);
          if (existingIndex >= 0) {
            // Replace existing message (might be temp message)
            const updated = [...prev];
            updated[existingIndex] = newMessage;
            return updated;
          }
          // Check if this is replacing a temp message (same conversation, same sender, recent)
          const tempIndex = prev.findIndex(
            (m) =>
              m.id?.toString().startsWith('temp-') &&
              m.conversation_id === newMessage.conversation_id &&
              m.sender_id === newMessage.sender_id &&
              m.message === newMessage.message
          );
          if (tempIndex >= 0) {
            // Replace temp message with real message
            const updated = [...prev];
            updated[tempIndex] = newMessage;
            return updated;
          }
          // Add new message
          return [...prev, newMessage];
        });
        // Mark as read if not from current user
        if (newMessage.sender_id !== currentUser.id) {
          chatService.markAsRead(selectedConversation.id).catch(console.error);
        }
        // Scroll to bottom when new message arrives
        setTimeout(() => {
          if (messagesEndRef.current) {
            const messagesContainer = messagesEndRef.current.closest('.overflow-y-auto');
            if (messagesContainer) {
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
          }
        }, 150);
      }

      // Update conversations list to show latest message and unread count
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === newMessage.conversation_id) {
            const isFromCurrentUser = newMessage.sender_id === currentUser.id;
            const isSelected = selectedConversation?.id === conv.id;
            
            return {
              ...conv,
              last_message_at: newMessage.created_at,
              // Only increment unread if message is from other user AND conversation is not selected
              unread_count:
                !isFromCurrentUser && !isSelected
                  ? (conv.unread_count || 0) + 1
                  : isFromCurrentUser || isSelected
                  ? 0 // Reset to 0 if from current user or if conversation is selected
                  : conv.unread_count || 0,
            };
          }
          return conv;
        })
      );

      // Refresh conversations list from backend to get accurate unread counts
      // This ensures consistency with backend state (debounced to avoid too many calls)
      if (newMessage.sender_id !== currentUser.id) {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
        refreshTimeoutRef.current = setTimeout(() => {
          loadConversations();
        }, 1000);
      }
    });

    return () => {
      unsubscribe();
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [selectedConversation, currentUser]);

  // Listen for typing indicators
  useEffect(() => {
    if (!selectedConversation) return;

    const unsubscribe = socketService.on('user_typing', (data) => {
      if (
        data.conversation_id === selectedConversation.id &&
        data.user_id !== currentUser?.id
      ) {
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
  }, [selectedConversation, currentUser?.id]);

  // Handle send message
  const handleSendMessage = async () => {
    if (!message.trim() || sending || !selectedConversation) return;

    const messageText = message.trim();
    setMessage('');

    // Optimistically add message to UI immediately
    const tempMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: selectedConversation.id,
      sender_id: currentUser.id,
      sender: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        picture: currentUser.picture,
        picture_url: currentUser.picture_url,
      },
      message: messageText,
      is_read: false,
      is_own: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      setSending(true);
      const status = socketService.getConnectionStatus();
      if (status.connected && status.socket) {
        status.socket.emit('chat_message', {
          conversation_id: selectedConversation.id,
          message: messageText,
        });
      } else {
        const response = await chatService.sendMessage(selectedConversation.id, messageText);
        // Replace temp message with real message
        if (response.data?.message) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempMessage.id ? response.data.message : m))
          );
        }
      }

      // Update conversation's last_message_at
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedConversation.id
            ? { ...conv, last_message_at: new Date().toISOString() }
            : conv
        )
      );
    } catch (err) {
      console.error('Failed to send message:', err);
      showError('Failed to send message');
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
    } finally {
      setSending(false);
    }
  };

  // Handle typing indicator
  const handleInputChange = (e) => {
    setMessage(e.target.value);

    if (!selectedConversation) return;

    const status = socketService.getConnectionStatus();
    if (status.connected && status.socket) {
      if (e.target.value.length > 0) {
        status.socket.emit('typing_start', {
          conversation_id: selectedConversation.id,
        });
      } else {
        status.socket.emit('typing_stop', {
          conversation_id: selectedConversation.id,
        });
      }
    }
  };

  // Filter conversations by search
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.other_user?.name?.toLowerCase().includes(query) ||
      conv.other_user?.email?.toLowerCase().includes(query)
    );
  });

  // Format message time
  const formatMessageTime = (date) => {
    const messageDate = new Date(date);
    if (isToday(messageDate)) {
      return format(messageDate, 'HH:mm');
    } else if (isYesterday(messageDate)) {
      return `Yesterday ${format(messageDate, 'HH:mm')}`;
    } else {
      return format(messageDate, 'MMM d, HH:mm');
    }
  };

  // Scroll to bottom when messages change or conversation is selected
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0 && !messagesLoading) {
      // Use a delay to ensure DOM is fully updated and rendered
      const scrollTimeout = setTimeout(() => {
        if (messagesEndRef.current) {
          // Scroll the messages container to bottom
          const messagesContainer = messagesEndRef.current.closest('.overflow-y-auto');
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
          // Also use scrollIntoView as fallback
          messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end', inline: 'nearest' });
        }
      }, 200);
      
      return () => clearTimeout(scrollTimeout);
    }
  }, [messages, selectedConversation?.id, messagesLoading]);

  return (
    <div className="flex h-[calc((100vh-4rem)*0.96)] bg-gray-50">
      {/* Conversations List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold mb-3">Inbox</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => handleConversationClick(conversation)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation?.id === conversation.id
                      ? 'bg-primary/5 border-l-4 border-primary'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {conversation.other_user?.picture ? (
                        <img
                          src={getStorageUrl(conversation.other_user.picture)}
                          alt={conversation.other_user.name}
                          className="h-12 w-12 rounded-full object-cover"
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              conversation.other_user.name
                            )}&background=6366f1&color=fff`;
                          }}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                          {conversation.other_user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}
                      {conversation.unread_count > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center shadow-lg z-10 min-w-[20px]">
                          {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {conversation.other_user?.name || 'Unknown'}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">
                        {conversation.other_user?.email}
                      </p>
                      {conversation.last_message_at && (
                        <p className="text-xs text-gray-400 mt-1">
                          {formatMessageTime(conversation.last_message_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center gap-3">
                {selectedConversation.other_user?.picture ? (
                  <img
                    src={getStorageUrl(selectedConversation.other_user.picture)}
                    alt={selectedConversation.other_user.name}
                    className="h-10 w-10 rounded-full object-cover"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        selectedConversation.other_user.name
                      )}&background=6366f1&color=fff`;
                    }}
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                    {selectedConversation.other_user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {selectedConversation.other_user?.name || 'Unknown'}
                  </h2>
                  {typingUsers.length > 0 && (
                    <p className="text-sm text-gray-500">typing...</p>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50" style={{ maxHeight: 'calc((100vh - 4rem) * 0.96 - 180px)' }}>
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, index) => {
                    const isOwn = msg.sender_id === currentUser?.id;
                    const showDateSeparator =
                      index === 0 ||
                      !isSameDay(
                        new Date(msg.created_at),
                        new Date(messages[index - 1].created_at)
                      );

                    return (
                      <div key={msg.id}>
                        {showDateSeparator && (
                          <div className="flex items-center justify-center my-4">
                            <div className="bg-gray-200 px-3 py-1 rounded-full text-xs text-gray-600">
                              {isToday(new Date(msg.created_at))
                                ? 'Today'
                                : isYesterday(new Date(msg.created_at))
                                ? 'Yesterday'
                                : format(new Date(msg.created_at), 'MMMM d, yyyy')}
                            </div>
                          </div>
                        )}

                        <div className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          {!isOwn && (
                            <div className="flex-shrink-0">
                              {msg.sender?.picture ? (
                                <img
                                  src={getStorageUrl(msg.sender.picture)}
                                  alt={msg.sender.name}
                                  className="h-8 w-8 rounded-full object-cover"
                                  onError={(e) => {
                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                      msg.sender.name
                                    )}&background=6366f1&color=fff&size=32`;
                                  }}
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold">
                                  {msg.sender?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                              )}
                            </div>
                          )}

                          <div
                            className={`flex flex-col max-w-[70%] ${
                              isOwn ? 'items-end' : 'items-start'
                            }`}
                          >
                            {!isOwn && (
                              <span className="text-xs text-gray-500 mb-1 px-2">
                                {msg.sender?.name || 'Unknown'}
                              </span>
                            )}
                            <div
                              className={`rounded-2xl px-4 py-2 ${
                                isOwn
                                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                                  : 'bg-white text-gray-900 rounded-bl-sm border border-gray-200'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {msg.message}
                              </p>
                            </div>
                            <span className="text-xs text-gray-400 mt-1 px-2">
                              {formatMessageTime(msg.created_at)}
                              {isOwn && msg.is_read && (
                                <span className="ml-1 text-primary">✓✓</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-end gap-2">
                <textarea
                  value={message}
                  onChange={handleInputChange}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || sending}
                  className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;

