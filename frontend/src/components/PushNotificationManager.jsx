import { useState, useEffect } from 'react';
import { useToast } from './ui/toast';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isSubscribedToPushNotifications,
  requestNotificationPermission,
  getNotificationPermission,
  isPushNotificationSupported,
} from '../services/pushNotifications';
import { apiService } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { Bell, BellOff, Loader2, AlertCircle } from 'lucide-react';

const PushNotificationManager = ({ onSubscriptionChange }) => {
  const { success, showError } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    checkPushNotificationStatus();
  }, []);

  const checkPushNotificationStatus = async () => {
    setIsLoading(true);
    try {
      const supported = isPushNotificationSupported();
      setIsSupported(supported);

      if (!supported) {
        setIsLoading(false);
        return;
      }

      const currentPermission = await getNotificationPermission();
      setPermission(currentPermission);

      // If permission is already granted, check subscription status and auto-enable if not subscribed
      if (currentPermission === 'granted') {
        const subscribed = await isSubscribedToPushNotifications();
        setIsSubscribed(subscribed);
        
        // Auto-enable if permission is granted but not subscribed yet
        if (!subscribed) {
          try {
            await subscribeToPushNotifications();
            setIsSubscribed(true);
            if (onSubscriptionChange) {
              onSubscriptionChange(true);
            }
          } catch (error) {
            console.error('Auto-enable push notifications failed:', error);
            // Don't show error on auto-enable, just set to false
            setIsSubscribed(false);
          }
        }
      } else if (currentPermission === 'default') {
        // If permission is default (not asked yet), default to enabled (true)
        // User can toggle to request permission
        setIsSubscribed(true);
      } else {
        // Permission denied - default to disabled
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error('Error checking push notification status:', error);
      // On error, default to enabled so user can try
      setIsSubscribed(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnablePushNotifications = async () => {
    setIsToggling(true);
    try {
      // Request permission first if not already granted
      if (permission !== 'granted') {
        const newPermission = await requestNotificationPermission();
        setPermission(newPermission);

        if (newPermission !== 'granted') {
          // Permission denied or dismissed
          setIsSubscribed(false);
          if (newPermission === 'denied') {
            showError('Notification permission was denied. Please enable it in your browser settings.');
          } else {
            showError('Notification permission is required to enable push notifications');
          }
          setIsToggling(false);
          return;
        }
      }

      // Subscribe to push notifications
      await subscribeToPushNotifications();
      setIsSubscribed(true);
      success('Push notifications enabled successfully');
      
      if (onSubscriptionChange) {
        onSubscriptionChange(true);
      }
    } catch (error) {
      console.error('Error enabling push notifications:', error);
      setIsSubscribed(false);
      showError(error.message || 'Failed to enable push notifications');
    } finally {
      setIsToggling(false);
    }
  };

  const handleDisablePushNotifications = async () => {
    setIsToggling(true);
    try {
      await unsubscribeFromPushNotifications();
      setIsSubscribed(false);
      success('Push notifications disabled successfully');
      
      if (onSubscriptionChange) {
        onSubscriptionChange(false);
      }
    } catch (error) {
      console.error('Error disabling push notifications:', error);
      showError(error.message || 'Failed to disable push notifications');
    } finally {
      setIsToggling(false);
    }
  };

  const handleToggle = async () => {
    if (isSubscribed) {
      await handleDisablePushNotifications();
    } else {
      await handleEnablePushNotifications();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in this browser
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (permission === 'denied') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Push Notifications Blocked
          </CardTitle>
          <CardDescription>
            Notification permission has been denied. Please enable it in your browser settings to receive push notifications.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive push notifications on your device even when the app is closed
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Label htmlFor="push-notifications" className="text-base font-medium">
              Enable Push Notifications
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              {isSubscribed
                ? 'You will receive push notifications for all your notifications'
                : 'Enable to receive push notifications on your device'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isToggling ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <Switch
                id="push-notifications"
                checked={isSubscribed}
                onCheckedChange={handleToggle}
                disabled={isToggling}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PushNotificationManager;

