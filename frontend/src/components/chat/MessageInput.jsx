import { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, X, Loader2 } from 'lucide-react';
import { socketService } from '../../services/socketService';
import { chatService } from '../../services/chatService';
import EmojiPicker from './EmojiPicker';

const MessageInput = ({ onSend, sending, conversationId }) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Stop typing when component unmounts
      if (isTyping && conversationId) {
        stopTyping();
      }
    };
  }, [isTyping, conversationId]);

  const handleInputChange = (e) => {
    setMessage(e.target.value);

    // Handle typing indicator
    if (!isTyping && conversationId) {
      startTyping();
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 1000);
  };

  const startTyping = () => {
    if (!conversationId) return;
    setIsTyping(true);
    const status = socketService.getConnectionStatus();
    if (status.connected && status.socket) {
      status.socket.emit('typing_start', { conversation_id: conversationId });
    }
  };

  const stopTyping = () => {
    if (!conversationId) return;
    setIsTyping(false);
    const status = socketService.getConnectionStatus();
    if (status.connected && status.socket) {
      status.socket.emit('typing_stop', { conversation_id: conversationId });
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      alert('File size must be less than 100MB');
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
      alert(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
  };

  const handleSend = () => {
    if ((!message.trim() && !attachment) || sending || uploading) return;

    stopTyping();
    onSend(message, attachment);
    setMessage('');
    setAttachment(null);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji) => {
    setMessage((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div className="p-4 bg-white border-t border-gray-200 relative dark:bg-gray-800 dark:border-gray-700">
      {showEmojiPicker && (
        <div className="absolute bottom-full right-4 mb-2">
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
          className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Add emoji"
        >
          <Smile className="h-5 w-5" />
        </button>

        <textarea
          ref={inputRef}
          value={message}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
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
          onClick={handleSend}
          disabled={(!message.trim() && !attachment) || sending || uploading}
          className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Send message"
        >
          {sending ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default MessageInput;

