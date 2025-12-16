import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { apiService } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { useToast } from '../ui/toast';

const NotificationDropdown = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const dropdownRef = useRef(null);
  const scrollRef = useRef(null);
  const { error: showError } = useToast();

  // Fetch notifications
  const fetchNotifications = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await apiService.get(API_ENDPOINTS.notifications.list, {
        params: { page: pageNum, per_page: 10 },
      });

      const { notifications: newNotifications, pagination } = response.data.data;

      if (append) {
        setNotifications((prev) => [...prev, ...newNotifications]);
      } else {
        setNotifications(newNotifications);
      }

      setHasMore(pagination.has_more);
      setPage(pageNum);
    } catch (err) {
      showError('Failed to load notifications');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [showError]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await apiService.get(API_ENDPOINTS.notifications.unreadCount);
      setUnreadCount(response.data.data.count || 0);
    } catch (err) {
      // Silently fail
    }
  }, []);

  // Load notifications on mount and when opened
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(1, false);
    }
  }, [isOpen, fetchNotifications]);

  // Fetch unread count periodically
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Handle scroll for infinite scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || loadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      // Near bottom, load more
      fetchNotifications(page + 1, true);
    }
  }, [page, hasMore, loadingMore, fetchNotifications]);

  // Mark notification as read
  const handleMarkAsRead = async (notificationId, e) => {
    if (e) {
      e.stopPropagation();
    }
    try {
      await apiService.post(
        API_ENDPOINTS.notifications.markAsRead.replace(':id', notificationId)
      );
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      showError('Failed to mark notification as read');
    }
  };

  // Navigate to notification detail page
  const handleNotificationClick = (notificationId) => {
    setIsOpen(false);
    navigate(`/dashboard/notifications/${notificationId}`);
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await apiService.post(API_ENDPOINTS.notifications.markAllAsRead);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      showError('Failed to mark all notifications as read');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const formatTime = (dateString) => {
    if (!dateString) return 'Just now';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);

      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Just now';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50 max-h-[500px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="overflow-y-auto flex-1"
            style={{ maxHeight: '400px' }}
          >
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No notifications
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 hover:bg-accent transition-colors ${
                      !notification.read ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleNotificationClick(notification.id)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-foreground">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={(e) => handleMarkAsRead(notification.id, e)}
                          title="Mark as read"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Loading More */}
            {loadingMore && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;

