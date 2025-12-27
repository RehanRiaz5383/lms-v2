import { apiService } from './api';
import { API_ENDPOINTS } from '../config/api';

/**
 * Push Notification Service
 * Handles Web Push Notifications for PWA
 */

// VAPID public key - This should be generated and stored securely
// For now, we'll get it from the backend
let vapidPublicKey = null;

/**
 * Get VAPID public key from backend
 */
export const getVapidPublicKey = async () => {
  if (vapidPublicKey) {
    return vapidPublicKey;
  }

  try {
    const response = await apiService.get('/push-notifications/vapid-public-key');
    vapidPublicKey = response.data.data?.public_key || response.data.public_key;
    return vapidPublicKey;
  } catch (error) {
    console.error('Failed to get VAPID public key:', error);
    return null;
  }
};

/**
 * Convert VAPID key from base64 to Uint8Array
 */
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Check if push notifications are supported
 */
export const isPushNotificationSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

/**
 * Check if user has granted notification permission
 */
export const getNotificationPermission = async () => {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
};

/**
 * Request notification permission
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    throw new Error('This browser does not support notifications');
  }

  const permission = await Notification.requestPermission();
  return permission;
};

/**
 * Subscribe to push notifications
 */
export const subscribeToPushNotifications = async () => {
  try {
    // Check if service worker is registered
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Get VAPID public key
    const publicKey = await getVapidPublicKey();
    if (!publicKey) {
      throw new Error('Failed to get VAPID public key');
    }

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    // Send subscription to backend
    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: btoa(
          String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))
        ),
        auth: btoa(
          String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))
        ),
      },
    };

    await apiService.post(API_ENDPOINTS.pushNotifications.subscribe, subscriptionData);

    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPushNotifications = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Unsubscribe from push service
      await subscription.unsubscribe();

      // Remove subscription from backend
      await apiService.post(API_ENDPOINTS.pushNotifications.unsubscribe, {
        endpoint: subscription.endpoint,
      });
    }
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    throw error;
  }
};

/**
 * Get current push subscription
 */
export const getPushSubscription = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Error getting push subscription:', error);
    return null;
  }
};

/**
 * Check if user is subscribed to push notifications
 */
export const isSubscribedToPushNotifications = async () => {
  const subscription = await getPushSubscription();
  return subscription !== null;
};

