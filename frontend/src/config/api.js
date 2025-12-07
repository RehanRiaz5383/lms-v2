/**
 * API Configuration
 * 
 * This file contains all API-related configuration including base URLs,
 * endpoints, and API credentials. Update these values as needed.
 */

/**
 * Application Mode
 * Set to 'development' for local development or 'production' for live server
 * Options: 'development' | 'production'
 */
const APP_MODE = 'production'; // Change to 'production' when deploying

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

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  auth: {
    login: '/login',
    logout: '/logout',
    me: '/me',
    refresh: '/refresh', // If you implement token refresh
  },
  
  // Dashboard
  dashboard: {
    stats: '/dashboard/stats',
  },
  
  // Student
  student: {
    dashboardStats: '/student/dashboard/stats',
    videos: {
      list: '/student/videos',
      download: '/student/videos/:id/download',
    },
  },
  
  // Profile Management
  profile: {
    get: '/profile',
    update: '/profile',
    changePassword: '/profile/change-password',
  },
  
  // User Management (Admin only)
  users: {
    list: '/users',
    show: '/users/:id',
    create: '/users',
    update: '/users/:id',
    delete: '/users/:id',
    block: '/users/:id/block',
    unblock: '/users/:id/unblock',
    types: '/users/types',
    assignBatches: '/users/:id/assign-batches',
    availableBatches: '/users/:id/available-batches',
    assignRoles: '/users/:id/assign-roles',
    availableRoles: '/users/:id/available-roles',
  },
  
  // Batches Management
  batches: {
    list: '/batches',
    show: '/batches/:id',
    create: '/batches',
    update: '/batches/:id',
    delete: '/batches/:id',
    assignSubjects: '/batches/:id/assign-subjects',
    availableSubjects: '/batches/:id/available-subjects',
  },
  
  // Subjects Management
  subjects: {
    list: '/subjects',
    show: '/subjects/:id',
    create: '/subjects',
    update: '/subjects/:id',
    delete: '/subjects/:id',
  },
  
  // Videos Management
  videos: {
    list: '/videos',
    show: '/videos/:id',
    create: '/videos',
    update: '/videos/:id',
    delete: '/videos/:id',
    assignToBatchSubject: '/videos/:id/assign-batch-subject',
    getBatchSubjectVideos: '/videos/batch/:batchId/subject/:subjectId',
    reorderBatchSubjectVideos: '/videos/batch/:batchId/subject/:subjectId/reorder',
    removeFromBatchSubject: '/videos/:id/batch-subject',
  },
  
  // SMTP Settings (Admin only)
  smtpSettings: {
    get: '/smtp-settings',
    update: '/smtp-settings',
    test: '/smtp-settings/test',
  },
  
  // Notification Settings (Admin only)
  notificationSettings: {
    get: '/notification-settings',
    update: '/notification-settings',
  },
};

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
  let builtEndpoint = endpoint;
  Object.keys(params).forEach(key => {
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
  return `${APP_BASE_URL}/load-storage/${cleanPath}`;
};

/**
 * Normalize storage URL - converts old /storage/ URLs to /load-storage/
 * @param {string} url - Storage URL (may contain /storage/ or /load-storage/)
 * @returns {string} Normalized storage URL with /load-storage/
 */
export const normalizeStorageUrl = (url) => {
  if (!url) return null;
  // Replace /storage/ with /load-storage/ if present
  return url.replace(/\/storage\//g, '/load-storage/');
};

