/**
 * Local Storage Utilities
 * 
 * Helper functions for managing localStorage with error handling
 */

const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'user_data',
  THEME: 'theme_preference',
};

/**
 * Get item from localStorage
 * @param {string} key - Storage key
 * @returns {any|null} Stored value or null
 */
export const getStorageItem = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error reading from localStorage for key "${key}":`, error);
    return null;
  }
};

/**
 * Set item in localStorage
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 */
export const setStorageItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to localStorage for key "${key}":`, error);
  }
};

/**
 * Remove item from localStorage
 * @param {string} key - Storage key
 */
export const removeStorageItem = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing from localStorage for key "${key}":`, error);
  }
};

/**
 * Clear all localStorage
 */
export const clearStorage = () => {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
};

// Specific helpers for common storage operations
export const storage = {
  // Token management
  getToken: () => getStorageItem(STORAGE_KEYS.TOKEN),
  setToken: (token) => setStorageItem(STORAGE_KEYS.TOKEN, token),
  removeToken: () => removeStorageItem(STORAGE_KEYS.TOKEN),

  // User data management
  getUser: () => getStorageItem(STORAGE_KEYS.USER),
  setUser: (user) => setStorageItem(STORAGE_KEYS.USER, user),
  removeUser: () => removeStorageItem(STORAGE_KEYS.USER),

  // Theme management
  getTheme: () => getStorageItem(STORAGE_KEYS.THEME) || 'light',
  setTheme: (theme) => setStorageItem(STORAGE_KEYS.THEME, theme),
  removeTheme: () => removeStorageItem(STORAGE_KEYS.THEME),

  // Clear all auth data
  clearAuth: () => {
    removeStorageItem(STORAGE_KEYS.TOKEN);
    removeStorageItem(STORAGE_KEYS.USER);
  },
};

