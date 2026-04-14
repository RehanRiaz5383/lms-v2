import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { cn } from '../../utils/cn';
import { apiService } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { chatService } from '../../services/chatService';
import { Tooltip } from '../ui/tooltip';
import logo from '../../assets/icons/logo.png';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Settings,
  FileText,
  BarChart3,
  UserCog,
  ChevronDown,
  FolderOpen,
  GraduationCap,
  Layers,
  Mail,
  Bell,
  Video,
  ClipboardList,
  HelpCircle,
  Wallet,
  Clock,
  DollarSign,
  Plug,
  Inbox,
  Menu,
  Shield,
  ListChecks,
} from 'lucide-react';
import { userHasNavPermission } from '../../config/routePermissionMap';

/** Compact rail: icon-only row + flyout panel attached to `left-16`. */
const CollapsedSubmenuFlyout = ({
  item,
  Icon,
  isExpanded,
  hasActiveChild,
  toggleMenu,
  afterNav,
  location,
}) => {
  const buttonRef = useRef(null);
  const submenuRef = useRef(null);
  const [submenuTop, setSubmenuTop] = useState(0);

  useEffect(() => {
    if (isExpanded && buttonRef.current) {
      setSubmenuTop(buttonRef.current.getBoundingClientRect().top);
    }
  }, [isExpanded]);

  useEffect(() => {
    const handler = (e) => {
      if (!isExpanded || !submenuRef.current || !buttonRef.current) return;
      if (!submenuRef.current.contains(e.target) && !buttonRef.current.contains(e.target)) {
        toggleMenu(item.key);
      }
    };
    if (isExpanded) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isExpanded, item.key, toggleMenu]);

  return (
    <div className="relative flex w-full justify-center overflow-visible">
      <Tooltip content={item.title} side="right">
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={isExpanded}
          onClick={() => toggleMenu(item.key)}
          className={cn(
            'relative flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-medium transition-all duration-150',
            hasActiveChild
              ? 'bg-primary/12 font-semibold text-primary shadow-[inset_3px_0_0_0_hsl(var(--primary))] ring-1 ring-primary/10 dark:bg-primary/[0.18]'
              : 'text-muted-foreground hover:bg-accent/90 hover:text-accent-foreground'
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </button>
      </Tooltip>
      {isExpanded && (
        <div
          ref={submenuRef}
          data-submenu={item.key}
          className="fixed left-16 z-[10000] w-52 rounded-xl border border-border/50 bg-background/90 py-1 shadow-xl backdrop-blur-2xl dark:bg-background/80"
          style={{ top: `${submenuTop}px` }}
        >
          {item.submenu.map((subItem) => {
            const SubIcon = subItem.icon;
            const isSubActive = location.pathname === subItem.path;
            return (
              <Link
                key={subItem.path}
                to={subItem.path}
                onClick={afterNav}
                className={cn(
                  'mx-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isSubActive
                    ? 'bg-primary/12 font-semibold text-primary dark:bg-primary/[0.16]'
                    : 'text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground'
                )}
              >
                <SubIcon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{subItem.title}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

const navRow =
  'flex w-full min-h-[2.75rem] items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-[color,background-color,box-shadow] duration-150 ease-out';

const navIdle =
  'text-muted-foreground hover:bg-accent/90 hover:text-accent-foreground active:scale-[0.99]';

const navActive =
  'bg-primary/12 font-semibold text-primary shadow-[inset_3px_0_0_0_hsl(var(--primary))] dark:bg-primary/[0.18] dark:text-primary';

const navSubActive =
  'bg-primary/10 font-semibold text-primary ring-1 ring-primary/15 dark:bg-primary/[0.14] dark:text-primary';

const navSubRow =
  'flex min-h-10 items-center gap-2.5 rounded-lg py-2 pl-3 pr-2 text-[13px] font-medium transition-colors duration-150';

function filterNavItemsByPermission(items, user) {
  if (!items?.length) return [];
  return items
    .map((item) => {
      if (item.submenu?.length) {
        const sub = item.submenu.filter((s) => !s.permission || userHasNavPermission(user, s.permission));
        if (sub.length === 0) return null;
        if (item.permission && !userHasNavPermission(user, item.permission)) return null;
        return { ...item, submenu: sub };
      }
      if (item.permission && !userHasNavPermission(user, item.permission)) return null;
      return item;
    })
    .filter(Boolean);
}

const Sidebar = ({ isOpen, onClose, collapsed, onToggleCollapsed }) => {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  /** Compact icon rail only on large screens; mobile drawer always shows labels. */
  const [isLgUp, setIsLgUp] = useState(typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false);
  const [expandedMenus, setExpandedMenus] = useState([]);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [pendingVouchersCount, setPendingVouchersCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const closeAllMenus = useCallback(() => {
    setExpandedMenus([]);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsLgUp(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const compactRail = collapsed && isLgUp;

  const getUserRoles = () => {
    const roles = [];

    if (user?.roles && Array.isArray(user.roles)) {
      user.roles.forEach((role) => {
        const roleTitle = role.title?.toLowerCase();
        if (roleTitle === 'admin' && !roles.includes('admin')) {
          roles.push('admin');
        } else if (roleTitle === 'student' && !roles.includes('student')) {
          roles.push('student');
        } else if (roleTitle === 'teacher' && !roles.includes('teacher')) {
          roles.push('teacher');
        } else if (roleTitle === 'class representative (cr)' && !roles.includes('cr')) {
          roles.push('cr');
        }
      });
    }

    if (roles.length === 0 && user?.user_type) {
      if (user.user_type === 1 || user?.user_type_title?.toLowerCase() === 'admin') {
        roles.push('admin');
      }
      if (user.user_type === 2 || user?.user_type_title?.toLowerCase() === 'student') {
        roles.push('student');
      }
    }

    return roles;
  };

  const userRoles = getUserRoles();
  const hasAdminRole = userRoles.includes('admin');
  const hasStudentRole = userRoles.includes('student');
  const hasTeacherRole = userRoles.includes('teacher') || userRoles.includes('cr');
  const hasAdminPanelAccess =
    user?.can_access_admin_panel === true ||
    (user?.can_access_admin_panel !== false && hasAdminRole);

  const toggleMenu = (menuKey) => {
    setExpandedMenus((prev) => {
      if (prev.includes(menuKey)) {
        return prev.filter((key) => key !== menuKey);
      }
      return [menuKey];
    });
  };

  const studentMenuItems = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', permission: 'student.dashboard' },
    { title: 'Inbox', icon: Inbox, path: '/dashboard/inbox', permission: 'student.inbox' },
    { title: 'Lecture Videos', icon: Video, path: '/dashboard/lecture-videos', permission: 'student.lecture_videos' },
    { title: 'Task Assigned', icon: ClipboardList, path: '/dashboard/tasks', permission: 'student.tasks' },
    { title: 'My Quizes', icon: HelpCircle, path: '/dashboard/quizzes', permission: 'student.quizzes' },
    { title: 'Class Participations', icon: Users, path: '/dashboard/class-participations', permission: 'student.class_participations' },
    { title: 'Account Book', icon: Wallet, path: '/dashboard/account-book', permission: 'student.account_book' },
    {
      title: 'Settings',
      icon: Settings,
      key: 'student-settings',
      submenu: [
        { title: 'Notifications', icon: Bell, path: '/dashboard/settings/notifications', permission: 'student.settings.notifications' },
      ],
    },
  ];

  const buildAdminMenuItems = () => {
    const settingsSubmenu = [
      { title: 'SMTP Settings', icon: Mail, path: '/dashboard/settings/smtp', permission: 'admin.settings.smtp' },
      { title: 'Notifications', icon: Bell, path: '/dashboard/settings/notifications', permission: 'admin.settings.notifications' },
      { title: 'Scheduled Jobs', icon: Clock, path: '/dashboard/scheduled-jobs', permission: 'admin.settings.scheduled_jobs' },
      { title: 'Google Drive Folders', icon: FolderOpen, path: '/dashboard/settings/google-drive-folders', permission: 'admin.settings.google_drive_folders' },
      { title: 'Internal Integrations', icon: Plug, path: '/dashboard/integrations/internal', permission: 'admin.integrations.internal' },
    ];
    if (userHasNavPermission(user, 'admin.settings.roles')) {
      settingsSubmenu.push({
        title: 'Roles & Permissions',
        icon: Shield,
        path: '/dashboard/settings/roles',
        permission: 'admin.settings.roles',
      });
    }
    const items = [
      { title: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', permission: 'admin.dashboard' },
      { title: 'Inbox', icon: Inbox, path: '/dashboard/inbox', permission: 'admin.inbox' },
      {
        title: 'Management',
        icon: FolderOpen,
        key: 'management',
        submenu: [
          { title: 'User Management', icon: UserCog, path: '/dashboard/users', permission: 'admin.management.users' },
        ],
      },
      {
        title: 'Academics',
        icon: GraduationCap,
        key: 'academics',
        submenu: [
          { title: 'Batch Management', icon: Layers, path: '/dashboard/batches', permission: 'admin.academics.batches' },
          { title: 'Subjects', icon: BookOpen, path: '/dashboard/subjects', permission: 'admin.academics.subjects' },
          { title: 'Videos', icon: Video, path: '/dashboard/videos', permission: 'admin.academics.videos' },
          { title: 'Tasks', icon: ClipboardList, path: '/dashboard/admin-tasks', permission: 'admin.academics.tasks' },
          {
            title: 'Pending submissions',
            icon: ListChecks,
            path: '/dashboard/pending-task-submissions',
            permission: 'admin.tools.pending_task_submissions',
          },
        ],
      },
      {
        title: 'Accounts',
        icon: DollarSign,
        key: 'accounts',
        submenu: [
          { title: 'Fee Vouchers', icon: Wallet, path: '/dashboard/fee-vouchers', permission: 'admin.accounts.fee_vouchers' },
          { title: 'Expense Management', icon: FileText, path: '/dashboard/expenses', permission: 'admin.accounts.expenses' },
          { title: 'Income & Expense Report', icon: BarChart3, path: '/dashboard/income-expense-report', permission: 'admin.accounts.income_expense_report' },
        ],
      },
      {
        title: 'Reports',
        icon: BarChart3,
        key: 'reports',
        submenu: [{ title: 'Income Report', icon: DollarSign, path: '/dashboard/reports/income', permission: 'admin.reports.income' }],
      },
      { title: 'Documents', icon: FileText, path: '/dashboard/documents', permission: 'admin.documents' },
      {
        title: 'Settings',
        icon: Settings,
        key: 'settings',
        submenu: settingsSubmenu,
      },
    ];
    return items;
  };

  const teacherMenuItems = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', permission: 'teacher.dashboard' },
    { title: 'Inbox', icon: Inbox, path: '/dashboard/inbox', permission: 'teacher.inbox' },
    {
      title: 'Academics',
      icon: GraduationCap,
      key: 'academics',
      submenu: [{ title: 'Batch Management', icon: Layers, path: '/dashboard/batches', permission: 'teacher.academics.batches' }],
    },
  ];

  const buildMenuItems = () => {
    const menuGroups = [];

    if (hasAdminPanelAccess) {
      menuGroups.push({
        role: 'Staff',
        items: filterNavItemsByPermission(buildAdminMenuItems(), user),
      });
    }

    if (hasTeacherRole && !hasAdminPanelAccess) {
      const roleLabel =
        userRoles.includes('cr') && !userRoles.includes('teacher') ? 'Class Representative' : 'Teacher';
      menuGroups.push({
        role: roleLabel,
        items: filterNavItemsByPermission(teacherMenuItems, user),
      });
    }

    if (hasStudentRole) {
      menuGroups.push({
        role: 'Student',
        items: filterNavItemsByPermission(studentMenuItems, user),
      });
    }

    if (menuGroups.length === 0) {
      menuGroups.push({
        role: 'Menu',
        items: [{ title: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', permission: null }],
      });
    }

    return menuGroups;
  };

  useEffect(() => {
    const menuGroups = buildMenuItems();
    const activeMenuKeys = [];

    menuGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.submenu && item.key) {
          const hasActiveChild = item.submenu.some((subItem) => location.pathname === subItem.path);
          if (hasActiveChild) {
            activeMenuKeys.push(item.key);
          }
        }
      });
    });

    setExpandedMenus(activeMenuKeys);
  }, [location.pathname, hasAdminPanelAccess, hasStudentRole, hasTeacherRole, user]);

  useEffect(() => {
    if (!compactRail) return;
    const handleClickOutside = (event) => {
      const sidebar = document.getElementById('app-sidebar');
      const submenus = document.querySelectorAll('[data-submenu]');
      let inside = sidebar?.contains(event.target);
      submenus.forEach((node) => {
        if (node.contains(event.target)) inside = true;
      });
      if (!inside) closeAllMenus();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [compactRail, closeAllMenus]);

  useEffect(() => {
    if (hasStudentRole) {
      const fetchPendingCount = async () => {
        try {
          const response = await apiService.get(API_ENDPOINTS.student.tasks.pendingCount);
          setPendingTasksCount(response.data.data?.count || 0);
        } catch {
          setPendingTasksCount(0);
        }
      };
      fetchPendingCount();
      const interval = setInterval(fetchPendingCount, 30000);
      return () => clearInterval(interval);
    }
  }, [hasStudentRole]);

  useEffect(() => {
    if (hasStudentRole) {
      const fetchPendingVouchersCount = async () => {
        try {
          const response = await apiService.get(API_ENDPOINTS.student.vouchers.list);
          const vouchers = response.data.data || [];
          const pendingCount = vouchers.filter((v) => v.status === 'pending').length;
          setPendingVouchersCount(pendingCount);
        } catch {
          setPendingVouchersCount(0);
        }
      };
      fetchPendingVouchersCount();
      const interval = setInterval(fetchPendingVouchersCount, 30000);
      return () => clearInterval(interval);
    }
  }, [hasStudentRole]);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await chatService.getUnreadCount();
        setUnreadMessagesCount(response.data?.unread_count || 0);
      } catch {
        setUnreadMessagesCount(0);
      }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const menuGroups = buildMenuItems();

  const afterNav = () => {
    onClose();
    closeAllMenus();
  };

  const badgeForPath = (path) => {
    if (path === '/dashboard/tasks' && hasStudentRole && pendingTasksCount > 0) {
      return pendingTasksCount;
    }
    if (path === '/dashboard/account-book' && hasStudentRole && pendingVouchersCount > 0) {
      return pendingVouchersCount;
    }
    if (path === '/dashboard/inbox' && unreadMessagesCount > 0) {
      return unreadMessagesCount;
    }
    return null;
  };

  const handleToggleCompact = () => {
    closeAllMenus();
    onToggleCollapsed?.();
  };

  const renderExpandedItems = (items, seenPaths = new Set()) =>
    items
      .map((item) => {
        if (item.path === '/dashboard' && seenPaths.has('/dashboard')) return null;
        if (item.path) seenPaths.add(item.path);

        const Icon = item.icon;

        if (item.submenu) {
          const isExpanded = expandedMenus.includes(item.key);
          const hasActiveChild = item.submenu.some((subItem) => location.pathname === subItem.path);

          return (
            <div key={item.key} className="space-y-0.5">
              <button
                type="button"
                onClick={() => toggleMenu(item.key)}
                aria-expanded={isExpanded}
                className={cn(
                  navRow,
                  hasActiveChild ? cn(navActive, 'ring-1 ring-primary/10') : navIdle
                )}
              >
                <Icon className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-left">{item.title}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 opacity-50 transition-transform duration-200',
                    isExpanded && 'rotate-180'
                  )}
                  aria-hidden
                />
              </button>
              {isExpanded && (
                <div
                  className="relative ml-3 mt-0.5 space-y-0.5 border-l border-border/60 pl-2.5"
                  role="region"
                  aria-label={`${item.title} links`}
                >
                  {item.submenu.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const isSubActive = location.pathname === subItem.path;
                    return (
                      <Link
                        key={subItem.path}
                        to={subItem.path}
                        onClick={afterNav}
                        className={cn(navSubRow, isSubActive ? navSubActive : navIdle)}
                      >
                        <SubIcon className="h-4 w-4 shrink-0 opacity-85" aria-hidden />
                        <span className="min-w-0 truncate">{subItem.title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        const isActive = location.pathname === item.path;
        const bc = badgeForPath(item.path);
        const showBadge = bc != null && bc > 0;

        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={afterNav}
            className={cn(navRow, isActive ? cn(navActive, 'ring-1 ring-primary/10') : navIdle)}
          >
            <Icon className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-left">{item.title}</span>
            {showBadge && (
              <span className="inline-flex min-h-[1.25rem] min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-destructive-foreground tabular-nums shadow-sm">
                {bc > 99 ? '99+' : bc}
              </span>
            )}
          </Link>
        );
      })
      .filter(Boolean);

  const renderCollapsedItems = (items, seenPaths = new Set()) =>
    items
      .map((item) => {
        if (item.path === '/dashboard' && seenPaths.has('/dashboard')) return null;
        if (item.path) seenPaths.add(item.path);

        const Icon = item.icon;

        if (item.submenu) {
          const isExpanded = expandedMenus.includes(item.key);
          const hasActiveChild = item.submenu.some((subItem) => location.pathname === subItem.path);
          return (
            <CollapsedSubmenuFlyout
              key={item.key}
              item={item}
              Icon={Icon}
              isExpanded={isExpanded}
              hasActiveChild={hasActiveChild}
              toggleMenu={toggleMenu}
              afterNav={afterNav}
              location={location}
            />
          );
        }

        const isActive = location.pathname === item.path;
        const bc = badgeForPath(item.path);
        const showBadge = bc != null && bc > 0;

        return (
          <div key={item.path} className="relative flex w-full justify-center">
            <Tooltip content={item.title} side="right">
              <Link
                to={item.path}
                onClick={afterNav}
                className={cn(
                  'relative flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary/12 font-semibold text-primary shadow-[inset_3px_0_0_0_hsl(var(--primary))] ring-1 ring-primary/10 dark:bg-primary/[0.18]'
                    : 'text-muted-foreground hover:bg-accent/90 hover:text-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {showBadge && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                    {bc > 99 ? '99+' : bc}
                  </span>
                )}
              </Link>
            </Tooltip>
          </div>
        );
      })
      .filter(Boolean);

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-background/40 backdrop-blur-[2px] transition-opacity lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        id="app-sidebar"
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full flex-col overflow-visible',
          'w-72 max-w-[85vw] border-r border-border/50 bg-card/85 shadow-[4px_0_40px_-12px_rgba(0,0,0,0.12)] backdrop-blur-xl backdrop-saturate-150 transition-[width,transform] duration-300 ease-out',
          'dark:bg-card/55 dark:shadow-[4px_0_48px_-16px_rgba(0,0,0,0.5)]',
          'lg:max-w-none',
          compactRail ? 'lg:w-16' : 'lg:w-72',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div
          className={cn(
            'flex h-[4.25rem] shrink-0 items-center gap-2 border-b border-border/50 px-3',
            compactRail && 'lg:h-auto lg:flex-col lg:items-center lg:gap-2 lg:px-1 lg:py-3'
          )}
        >
          <button
            type="button"
            onClick={handleToggleCompact}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={collapsed ? 'Expand sidebar with labels' : 'Use compact icon sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Compact sidebar'}
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>

          <div
            className={cn(
              'flex min-w-0 flex-1 items-center gap-2',
              compactRail && 'lg:hidden'
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/10">
              <img src={logo} alt="" className="h-7 w-auto object-contain" aria-hidden />
            </div>
            <p className="min-w-0 truncate text-sm font-bold tracking-tight text-foreground">Learning Hub</p>
          </div>

          {compactRail && (
            <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/10 lg:flex">
              <img src={logo} className="h-6 w-auto object-contain" alt="" aria-hidden />
            </div>
          )}
        </div>

        <nav
          className={cn(
            'flex-1 overflow-y-auto py-3',
            compactRail ? 'overflow-x-visible px-1.5 lg:px-1.5' : 'overflow-x-hidden px-2'
          )}
          aria-label="Main navigation"
        >
          {(() => {
            const seenPaths = new Set();
            return menuGroups.map((group, idx) => (
              <div
                key={group.role}
                className={cn(
                  'space-y-1',
                  idx > 0 && (compactRail ? 'mt-2 border-t border-border/50 pt-2' : 'mt-4 border-t border-border/50 pt-4')
                )}
              >
                {!compactRail && menuGroups.length > 1 && (
                  <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">
                    {group.role}
                  </p>
                )}
                {(compactRail ? renderCollapsedItems : renderExpandedItems)(group.items, seenPaths)}
              </div>
            ));
          })()}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
