/**
 * Utility to play notification sound
 */
import notificationSound from '../assets/music/notification.wav';

let audioInstance = null;

export const playNotificationSound = () => {
  try {
    // Create new audio instance each time to allow multiple plays
    const audio = new Audio(notificationSound);
    audio.volume = 0.5; // Set volume to 50%
    audio.play().catch((error) => {
      // Handle autoplay restrictions
      console.warn('Could not play notification sound:', error);
    });
  } catch (error) {
    console.warn('Failed to play notification sound:', error);
  }
};

