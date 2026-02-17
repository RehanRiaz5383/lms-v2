import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';
import { chatService } from '../services/chatService';
import { socketService } from '../services/socketService';
import { getStorageUrl } from '../config/api';
import { MessageSquare, Search, Send, Smile, UserPlus, Paperclip, X, Loader2, Download } from 'lucide-react';
import { useToast } from '../components/ui/toast';
import { Dialog } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import EmojiPicker from '../components/chat/EmojiPicker';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { playNotificationSound } from '../utils/notificationSound';

const AttachmentLink = ({ message, isOwn }) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (downloading) return;
    
    setDownloading(true);
    try {
      const response = await chatService.downloadAttachment(message.id);
      if (response.data?.download_url) {
        // Open download URL in new tab
        window.open(response.data.download_url, '_blank');
      }
    } catch (error) {
      console.error('Failed to download attachment:', error);
      alert('Failed to download file. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
        isOwn
          ? 'bg-white/20 hover:bg-white/30 text-white'
          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
      } ${downloading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {downloading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Paperclip className="h-4 w-4" />
      )}
      <span className="text-sm font-medium truncate max-w-[200px]">
        {message.attachment_name || 'Attachment'}
      </span>
      {message.attachment_size && (
        <span className="text-xs opacity-75">
          ({formatFileSize(message.attachment_size)})
        </span>
      )}
      <Download className="h-4 w-4 ml-auto" />
    </button>
  );
};

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
  const [attachment, setAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef(null);
  const refreshTimeoutRef = useRef(null);
  const conversationsLoadedRef = useRef(false);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const { error: showError, success: showSuccess } = useToast();
  
  // Admin-only: Send message to any user
  const [showUserSelectDialog, setShowUserSelectDialog] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Check if user is admin
  const isAdmin = () => {
    if (!currentUser) return false;
    // Check roles array (primary method)
    if (currentUser.roles && Array.isArray(currentUser.roles)) {
      return currentUser.roles.some(role => role.title?.toLowerCase() === 'admin');
    }
    // Fallback to user_type (backward compatibility)
    return currentUser.user_type === 1 || currentUser.user_type_title?.toLowerCase() === 'admin';
  };

  // Check if user is student
  const isStudent = () => {
    if (!currentUser) return false;
    // Check roles array (primary method)
    if (currentUser.roles && Array.isArray(currentUser.roles)) {
      return currentUser.roles.some(role => role.title?.toLowerCase() === 'student');
    }
    // Fallback to user_type (backward compatibility)
    return currentUser.user_type === 2 || currentUser.user_type_title?.toLowerCase() === 'student';
  };

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

  // Load all users that can be messaged
  const loadAllUsers = async () => {
    try {
      setUsersLoading(true);
      // Use the chat-specific endpoint that handles role-based filtering on the backend
      const response = await chatService.getMessageableUsers();
      if (response.data) {
        setAllUsers(response.data);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      showError('Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  // Handle user selection from dialog
  const handleUserSelect = async (selectedUser) => {
    try {
      // Close dialog immediately for better UX
      setShowUserSelectDialog(false);
      setUserSearchQuery('');
      
      // Format conversation immediately with user data (optimistic update)
      const tempConversation = {
        id: null, // Will be set after API call
        is_self_chat: false,
        other_user: {
          id: selectedUser.id,
          name: selectedUser.name,
          email: selectedUser.email,
          picture: selectedUser.picture,
          picture_url: selectedUser.picture_url,
        },
        last_message_at: null,
        unread_count: 0,
      };
      
      // Show conversation immediately (optimistic)
      setSelectedConversation(tempConversation);
      setMessages([]); // Clear previous messages
      navigate(`/dashboard/inbox`, { replace: true }); // Navigate first
      
      // Create or get conversation with selected user (in background)
      const response = await chatService.getOrCreateConversation(selectedUser.id);
      if (response.data) {
        // The response structure is: { data: { conversation: {...} } }
        const conversation = response.data.conversation || response.data;
        
        // Format conversation to match the structure from getConversations
        const formattedConversation = {
          id: conversation.id,
          is_self_chat: conversation.is_self_chat || false,
          other_user: conversation.other_user || tempConversation.other_user,
          last_message_at: conversation.last_message_at || null,
          unread_count: 0,
        };
        
        // Check if conversation already exists in list
        const existingIndex = conversations.findIndex((c) => c.id === conversation.id);
        if (existingIndex >= 0) {
          // Update existing conversation
          setConversations((prev) => {
            const updated = [...prev];
            updated[existingIndex] = formattedConversation;
            return updated;
          });
        } else {
          // Add new conversation to the beginning of the list
          setConversations((prev) => [formattedConversation, ...prev]);
        }
        
        // Update selected conversation with real data and load messages
        setSelectedConversation(formattedConversation);
        navigate(`/dashboard/inbox/${conversation.id}`, { replace: true });
        // Load messages (this will happen in background)
        loadMessages(conversation.id);
      }
    } catch (err) {
      console.error('Failed to open conversation:', err);
      showError('Failed to open conversation');
      // Reset on error
      setSelectedConversation(null);
    }
  };

  // Filter users based on search query
  const filteredUsers = allUsers.filter((user) => {
    if (!userSearchQuery.trim()) return true;
    const query = userSearchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.first_name?.toLowerCase().includes(query) ||
      user.last_name?.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    if (currentUser && !conversationsLoadedRef.current) {
      // Connect socket if not already connected
      const status = socketService.getConnectionStatus();
      if (!status.connected) {
        socketService.connect().catch((err) => {
          console.error('Failed to connect socket:', err);
        });
      }
      // Only load conversations once on initial mount
      conversationsLoadedRef.current = true;
      loadConversations();
    }
    // Reset flag when user changes
    if (!currentUser) {
      conversationsLoadedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Handle URL-based conversation selection (only when URL changes, not when conversations update)
  useEffect(() => {
    if (conversations.length === 0) return;

    const userId = searchParams.get('user');
    const convId = urlConversationId || searchParams.get('conversation');

    // Only process if we have a URL parameter and it's different from current selection
    if (convId) {
      const conversationId = parseInt(convId);
      // Only load if it's a different conversation than currently selected
      if (selectedConversation?.id !== conversationId) {
        const conversation = conversations.find((c) => c.id === conversationId);
        if (conversation) {
          setSelectedConversation(conversation);
          loadMessages(conversation.id);
        }
      }
    } else if (userId) {
      const userIdInt = parseInt(userId);
      const conversation = conversations.find(
        (c) => c.other_user?.id === userIdInt
      );
      if (conversation) {
        // Only load if it's a different conversation than currently selected
        if (selectedConversation?.id !== conversation.id) {
          setSelectedConversation(conversation);
          loadMessages(conversation.id);
          // Update URL to use conversation ID
          navigate(`/dashboard/inbox/${conversation.id}`, { replace: true });
        }
      } else {
        // Conversation doesn't exist yet, create it
        const createAndOpenConversation = async () => {
          try {
            const response = await chatService.getOrCreateConversation(userIdInt);
            if (response.data) {
              const newConversation = response.data.conversation || response.data;
              
              // Format conversation to match structure
              const formattedConversation = {
                id: newConversation.id,
                is_self_chat: newConversation.is_self_chat || false,
                other_user: newConversation.other_user || null,
                last_message_at: newConversation.last_message_at || null,
                unread_count: 0,
              };
              
              // Add to conversations list if not exists
              const existingIndex = conversations.findIndex((c) => c.id === formattedConversation.id);
              if (existingIndex >= 0) {
                setConversations((prev) => {
                  const updated = [...prev];
                  updated[existingIndex] = formattedConversation;
                  return updated;
                });
              } else {
                setConversations((prev) => [formattedConversation, ...prev]);
              }
              
              setSelectedConversation(formattedConversation);
              loadMessages(formattedConversation.id);
              navigate(`/dashboard/inbox/${formattedConversation.id}`, { replace: true });
            }
          } catch (err) {
            console.error('Failed to create conversation:', err);
            showError('Failed to open conversation');
          }
        };
        createAndOpenConversation();
      }
    }
    // Only depend on URL params, not on conversations or selectedConversation to avoid unnecessary re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlConversationId, searchParams]);

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
    // Only update if it's a different conversation
    if (selectedConversation?.id !== conversation.id) {
      setSelectedConversation(conversation);
      loadMessages(conversation.id);
      // Update URL
      navigate(`/dashboard/inbox/${conversation.id}`, { replace: true });
      // Update unread count for this conversation locally (no need to reload all conversations)
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversation.id ? { ...conv, unread_count: 0 } : conv
        )
      );
    }
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

      // Play notification sound if message is not from current user and not from selected conversation
      if (
        newMessage.sender_id !== currentUser.id &&
        (!selectedConversation || newMessage.conversation_id !== selectedConversation.id)
      ) {
        playNotificationSound();
      }

      // Update conversations list to show latest message and unread count (optimistic update)
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

      // Only refresh conversations list from backend if message is from another user
      // Use debounce to avoid excessive API calls (increased timeout to reduce calls)
      if (newMessage.sender_id !== currentUser.id) {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
        refreshTimeoutRef.current = setTimeout(() => {
          loadConversations();
        }, 2000); // Increased from 1000ms to 2000ms to reduce API calls
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

  // Handle file select
  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validate file size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      showError('File size must be less than 100MB');
      return;
    }

    setUploading(true);
    try {
      const response = await chatService.uploadAttachment(file);
      setAttachment({
        attachment_path: response.data.attachment_path,
        attachment_name: response.data.attachment_name,
        attachment_type: response.data.attachment_type,
        attachment_size: response.data.attachment_size,
        google_drive_file_id: response.data.google_drive_file_id,
      });
    } catch (error) {
      showError(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    await handleFileUpload(file);
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading && !sending) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (uploading || sending) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Only handle the first file
      await handleFileUpload(files[0]);
    }
  };

  // Handle send message
  const handleSendMessage = async () => {
    if ((!message.trim() && !attachment) || sending || uploading || !selectedConversation) return;

    const messageText = message.trim();
    const attachmentData = attachment;
    setMessage('');
    setAttachment(null);

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
      attachment_path: attachmentData?.attachment_path,
      attachment_name: attachmentData?.attachment_name,
      attachment_type: attachmentData?.attachment_type,
      attachment_size: attachmentData?.attachment_size,
      google_drive_file_id: attachmentData?.google_drive_file_id,
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
        const messageData = {
          conversation_id: selectedConversation.id,
          message: messageText || '',
        };
        if (attachmentData) {
          messageData.attachment_path = attachmentData.attachment_path;
          messageData.attachment_name = attachmentData.attachment_name;
          messageData.attachment_type = attachmentData.attachment_type;
          messageData.attachment_size = attachmentData.attachment_size;
          messageData.google_drive_file_id = attachmentData.google_drive_file_id;
        }
        status.socket.emit('chat_message', messageData);
      } else {
        const response = await chatService.sendMessage(selectedConversation.id, messageText, attachmentData);
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

  // Handle emoji selection
  const handleEmojiSelect = (emoji) => {
    setMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        // Check if click is not on the emoji button
        const emojiButton = event.target.closest('button[title="Add emoji"]');
        if (!emojiButton) {
          setShowEmojiPicker(false);
        }
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

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
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-semibold">Inbox</h1>
            <Button
              onClick={() => {
                setShowUserSelectDialog(true);
                loadAllUsers();
              }}
              size="sm"
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Send a new message
            </Button>
          </div>
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
                                  : 'bg-white text-gray-900 rounded-bl-sm border border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700'
                              }`}
                            >
                              {msg.message && (
                                <p className="text-sm whitespace-pre-wrap break-words mb-2">
                                  {msg.message}
                                </p>
                              )}
                              {msg.attachment_path && (
                                <AttachmentLink message={msg} isOwn={isOwn} />
                              )}
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
            <div
              ref={dropZoneRef}
              className={`bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 relative ${
                isDragging ? 'border-primary border-2 border-dashed bg-primary/5' : ''
              }`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {showEmojiPicker && (
                <div ref={emojiPickerRef} className="absolute bottom-full right-4 mb-2 z-50">
                  <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
                </div>
              )}
              {attachment && (
                <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Paperclip className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {attachment.attachment_name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                      ({(attachment.attachment_size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={handleRemoveAttachment}
                    className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                    title="Remove attachment"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={uploading || sending}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || sending}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Attach file"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Paperclip className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Add emoji"
                >
                  <Smile className="h-5 w-5" />
                </button>
                <textarea
                  value={message}
                  onChange={handleInputChange}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                      setShowEmojiPicker(false);
                    }
                  }}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 resize-none border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                />
                <button
                  onClick={() => {
                    handleSendMessage();
                    setShowEmojiPicker(false);
                  }}
                  disabled={(!message.trim() && !attachment) || sending || uploading}
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

      {/* User Selection Dialog */}
      <Dialog
          isOpen={showUserSelectDialog}
          onClose={() => {
            setShowUserSelectDialog(false);
            setUserSearchQuery('');
          }}
          title="Select User to Send Message"
          size="md"
        >
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                autoFocus
              />
            </div>

            {/* Users List */}
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg dark:border-gray-700">
              {usersLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  {userSearchQuery ? 'No users found' : 'No users available'}
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleUserSelect(user)}
                      className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3"
                    >
                      <div className="relative">
                        {user.picture ? (
                          <img
                            src={getStorageUrl(user.picture)}
                            alt={user.name}
                            className="h-10 w-10 rounded-full object-cover"
                            onError={(e) => {
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                user.name || 'User'
                              )}&background=6366f1&color=fff`;
                            }}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {user.name || 'Unknown'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </p>
                        {user.roles_titles && user.roles_titles.length > 0 && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {Array.isArray(user.roles_titles) ? user.roles_titles.join(', ') : user.roles_titles}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Dialog>
    </div>
  );
};

export default Inbox;

