import axios from 'axios';
import { API_CONFIG, getApiUrl } from '../config/api';
import { storage } from '../utils/storage';

// Create axios instance with default config
const api = axios.create(API_CONFIG);

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config) => {
    // Check sessionStorage first if in iframe (for impersonation), otherwise localStorage
    let token = null;
    if (window.self !== window.top) {
      // We're in an iframe - check sessionStorage first
      try {
        const sessionToken = sessionStorage.getItem('auth_token');
        if (sessionToken) {
          token = JSON.parse(sessionToken);
        }
      } catch (err) {
        console.error('Error reading token from sessionStorage:', err);
      }
    }
    // Fallback to localStorage if not in iframe or sessionStorage doesn't have token
    if (!token) {
      token = storage.getToken();
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // For FormData, don't set Content-Type - let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
      
      // Debug: Log FormData in interceptor
      console.log('Interceptor - FormData check:', {
        isFormData: config.data instanceof FormData,
        hasPicture: config.data.has('picture'),
        contentType: config.headers['Content-Type'],
      });
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.error('Request timeout:', {
        url: error.config?.url,
        timeout: error.config?.timeout,
        message: error.message
      });
      // You can add custom timeout handling here if needed
    }
    
    // Handle 401 Unauthorized - Clear auth and redirect to login
    if (error.response?.status === 401) {
      storage.clearAuth();
      // Only redirect if we're not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * API Service
 * Generic API service with common methods
 */
export const apiService = {
  /**
   * GET request
   * @param {string} endpoint - API endpoint
   * @param {object} config - Axios config
   * @returns {Promise} Axios promise
   */
  get: (endpoint, config = {}) => {
    return api.get(getApiUrl(endpoint), config);
  },

  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request data
   * @param {object} config - Axios config (supports onUploadProgress for file uploads)
   * @returns {Promise} Axios promise
   */
  post: (endpoint, data = {}, config = {}) => {
    return api.post(getApiUrl(endpoint), data, config);
  },

  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request data
   * @param {object} config - Axios config (supports onUploadProgress for file uploads)
   * @returns {Promise} Axios promise
   */
  put: (endpoint, data = {}, config = {}) => {
    // Handle upload progress for file uploads
    if (config.onUploadProgress && data instanceof FormData) {
      const progressCallback = config.onUploadProgress;
      config.onUploadProgress = (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          if (typeof progressCallback === 'function') {
            progressCallback(percentCompleted);
          }
        }
      };
    }
    
    // For FormData with file uploads, use POST with _method=PUT (Laravel method spoofing)
    // This is more reliable for file uploads
    if (data instanceof FormData) {
      // Remove Content-Type header if it exists to let browser set it
      if (config.headers) {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
      
      // Add _method=PUT for Laravel method spoofing
      if (!data.has('_method')) {
        data.append('_method', 'PUT');
      }
      
      // Use POST instead of PUT for file uploads
      return api.post(getApiUrl(endpoint), data, config);
    }
    
    return api.put(getApiUrl(endpoint), data, config);
  },

  /**
   * PATCH request
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request data
   * @param {object} config - Axios config
   * @returns {Promise} Axios promise
   */
  patch: (endpoint, data = {}, config = {}) => {
    return api.patch(getApiUrl(endpoint), data, config);
  },

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   * @param {object} config - Axios config
   * @returns {Promise} Axios promise
   */
  delete: (endpoint, config = {}) => {
    return api.delete(getApiUrl(endpoint), config);
  },
};

export default api;

