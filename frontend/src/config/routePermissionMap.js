/**
 * Longest-prefix first. Each rule is either a single permission slug or { anyOf: [...] }.
 */

const PREFIX_RULES = [
  { prefix: '/dashboard/settings/roles', permission: 'admin.settings.roles' },
  { prefix: '/dashboard/settings/google-drive-folders', permission: 'admin.settings.google_drive_folders' },
  { prefix: '/dashboard/settings/notifications', permission: { anyOf: ['admin.settings.notifications', 'student.settings.notifications'] } },
  { prefix: '/dashboard/settings/smtp', permission: 'admin.settings.smtp' },
  { prefix: '/dashboard/pending-task-submissions', permission: 'admin.tools.pending_task_submissions' },
  { prefix: '/dashboard/income-expense-report', permission: 'admin.accounts.income_expense_report' },
  { prefix: '/dashboard/deposit-account-information', permission: 'admin.accounts.deposit_account_information' },
  { prefix: '/dashboard/reports/income', permission: 'admin.reports.income' },
  { prefix: '/dashboard/integrations/internal', permission: 'admin.integrations.internal' },
  { prefix: '/dashboard/scheduled-jobs', permission: 'admin.settings.scheduled_jobs' },
  { prefix: '/dashboard/fee-vouchers', permission: 'admin.accounts.fee_vouchers' },
  { prefix: '/dashboard/expenses', permission: 'admin.accounts.expenses' },
  { prefix: '/dashboard/admin-tasks', permission: 'admin.academics.tasks' },
  { prefix: '/dashboard/lecture-videos', permission: 'student.lecture_videos' },
  { prefix: '/dashboard/class-participations', permission: 'student.class_participations' },
  { prefix: '/dashboard/performance-report', permission: 'student.performance_report' },
  { prefix: '/dashboard/academic-calendar', permission: 'student.academic_calendar' },
  { prefix: '/dashboard/account-book', permission: 'student.account_book' },
  { prefix: '/dashboard/notifications', permission: 'student.notifications' },
  { prefix: '/dashboard/users', permission: 'admin.management.users' },
  { prefix: '/dashboard/videos', permission: 'admin.academics.videos' },
  { prefix: '/dashboard/subjects', permission: 'admin.academics.subjects' },
  { prefix: '/dashboard/inbox', permission: { anyOf: ['admin.inbox', 'student.inbox', 'teacher.inbox'] } },
  { prefix: '/dashboard/batches', permission: { anyOf: ['admin.academics.batches', 'teacher.academics.batches'] } },
  { prefix: '/dashboard/quizzes', permission: 'student.quizzes' },
  { prefix: '/dashboard/tasks', permission: 'student.tasks' },
  { prefix: '/dashboard/documents', permission: 'admin.documents' },
  { prefix: '/dashboard/profile', permission: null },
  { prefix: '/dashboard', permission: null },
];

export function getRequiredPermissionRule(pathname) {
  const path = pathname.split('?')[0] || '';
  for (const { prefix, permission } of PREFIX_RULES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return permission;
    }
  }
  return null;
}

function isPrimaryAdmin(user) {
  if (!user) return false;
  if (user.is_primary_platform_admin) return true;
  if (Number(user.user_type) === 1) return true;
  if (Array.isArray(user.roles) && user.roles.some((r) => Number(r.id) === 1)) return true;
  return false;
}

export function userHasNavPermission(user, rule) {
  if (rule == null) return true;
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;

  const perms = user.nav_permissions;
  // Old cached sessions before /me returns: skip client guard (APIs still enforce access).
  if (!Array.isArray(perms)) {
    return true;
  }
  if (perms.length === 0) {
    return false;
  }

  if (typeof rule === 'string') {
    return perms.includes(rule);
  }
  if (rule.anyOf && Array.isArray(rule.anyOf)) {
    return rule.anyOf.some((s) => perms.includes(s));
  }
  return false;
}
