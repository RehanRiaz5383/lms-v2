import { useState } from 'react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { Download, Loader2, Paperclip } from 'lucide-react';
import { getStorageUrl } from '../../config/api';
import { chatService } from '../../services/chatService';

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
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors w-full min-w-0 ${
        isOwn
          ? 'bg-white/20 hover:bg-white/30 text-white'
          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
      } ${downloading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {downloading ? (
        <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
      ) : (
        <Paperclip className="h-4 w-4 flex-shrink-0" />
      )}
      <span className="text-sm font-medium truncate min-w-0 flex-1" title={message.attachment_name || 'Attachment'}>
        {message.attachment_name || 'Attachment'}
      </span>
      {message.attachment_size && (
        <span className="text-xs opacity-75 flex-shrink-0 whitespace-nowrap">
          ({formatFileSize(message.attachment_size)})
        </span>
      )}
      <Download className="h-4 w-4 flex-shrink-0" />
    </button>
  );
};

const MessageList = ({ messages, currentUserId }) => {
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

  const shouldShowDateSeparator = (currentMessage, previousMessage) => {
    if (!previousMessage) return true;
    const currentDate = new Date(currentMessage.created_at);
    const previousDate = new Date(previousMessage.created_at);
    return !isSameDay(currentDate, previousDate);
  };

  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        const isOwn = message.sender_id === currentUserId;
        const showDateSeparator = shouldShowDateSeparator(message, messages[index - 1]);

        return (
          <div key={message.id}>
            {showDateSeparator && (
              <div className="flex items-center justify-center my-4">
                <div className="bg-gray-200 px-3 py-1 rounded-full text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  {isToday(new Date(message.created_at))
                    ? 'Today'
                    : isYesterday(new Date(message.created_at))
                    ? 'Yesterday'
                    : format(new Date(message.created_at), 'MMMM d, yyyy')}
                </div>
              </div>
            )}

            <div className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {!isOwn && (
                <div className="flex-shrink-0">
                  {message.sender?.picture ? (
                    <img
                      src={getStorageUrl(message.sender.picture)}
                      alt={message.sender.name}
                      className="h-8 w-8 rounded-full object-cover"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(message.sender.name)}&background=6366f1&color=fff&size=32`;
                      }}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold">
                      {message.sender?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
              )}

              <div className={`flex flex-col max-w-[70%] min-w-0 ${isOwn ? 'items-end' : 'items-start'}`}>
                {!isOwn && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 px-2">
                    {message.sender?.name || 'Unknown'}
                  </span>
                )}
                <div
                  className={`rounded-2xl px-4 py-2 min-w-0 w-full ${
                    isOwn
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-white text-gray-900 rounded-bl-sm border border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700'
                  }`}
                >
                  {message.message && (
                    <p className="text-sm whitespace-pre-wrap break-words mb-2 overflow-wrap-anywhere">{message.message}</p>
                  )}
                  {message.attachment_path && (
                    <AttachmentLink message={message} isOwn={isOwn} />
                  )}
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 px-2">
                  {formatMessageTime(message.created_at)}
                  {isOwn && message.is_read && (
                    <span className="ml-1 text-primary">✓✓</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageList;
