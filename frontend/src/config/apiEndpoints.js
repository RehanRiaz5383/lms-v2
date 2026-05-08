/**
 * API path templates (relative to `/api` base URL).
 *
 * Keep this file in version control. Put environment-specific values
 * (base URL, APP_MODE, timeouts) in `api.js` instead.
 */

export const API_ENDPOINTS = {
  /** Public — SPA deploy / cache busting */
  appVersion: '/app-version',
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
    archive: '/vouchers/:id/archive',
    unarchive: '/vouchers/:id/unarchive',
    delete: '/vouchers/:id',
  },

  chat: {
    assignTaskFromMessage: '/chat/messages/:messageId/assign-task-submission',
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
    uploadResource: '/videos/:id/resource',
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
    pendingForStudent: '/tasks/pending-for-student/:studentId',
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

  depositAccountInformation: {
    get: '/deposit-account-information',
    update: '/deposit-account-information',
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

  /** Primary admin only — roles & sidebar permissions */
  roleManagement: {
    permissions: '/role-management/permissions',
    roles: '/role-management/roles',
    role: '/role-management/roles/:id',
    rolePermissions: '/role-management/roles/:id/permissions',
  },
};
