import { API_BASE_URL } from '../config/api';
import { storage } from '../utils/storage';

class ChatService {
  /**
   * Get or create a conversation
   */
  async getOrCreateConversation(userId = null) {
    const token = storage.getToken();
    const response = await fetch(`${API_BASE_URL}/chat/conversations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ user_id: userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to get or create conversation');
    }

    return response.json();
  }

  /**
   * Get all conversations for current user
   */
  async getConversations() {
    const token = storage.getToken();
    const response = await fetch(`${API_BASE_URL}/chat/conversations`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get conversations');
    }

    return response.json();
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId) {
    const token = storage.getToken();
    const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/messages`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get messages');
    }

    return response.json();
  }

  /**
   * Send a message (via socket, but this can be used as fallback)
   */
  async sendMessage(conversationId, message) {
    const token = storage.getToken();
    const response = await fetch(`${API_BASE_URL}/chat/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        message,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return response.json();
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId) {
    const token = storage.getToken();
    const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to mark messages as read');
    }

    return response.json();
  }
}

export const chatService = new ChatService();

