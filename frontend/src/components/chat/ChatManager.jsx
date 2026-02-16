import { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '../../hooks/redux';
import { chatService } from '../../services/chatService';
import { socketService } from '../../services/socketService';
import ChatWindow from './ChatWindow';

const ChatManager = () => {
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [openChats, setOpenChats] = useState([]); // Array of { conversation, otherUser, minimized }

  // Clear all chats when user logs out
  useEffect(() => {
    if (!currentUser) {
      setOpenChats([]);
    }
  }, [currentUser]);

  const openChat = useCallback(async (userId = null, conversationId = null) => {
    try {
      // If conversationId is provided, use it to find existing chat
      if (conversationId) {
        const existingChat = openChats.find(
          (chat) => chat.conversation.id === conversationId
        );

        if (existingChat) {
          // If minimized, restore it
          setOpenChats((prev) =>
            prev.map((chat) =>
              chat.conversation.id === conversationId
                ? { ...chat, minimized: false }
                : chat
            )
          );
          // Notify that chat window was opened
          window.dispatchEvent(
            new CustomEvent('chatWindowOpened', { detail: { conversationId } })
          );
          return;
        }

        // Get conversation by ID (we'll need to fetch it)
        // For now, fall through to getOrCreateConversation
      }

      // Check if chat already open
      const existingChat = openChats.find(
        (chat) =>
          (userId === null && chat.conversation.is_self_chat) ||
          (userId && chat.otherUser?.id === userId)
      );

      if (existingChat) {
        // If minimized, restore it
        setOpenChats((prev) =>
          prev.map((chat) =>
            chat.conversation.id === existingChat.conversation.id
              ? { ...chat, minimized: false }
              : chat
          )
        );
        // Notify that chat window was opened
        window.dispatchEvent(
          new CustomEvent('chatWindowOpened', {
            detail: { conversationId: existingChat.conversation.id },
          })
        );
        return;
      }

      // Get or create conversation
      const response = await chatService.getOrCreateConversation(userId);
      const conversationData = response.data.conversation;

      setOpenChats((prev) => [
        ...prev,
        {
          conversation: conversationData,
          otherUser: conversationData.other_user,
          minimized: false,
        },
      ]);

      // Notify that chat window was opened
      window.dispatchEvent(
        new CustomEvent('chatWindowOpened', {
          detail: { conversationId: conversationData.id },
        })
      );
    } catch (error) {
      console.error('Failed to open chat:', error);
    }
  }, [openChats]);

  // Listen for chat open requests from other components
  useEffect(() => {
    // Don't listen if user is not authenticated
    if (!currentUser) {
      return;
    }

    const handleOpenChat = async (event) => {
      // Only process if user is still authenticated
      if (!currentUser) {
        return;
      }

      const { userId, conversationId } = event.detail;
      await openChat(userId, conversationId);
    };

    window.addEventListener('openChat', handleOpenChat);
    return () => window.removeEventListener('openChat', handleOpenChat);
  }, [openChat, currentUser]);

  const closeChat = (conversationId) => {
    setOpenChats((prev) => prev.filter((chat) => chat.conversation.id !== conversationId));
    // Notify that chat window was closed
    window.dispatchEvent(
      new CustomEvent('chatWindowClosed', { detail: { conversationId } })
    );
  };

  const toggleMinimize = (conversationId) => {
    setOpenChats((prev) =>
      prev.map((chat) =>
        chat.conversation.id === conversationId ? { ...chat, minimized: !chat.minimized } : chat
      )
    );
  };

  // Update conversations when new messages arrive
  useEffect(() => {
    // Don't listen if user is not authenticated
    if (!currentUser) {
      return;
    }

    const unsubscribe = socketService.on('new_message', (message) => {
      // Only process if user is still authenticated
      if (!currentUser) {
        return;
      }

      setOpenChats((prev) =>
        prev.map((chat) => {
          if (chat.conversation.id === message.conversation_id) {
            return {
              ...chat,
              conversation: {
                ...chat.conversation,
                last_message_at: message.created_at,
              },
            };
          }
          return chat;
        })
      );
    });

    return unsubscribe;
  }, [currentUser]);

  // Position chat windows (stack them)
  const getChatPosition = (index) => {
    const baseRight = 16; // 4 * 4px = 16px
    const baseBottom = 16;
    const chatWidth = 384; // w-96 = 384px
    const spacing = 16;
    return {
      right: `${baseRight + index * (chatWidth + spacing)}px`,
      bottom: `${baseBottom}px`,
    };
  };

  // Don't render if user is not authenticated
  if (!currentUser) {
    return null;
  }

  return (
    <>
      {openChats.map((chat, index) => (
        <div
          key={chat.conversation.id}
          style={getChatPosition(index)}
          className="fixed z-[10000]"
        >
          <ChatWindow
            conversation={chat.conversation}
            otherUser={chat.otherUser}
            onClose={() => closeChat(chat.conversation.id)}
            onMinimize={(minimized) => {
              setOpenChats((prev) =>
                prev.map((c) =>
                  c.conversation.id === chat.conversation.id ? { ...c, minimized } : c
                )
              );
            }}
            isMinimized={chat.minimized}
          />
        </div>
      ))}
    </>
  );
};

// Helper function to open chat from anywhere
export const openChatWindow = (userId = null) => {
  window.dispatchEvent(new CustomEvent('openChat', { detail: { userId } }));
};

export default ChatManager;

