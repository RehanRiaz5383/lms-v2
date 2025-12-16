import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, Calendar, Clock, FileText } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { apiService } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { useToast } from '../components/ui/toast';

const NotificationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [markingAsRead, setMarkingAsRead] = useState(false);

  useEffect(() => {
    loadNotification();
  }, [id]);

  const loadNotification = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(
        API_ENDPOINTS.notifications.show.replace(':id', id)
      );
      setNotification(response.data.data);
    } catch (err) {
      showError('Failed to load notification');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (e) => {
    e.stopPropagation();
    if (notification.read || markingAsRead) return;

    try {
      setMarkingAsRead(true);
      await apiService.post(
        API_ENDPOINTS.notifications.markAsRead.replace(':id', id)
      );
      setNotification((prev) => ({
        ...prev,
        read: true,
        read_at: new Date().toISOString(),
      }));
      success('Notification marked as read');
    } catch (err) {
      showError('Failed to mark notification as read');
    } finally {
      setMarkingAsRead(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Notification not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // Parse notification data if it's a string
  let notificationData = null;
  if (notification.data) {
    try {
      notificationData =
        typeof notification.data === 'string'
          ? JSON.parse(notification.data)
          : notification.data;
    } catch {
      notificationData = null;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Notification Details
            </h1>
            <p className="text-muted-foreground mt-2">
              View complete notification information
            </p>
          </div>
        </div>
        {!notification.read && (
          <Button
            onClick={handleMarkAsRead}
            disabled={markingAsRead}
            variant="outline"
          >
            {markingAsRead ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Marking...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Mark as Read
              </>
            )}
          </Button>
        )}
      </div>

      {/* Notification Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-2xl">{notification.title}</CardTitle>
                {!notification.read && (
                  <span className="px-2 py-1 bg-blue-500/10 text-blue-600 text-xs font-medium rounded">
                    Unread
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(notification.created_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(notification.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Message */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Message</h3>
            </div>
            <p className="text-foreground whitespace-pre-wrap leading-relaxed">
              {notification.message}
            </p>
          </div>

          {/* Additional Data */}
          {notificationData && (
            <div className="pt-4 border-t border-border">
              <h3 className="font-semibold text-foreground mb-4">
                Additional Information
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {notificationData.task_id && (
                  <div>
                    <Label className="text-muted-foreground">Task</Label>
                    <p className="font-medium">
                      {notificationData.task_title || `Task #${notificationData.task_id}`}
                    </p>
                  </div>
                )}
                {notificationData.subject_title && (
                  <div>
                    <Label className="text-muted-foreground">Subject</Label>
                    <p className="font-medium">{notificationData.subject_title}</p>
                  </div>
                )}
                {notificationData.batch_title && (
                  <div>
                    <Label className="text-muted-foreground">Batch</Label>
                    <p className="font-medium">{notificationData.batch_title}</p>
                  </div>
                )}
                {notificationData.marks !== null &&
                  notificationData.marks !== undefined && (
                    <div>
                      <Label className="text-muted-foreground">Marks</Label>
                      <p className="font-medium text-lg">
                        {notificationData.marks}
                      </p>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* Read Status */}
          {notification.read && notification.read_at && (
            <div className="pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-green-500" />
                <span>Read on {formatDate(notification.read_at)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationDetail;

