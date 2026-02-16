import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { getStorageUrl } from '../../config/api';

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
                <div className="bg-gray-200 px-3 py-1 rounded-full text-xs text-gray-600">
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

              <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                {!isOwn && (
                  <span className="text-xs text-gray-500 mb-1 px-2">
                    {message.sender?.name || 'Unknown'}
                  </span>
                )}
                <div
                  className={`rounded-2xl px-4 py-2 ${
                    isOwn
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-white text-gray-900 rounded-bl-sm border border-gray-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                </div>
                <span className="text-xs text-gray-400 mt-1 px-2">
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

