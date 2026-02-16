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
const APP_MODE = 'development'; // Change to 'production' when deploying 
//final updated code

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

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  auth: {
    login: '/login',
    signup: '/signup',
    logout: '/logout',
    me: '/me',
    refresh: '/refresh', // If you implement token refresh
  },
  
  // Dashboard
  dashboard: {
    stats: '/dashboard/stats',
    trendingSignupReasons: '/dashboard/trending-signup-reasons',
    pendingTaskSubmissions: '/dashboard/pending-task-submissions',
    notifyStudentOverdue: '/dashboard/notify-student-overdue',
  },
  
  // Student
  student: {
    dashboardStats: '/student/dashboard/stats',
    videos: {
      list: '/student/videos',
      download: '/student/videos/:id/download',
    },
    tasks: {
      list: '/student/tasks',
      pendingCount: '/student/tasks/pending-count',
      show: '/student/tasks/:id',
      submit: '/student/tasks/:id/submit',
      submissions: '/student/tasks/submissions',
    },
    quizzes: '/student/quizzes',
    classParticipations: '/student/class-participations',
    vouchers: {
      list: '/student/vouchers',
      submitPayment: '/student/vouchers/:id/submit-payment',
    },
  },
  
  // Profile Management
  profile: {
    get: '/profile',
    update: '/profile',
    changePassword: '/profile/change-password',
  },

  // Notifications
  notifications: {
    list: '/notifications',
    show: '/notifications/:id',
    unreadCount: '/notifications/unread-count',
    markAsRead: '/notifications/:id/read',
    markAllAsRead: '/notifications/mark-all-read',
  },

  // Scheduled Jobs (Admin only)
  scheduledJobs: {
    list: '/scheduled-jobs',
    create: '/scheduled-jobs',
    update: '/scheduled-jobs/:id',
    delete: '/scheduled-jobs/:id',
    logs: '/scheduled-jobs/:id/logs',
    clearLogs: '/scheduled-jobs/:id/logs',
  },
  
  // User Management (Admin only)
  users: {
    list: '/users',
    performanceReport: '/users/:id/performance-report',
    show: '/users/:id',
    create: '/users',
    update: '/users/:id',
    updateStudent: '/users/:id/student',
    delete: '/users/:id',
    block: '/users/:id/block',
    unblock: '/users/:id/unblock',
    types: '/users/types',
    assignBatches: '/users/:id/assign-batches',
    availableBatches: '/users/:id/available-batches',
    assignRoles: '/users/:id/assign-roles',
    availableRoles: '/users/:id/available-roles',
    impersonate: '/users/:id/impersonate',
    updateFee: '/users/:id/fee',
    vouchers: '/users/:id/vouchers',
    createVoucher: '/users/:id/vouchers',
    sendNotification: '/users/:id/send-notification',
  },
  
  // Vouchers Management
  vouchers: {
    list: '/vouchers',
    generate: '/vouchers/generate',
    incomeReport: '/vouchers/income-report',
    update: '/vouchers/:id',
    approve: '/vouchers/:id/approve',
    reject: '/vouchers/:id/reject',
    notify: '/vouchers/:id/notify',
    delete: '/vouchers/:id',
  },
  
  // Expense Management
  expenses: {
    list: '/expenses',
    create: '/expenses',
    update: '/expenses/:id',
    delete: '/expenses/:id',
    incomeExpenseReport: '/expenses/income-expense-report',
    heads: {
      list: '/expenses/heads',
      create: '/expenses/heads',
      update: '/expenses/heads/:id',
      delete: '/expenses/heads/:id',
    },
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
    getStudents: '/batches/:id/students',
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
    backfillGoogleDriveIds: '/videos/backfill-google-drive-ids',
  },
  
  // Tasks Management (Admin, Teacher, CR)
  tasks: {
    list: '/tasks',
    show: '/tasks/:id',
    create: '/tasks',
    update: '/tasks/:id',
    delete: '/tasks/:id',
    getSubmissions: '/tasks/:id/submissions',
    gradeSubmission: '/tasks/:taskId/submissions/:submissionId/grade',
    uploadStudentSubmission: '/tasks/:taskId/upload-student-submission',
    getUncheckedSubmissions: '/tasks/unchecked-submissions',
    deleteSubmission: '/tasks/submissions/:submissionId',
    bulkDeleteSubmissions: '/tasks/submissions/bulk-delete',
  },

  // Quizzes Management
  quizzes: {
    list: '/quizzes',
    show: '/quizzes/:id',
    create: '/quizzes',
    update: '/quizzes/:id',
    delete: '/quizzes/:id',
    getStudents: '/quizzes/:id/students',
    assignMarks: '/quizzes/:id/assign-marks',
    getStudentMarks: '/quizzes/students/:studentId/marks',
  },

  // Class Participations Management
  classParticipations: {
    list: '/class-participations',
    show: '/class-participations/:id',
    create: '/class-participations',
    update: '/class-participations/:id',
    delete: '/class-participations/:id',
    getStudents: '/class-participations/:id/students',
    assignMarks: '/class-participations/:id/assign-marks',
    getStudentMarks: '/class-participations/students/:studentId/marks',
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
  
  // Push Notifications
  pushNotifications: {
    subscribe: '/push-notifications/subscribe',
    unsubscribe: '/push-notifications/unsubscribe',
    getVapidKey: '/push-notifications/vapid-public-key',
    test: '/push-notifications/test',
    getUserPreferences: '/push-notifications/preferences',
    updateUserPreferences: '/push-notifications/preferences',
  },
  
  // Cloudflare Turnstile
  turnstile: {
    getSettings: '/turnstile-settings',
    getAdminSettings: '/turnstile-settings/admin',
    updateSettings: '/turnstile-settings',
  },
  
  // Google Drive Folders (Admin only)
  googleDriveFolders: {
    list: '/google-drive-folders',
    show: '/google-drive-folders/:id',
    create: '/google-drive-folders',
    update: '/google-drive-folders/:id',
    delete: '/google-drive-folders/:id',
  },

  // Socket Configuration
  socket: {
    config: '/socket/config',
    verifyToken: '/socket/verify-token',
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

