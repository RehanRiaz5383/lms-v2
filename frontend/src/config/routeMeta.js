import { matchPath } from 'react-router-dom';

/**
 * Ordered most-specific first. Matched against `location.pathname` (full path).
 */
const ROUTES = [
  {
    pattern: '/dashboard/batches/:id/explore',
    title: 'Batch workspace',
    description: 'Students, subjects, videos, and class tools for this batch.',
  },
  {
    pattern: '/dashboard/inbox/:conversationId?',
    title: 'Inbox',
    description: 'Messages with students and staff.',
  },
  {
    pattern: '/dashboard/settings/roles',
    title: 'Roles & permissions',
    description: 'Define custom roles and sidebar access for staff.',
  },
  {
    pattern: '/dashboard/notifications/:id',
    title: 'Notification',
    description: 'Full details for this notification.',
  },
  {
    pattern: '/dashboard/settings/google-drive-folders',
    title: 'Google Drive folders',
    description: 'Map folders for uploads and resources.',
  },
  {
    pattern: '/dashboard/settings/notifications',
    title: 'Notification settings',
    description: 'Email and in-app notification preferences.',
  },
  {
    pattern: '/dashboard/settings/smtp',
    title: 'SMTP settings',
    description: 'Outbound email configuration for the system.',
  },
  {
    pattern: '/dashboard/reports/income',
    title: 'Income report',
    description: 'Financial income summaries and exports.',
  },
  {
    pattern: '/dashboard/integrations/internal',
    title: 'Internal integrations',
    description: 'Connect internal tools and services.',
  },
  {
    pattern: '/dashboard/income-expense-report',
    title: 'Income & expense report',
    description: 'Combined view of money in and out.',
  },
  {
    pattern: '/dashboard/pending-task-submissions',
    title: 'Overdue task submissions',
    description: 'Students with tasks past due—review and nudge.',
  },
  {
    pattern: '/dashboard/admin-tasks',
    title: 'Tasks',
    description: 'Review submissions, grade work, and manage assignments.',
  },
  {
    pattern: '/dashboard/performance-report',
    title: 'My performance report',
    description: 'Academic progress and graded work.',
  },
  {
    pattern: '/dashboard/class-participations',
    title: 'Class participations',
    description: 'Your participation activities and marks.',
  },
  {
    pattern: '/dashboard/academic-calendar',
    title: 'Academic calendar',
    description: 'Deadlines and events across your learning.',
  },
  {
    pattern: '/dashboard/lecture-videos',
    title: 'Lecture videos',
    description: 'Course videos assigned to your batches.',
  },
  {
    pattern: '/dashboard/account-book',
    title: 'Account book',
    description: 'Fees, vouchers, and payment status.',
  },
  {
    pattern: '/dashboard/scheduled-jobs',
    title: 'Scheduled jobs',
    description: 'Background tasks and automation status.',
  },
  { pattern: '/dashboard/users', title: 'User management', description: 'Manage users, block or unblock, and control access.' },
  { pattern: '/dashboard/batches', title: 'Batch management', description: 'Create batches, assign subjects, and manage enrollments.' },
  { pattern: '/dashboard/subjects', title: 'Subjects', description: 'Courses and subjects available in the system.' },
  { pattern: '/dashboard/videos', title: 'Videos', description: 'Upload, link, and organize learning videos.' },
  { pattern: '/dashboard/expenses', title: 'Expense management', description: 'Record and track organizational expenses.' },
  { pattern: '/dashboard/fee-vouchers', title: 'Fee vouchers', description: 'Issue and track payment vouchers.' },
  { pattern: '/dashboard/profile', title: 'Profile settings', description: 'Your account information and preferences.' },
  { pattern: '/dashboard/tasks', title: 'Task assigned', description: 'Your assignments and submission status.' },
  { pattern: '/dashboard/quizzes', title: 'My quizzes', description: 'Take and review quiz attempts.' },
  {
    pattern: '/dashboard',
    title: 'Dashboard',
    description: 'Overview, insights, and shortcuts for your role.',
    end: true,
  },
];

export function getPageMeta(pathname) {
  for (const r of ROUTES) {
    const m = matchPath({ path: r.pattern, end: r.end !== false }, pathname);
    if (m) {
      return { title: r.title, description: r.description };
    }
  }
  return { title: 'Dashboard', description: 'Navigate your workspace.' };
}
