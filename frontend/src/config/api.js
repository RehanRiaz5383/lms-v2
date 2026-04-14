/**
 * Environment-specific API configuration (base URL, mode, timeouts).
 *
 * Path templates live in `./apiEndpoints.js` — commit that file; you can
 * gitignore this file per machine if needed and keep a local `api.js` only.
 */

/**
 * Application Mode
 * Set to 'development' for local development or 'production' for live server
 * Options: 'development' | 'production'
 */
const APP_MODE = 'production'; // Change to 'production' when deploying 
//code work completed

// Export APP_MODE for use in other modules
export { APP_MODE };
/**
 * Get the API base URL based on application mode
 */
const getApiBaseUrl = () => {
  if (APP_MODE === 'production') {
    return 'https://lms-v2.techinnsolutions.net/api';
  }
  
  // Default to development (localhost)
  return 'http://localhost:8000/api';
};

/**
 * Get the API timeout based on application mode
 * Production may need longer timeout due to network latency
 */
const getApiTimeout = () => {
  if (APP_MODE === 'production') {
    return 600000; // 60 seconds for production
  }
  
  // Default to 10 seconds for development
  return 10000;
};

// Base API URL - Determined by APP_MODE
export const API_BASE_URL = getApiBaseUrl();

// Base URL for the Laravel application (without /api)
export const APP_BASE_URL = API_BASE_URL.replace('/api', '');

// API Configuration
export const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: getApiTimeout(), // Dynamic timeout based on mode
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

/** Re-exported from `apiEndpoints.js` for backward compatibility. */
export { API_ENDPOINTS } from './apiEndpoints.js';

/**
 * Helper function to build full API URL
 * @param {string} endpoint - API endpoint
 * @returns {string} Full API URL
 */
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

/**
 * Helper function to replace URL parameters
 * @param {string} endpoint - Endpoint with parameters (e.g., '/users/:id')
 * @param {object} params - Parameters object (e.g., { id: 1 })
 * @returns {string} Endpoint with replaced parameters
 */
export const buildEndpoint = (endpoint, params = {}) => {
  if (typeof endpoint !== 'string' || !endpoint) {
    throw new Error('buildEndpoint: endpoint must be a non-empty string');
  }
  let builtEndpoint = endpoint;
  Object.keys(params).forEach((key) => {
    builtEndpoint = builtEndpoint.replace(`:${key}`, params[key]);
  });
  return builtEndpoint;
};

/**
 * Helper function to get storage URL for files
 * @param {string} path - Storage path (e.g., 'videos/video.mp4' or 'User_Profile/picture.jpg')
 * @returns {string} Full storage URL
 */
export const getStorageUrl = (path) => {
  if (!path) return null;
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Check if it's a Google Drive path (User_Profile, videos, etc.)
  if (cleanPath.startsWith('User_Profile/') || 
      cleanPath.startsWith('videos/') || 
      cleanPath.startsWith('Task_Files/') || 
      cleanPath.startsWith('tasks/') ||
      cleanPath.startsWith('submitted_tasks/') ||
      cleanPath.startsWith('voucher_submissions/') ||
      cleanPath.startsWith('feed/') ||
      cleanPath.startsWith('lms/User_Profile/') ||
      cleanPath.startsWith('lms/videos/') ||
      cleanPath.startsWith('lms/Task_Files/') ||
      cleanPath.startsWith('lms/tasks/') ||
      cleanPath.startsWith('lms/submitted_tasks/') ||
      cleanPath.startsWith('lms/voucher_submissions/') ||
      cleanPath.startsWith('lms/feed/')) {
    return `${APP_BASE_URL}/api/storage/google/${cleanPath}`;
  }
  
  // Legacy local storage paths
  return `${APP_BASE_URL}/load-storage/${cleanPath}`;
};

/**
 * Normalize storage URL - converts old /storage/ URLs to /load-storage/ or Google Drive URLs
 * @param {string} url - Storage URL (may contain /storage/, /load-storage/, or /api/storage/google/)
 * @returns {string} Normalized storage URL
 */
export const normalizeStorageUrl = (url) => {
  if (!url) return null;
  
  // If it already contains /api/storage/google/, return as is
  if (url.includes('/api/storage/google/')) {
    return url;
  }
  
  // If it's a /load-storage/ URL with User_Profile, videos, etc., route to Google Drive
  if (url.includes('/load-storage/')) {
    const path = url.split('/load-storage/')[1];
    if (path && (
      path.startsWith('lms/User_Profile/') ||
      path.startsWith('User_Profile/') || 
      path.startsWith('lms/videos/') ||
      path.startsWith('videos/') || 
      path.startsWith('lms/Task_Files/') ||
      path.startsWith('Task_Files/') || 
      path.startsWith('lms/tasks/') ||
      path.startsWith('tasks/') ||
      path.startsWith('lms/submitted_tasks/') ||
      path.startsWith('submitted_tasks/') ||
      path.startsWith('lms/voucher_submissions/') ||
      path.startsWith('voucher_submissions/') ||
      path.startsWith('lms/feed/') ||
      path.startsWith('feed/')
    )) {
      return `${APP_BASE_URL}/api/storage/google/${path}`;
    }
  }
  
  // Replace /storage/ with /load-storage/ if present (legacy support)
  return url.replace(/\/storage\//g, '/load-storage/');
};

/**
 * Normalize any URL that contains localhost:8000 to use the production base URL
 * This fixes issues where backend sends URLs with localhost even in production
 * @param {string} url - URL that may contain localhost:8000
 * @returns {string} Normalized URL with correct base URL
 */
export const normalizeUrl = (url) => {
  if (!url) return null;
  
  // If URL contains localhost:8000, replace it with the correct base URL
  if (url.includes('localhost:8000')) {
    return url.replace(/https?:\/\/localhost:8000/g, APP_BASE_URL);
  }
  
  // Also handle http://localhost:8000 without https
  if (url.includes('http://localhost:8000')) {
    return url.replace(/http:\/\/localhost:8000/g, APP_BASE_URL);
  }
  
  return url;
};

