import { useState, useRef, useEffect } from 'react';
import { Send, Smile } from 'lucide-react';
import { socketService } from '../../services/socketService';
import EmojiPicker from './EmojiPicker';

const MessageInput = ({ onSend, sending, conversationId }) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef(null);
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

  const handleSend = () => {
    if (!message.trim() || sending) return;

    stopTyping();
    onSend(message);
    setMessage('');
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
    <div className="p-4 bg-white border-t border-gray-200 relative">
      {showEmojiPicker && (
        <div className="absolute bottom-full right-4 mb-2">
          <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
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
          className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          style={{ minHeight: '44px', maxHeight: '120px' }}
          onInput={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
        />

        <button
          onClick={handleSend}
          disabled={!message.trim() || sending}
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

