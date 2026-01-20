import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { getMe } from '../store/slices/authSlice';

/**
 * Custom hook to poll /me API at regular intervals to check user block status
 * This ensures that if a user is blocked while logged in, their status is updated
 * and they will see the blocked screen (BlockedMessage component) instead of
 * being able to access restricted resources. Account book page remains accessible.
 * 
 * @param {number} intervalMs - Polling interval in milliseconds (default: 30000 = 30 seconds)
 */
export const useUserStatusPolling = (intervalMs = 30000) => {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const intervalRef = useRef(null);
  const isPollingRef = useRef(false);

  useEffect(() => {
    // Only start polling if user is authenticated
    if (!isAuthenticated) {
      // Clear any existing interval if user logs out
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        isPollingRef.current = false;
      }
      return;
    }

    // Prevent multiple intervals from being set
    if (isPollingRef.current) {
      return;
    }

    isPollingRef.current = true;

    // Function to check user status
    const checkUserStatus = async () => {
      try {
        // Call /me API to get current user status
        // This will update the user state in Redux, which will trigger
        // BlockedRoute to show BlockedMessage if user is blocked
        await dispatch(getMe()).unwrap();
      } catch (error) {
        // If the API call fails (e.g., 401 unauthorized, network error), 
        // the error will be handled by the auth slice and API interceptor
        // We don't need to do anything special here as the interceptor will handle 401s
        console.error('Error checking user status:', error);
      }
    };

    // Call immediately on mount (if authenticated)
    checkUserStatus();

    // Set up interval to poll at regular intervals
    intervalRef.current = setInterval(() => {
      checkUserStatus();
    }, intervalMs);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        isPollingRef.current = false;
      }
    };
  }, [isAuthenticated, dispatch, intervalMs]);
};

