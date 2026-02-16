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
  async sendMessage(conversationId, message, attachmentData = null) {
    const token = storage.getToken();
    const body = {
      conversation_id: conversationId,
      message: message || '',
    };

    if (attachmentData) {
      body.attachment_path = attachmentData.attachment_path;
      body.attachment_name = attachmentData.attachment_name;
      body.attachment_type = attachmentData.attachment_type;
      body.attachment_size = attachmentData.attachment_size;
      body.google_drive_file_id = attachmentData.google_drive_file_id;
    }

    const response = await fetch(`${API_BASE_URL}/chat/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
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

  /**
   * Get total unread message count
   */
  async getUnreadCount() {
    const token = storage.getToken();
    const response = await fetch(`${API_BASE_URL}/chat/unread-count`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get unread count');
    }

    return response.json();
  }

  /**
   * Get users that can be messaged (for "Send a new message" feature)
   * - Students: Only admin, teachers, and CR users
   * - Admin: All users
   */
  async getMessageableUsers() {
    const token = storage.getToken();
    const response = await fetch(`${API_BASE_URL}/chat/messageable-users`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get messageable users');
    }

    return response.json();
  }

  /**
   * Upload file attachment
   */
  async uploadAttachment(file) {
    const token = storage.getToken();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/chat/upload-attachment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload attachment');
    }

    return response.json();
  }

  /**
   * Get download URL for attachment
   */
  async downloadAttachment(messageId) {
    const token = storage.getToken();
    const response = await fetch(`${API_BASE_URL}/chat/messages/${messageId}/download-attachment`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get download URL');
    }

    return response.json();
  }
}

export const chatService = new ChatService();

