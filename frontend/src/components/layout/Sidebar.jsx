import { useState, useEffect, useRef } from 'react';
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
  ChevronRight,
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
  RefreshCw,
  Inbox,
} from 'lucide-react';

// Submenu Button Component
const SubmenuButton = ({ item, Icon, isExpanded, hasActiveChild, toggleMenu, onClose, location, closeAllMenus }) => {
  const buttonRef = useRef(null);
  const submenuRef = useRef(null);
  const [submenuTop, setSubmenuTop] = useState(0);

  useEffect(() => {
    if (isExpanded && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setSubmenuTop(rect.top);
    }
  }, [isExpanded]);

  // Close submenu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isExpanded && submenuRef.current && buttonRef.current) {
        if (
          !submenuRef.current.contains(event.target) &&
          !buttonRef.current.contains(event.target)
        ) {
          closeAllMenus();
        }
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded, closeAllMenus]);

  return (
    <div className="relative">
      <Tooltip content={item.title} side="right">
        <button
          ref={buttonRef}
          onClick={() => toggleMenu(item.key)}
          className={cn(
            'w-full flex items-center justify-center py-2 rounded-md text-sm font-medium transition-colors',
            hasActiveChild
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Icon className="h-5 w-5 mx-auto" />
        </button>
      </Tooltip>
      {isExpanded && (
        <div 
          ref={submenuRef}
          data-submenu={item.key}
          className="fixed left-16 w-48 bg-card border border-border rounded-md shadow-lg py-1 z-[10000]"
          style={{ 
            top: `${submenuTop}px`,
            zIndex: 10000,
          }}
        >
          {item.submenu.map((subItem) => {
            const SubIcon = subItem.icon;
            const isActive = location.pathname === subItem.path;

            return (
              <Link
                key={subItem.path}
                to={subItem.path}
                onClick={() => {
                  onClose();
                  closeAllMenus();
                }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <SubIcon className="h-4 w-4" />
                <span>{subItem.title}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [expandedMenus, setExpandedMenus] = useState([]); // Start with all collapsed
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [pendingVouchersCount, setPendingVouchersCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Get user roles - prioritize user_roles table, use user_type only for backward compatibility
  const getUserRoles = () => {
    const roles = [];
    
    // First, check roles array from user_roles table (primary method)
    if (user?.roles && Array.isArray(user.roles)) {
      user.roles.forEach(role => {
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
    
    // Fallback to user_type only if roles array is empty (backward compatibility)
    // Note: Do NOT use user_type for teacher/CR role - only use user_roles table
    if (roles.length === 0 && user?.user_type) {
      if (user.user_type === 1 || user?.user_type_title?.toLowerCase() === 'admin') {
        roles.push('admin');
      }
      if (user.user_type === 2 || user?.user_type_title?.toLowerCase() === 'student') {
        roles.push('student');
      }
      // Explicitly NOT checking user_type === 3 for teacher/CR - only use user_roles table
    }
    
    return roles;
  };

  const userRoles = getUserRoles();
  const hasAdminRole = userRoles.includes('admin');
  const hasStudentRole = userRoles.includes('student');
  const hasTeacherRole = userRoles.includes('teacher') || userRoles.includes('cr');
  
  // Check if user is blocked
  const isBlocked = Number(user?.block) === 1;

  const toggleMenu = (menuKey) => {
    setExpandedMenus((prev) => {
      // If clicking the same menu, toggle it
      if (prev.includes(menuKey)) {
        return prev.filter((key) => key !== menuKey);
      }
      // If clicking a different menu, close all others and open the new one
      return [menuKey];
    });
  };

  // Close all submenus
  const closeAllMenus = () => {
    setExpandedMenus([]);
  };

  // Student menu items
  const studentMenuItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
    },
    {
      title: 'Inbox',
      icon: Inbox,
      path: '/dashboard/inbox',
    },
    {
      title: 'Lecture Videos',
      icon: Video,
      path: '/dashboard/lecture-videos',
    },
    {
      title: 'Task Assigned',
      icon: ClipboardList,
      path: '/dashboard/tasks',
    },
    {
      title: 'My Quizes',
      icon: HelpCircle,
      path: '/dashboard/quizzes',
    },
    {
      title: 'Class Participations',
      icon: Users,
      path: '/dashboard/class-participations',
    },
    {
      title: 'Account Book',
      icon: Wallet,
      path: '/dashboard/account-book',
    },
    // Settings menu with submenu (Student)
    {
      title: 'Settings',
      icon: Settings,
      key: 'student-settings',
      submenu: [
        {
          title: 'Notifications',
          icon: Bell,
          path: '/dashboard/settings/notifications',
        },
      ],
    },
  ];

  // Admin menu items
  const adminMenuItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
    },
    {
      title: 'Inbox',
      icon: Inbox,
      path: '/dashboard/inbox',
    },
    // Management menu with submenu (Admin only)
    {
      title: 'Management',
      icon: FolderOpen,
      key: 'management',
      submenu: [
        {
          title: 'User Management',
          icon: UserCog,
          path: '/dashboard/users',
        },
      ],
    },
    {
      title: 'Academics',
      icon: GraduationCap,
      key: 'academics',
      submenu: [
        {
          title: 'Batch Management',
          icon: Layers,
          path: '/dashboard/batches',
        },
        {
          title: 'Subjects',
          icon: BookOpen,
          path: '/dashboard/subjects',
        },
        {
          title: 'Videos',
          icon: Video,
          path: '/dashboard/videos',
        },
        {
          title: 'Tasks',
          icon: ClipboardList,
          path: '/dashboard/admin-tasks',
        },
      ],
    },
    // Accounts menu with submenu (Admin only) - moved below Academics
    {
      title: 'Accounts',
      icon: DollarSign,
      key: 'accounts',
      submenu: [
        {
          title: 'Fee Vouchers',
          icon: Wallet,
          path: '/dashboard/fee-vouchers',
        },
        {
          title: 'Expense Management',
          icon: FileText,
          path: '/dashboard/expenses',
        },
        {
          title: 'Income & Expense Report',
          icon: BarChart3,
          path: '/dashboard/income-expense-report',
        },
      ],
    },
    {
      title: 'Reports',
      icon: BarChart3,
      key: 'reports',
      submenu: [
        {
          title: 'Income Report',
          icon: DollarSign,
          path: '/dashboard/reports/income',
        },
      ],
    },
    {
      title: 'Documents',
      icon: FileText,
      path: '/dashboard/documents',
    },
    // Settings menu with submenu (Admin only)
    {
      title: 'Settings',
      icon: Settings,
      key: 'settings',
      submenu: [
        {
          title: 'SMTP Settings',
          icon: Mail,
          path: '/dashboard/settings/smtp',
        },
        {
          title: 'Notifications',
          icon: Bell,
          path: '/dashboard/settings/notifications',
        },
        {
          title: 'Scheduled Jobs',
          icon: Clock,
          path: '/dashboard/scheduled-jobs',
        },
        {
          title: 'Google Drive Folders',
          icon: FolderOpen,
          path: '/dashboard/settings/google-drive-folders',
        },
      ],
    },
    // Internal Integrations (Admin only)
    {
      title: 'Internal Integrations',
      icon: Plug,
      path: '/dashboard/integrations/internal',
    },
  ];

  // Teacher menu items (no User Management, but has Batch Management)
  const teacherMenuItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
    },
    {
      title: 'Academics',
      icon: GraduationCap,
      key: 'academics',
      submenu: [
        {
          title: 'Batch Management',
          icon: Layers,
          path: '/dashboard/batches',
        },
      ],
    },
  ];

  // Build menu items grouped by role
  const buildMenuItems = () => {
    const menuGroups = [];
    
    // Add Admin menu items if user has admin role
    if (hasAdminRole) {
      menuGroups.push({
        role: 'Admin',
        items: adminMenuItems,
      });
    }
    
    // Add Teacher/CR menu items if user has teacher or CR role (but not admin)
    // Teachers/CRs can have multiple roles, so only show teacher menu if they're not admin
    if (hasTeacherRole && !hasAdminRole) {
      // Determine role label
      const roleLabel = userRoles.includes('cr') && !userRoles.includes('teacher') 
        ? 'Class Representative' 
        : 'Teacher';
      
      menuGroups.push({
        role: roleLabel,
        items: teacherMenuItems,
      });
    }
    
    // Add Student menu items if user has student role
    if (hasStudentRole) {
      menuGroups.push({
        role: 'Student',
        items: studentMenuItems,
      });
    }
    
    // If no roles found, default to admin (backward compatibility)
    if (menuGroups.length === 0) {
      menuGroups.push({
        role: 'Admin',
        items: adminMenuItems,
      });
    }
    
    return menuGroups;
  };

  // Auto-expand parent menu only if current path matches a child
  useEffect(() => {
    const menuGroups = buildMenuItems();
    const activeMenuKeys = [];

    menuGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.submenu && item.key) {
          const hasActiveChild = item.submenu.some(
            (subItem) => location.pathname === subItem.path
          );
          if (hasActiveChild) {
            activeMenuKeys.push(item.key);
          }
        }
      });
    });

    setExpandedMenus(activeMenuKeys);
  }, [location.pathname, hasAdminRole, hasStudentRole, hasTeacherRole]);

  // Close submenus when clicking outside sidebar or submenu
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside sidebar and all submenus
      const sidebar = document.querySelector('aside');
      const submenus = document.querySelectorAll('[data-submenu]');
      
      let isClickInsideSidebar = false;
      let isClickInsideSubmenu = false;

      if (sidebar && sidebar.contains(event.target)) {
        isClickInsideSidebar = true;
      }

      submenus.forEach((submenu) => {
        if (submenu.contains(event.target)) {
          isClickInsideSubmenu = true;
        }
      });

      // Close submenus if clicking outside both sidebar and submenus
      if (!isClickInsideSidebar && !isClickInsideSubmenu) {
        closeAllMenus();
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [closeAllMenus]);

  // Fetch pending tasks count for students
  useEffect(() => {
    if (hasStudentRole) {
      const fetchPendingCount = async () => {
        try {
          const response = await apiService.get(API_ENDPOINTS.student.tasks.pendingCount);
          setPendingTasksCount(response.data.data?.count || 0);
        } catch (err) {
          // Silently fail - don't show error for badge count
          setPendingTasksCount(0);
        }
      };
      fetchPendingCount();
      // Refresh count every 30 seconds
      const interval = setInterval(fetchPendingCount, 30000);
      return () => clearInterval(interval);
    }
  }, [hasStudentRole]);

  // Fetch pending vouchers count for students
  useEffect(() => {
    if (hasStudentRole) {
      const fetchPendingVouchersCount = async () => {
        try {
          const response = await apiService.get(API_ENDPOINTS.student.vouchers.list);
          const vouchers = response.data.data || [];
          const pendingCount = vouchers.filter(v => v.status === 'pending').length;
          setPendingVouchersCount(pendingCount);
        } catch (err) {
          // Silently fail - don't show error for badge count
          setPendingVouchersCount(0);
        }
      };
      fetchPendingVouchersCount();
      // Refresh count every 30 seconds
      const interval = setInterval(fetchPendingVouchersCount, 30000);
      return () => clearInterval(interval);
    }
  }, [hasStudentRole]);

  // Fetch unread messages count for all users
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await chatService.getUnreadCount();
        setUnreadMessagesCount(response.data?.unread_count || 0);
      } catch (err) {
        // Silently fail - don't show error for badge count
        setUnreadMessagesCount(0);
      }
    };
    fetchUnreadCount();
    // Refresh count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const menuGroups = buildMenuItems();
  
  // Helper to render menu items (avoid duplicates like Dashboard)
  const renderMenuItems = (items, seenPaths = new Set()) => {
    return items.map((item) => {
      // Skip Dashboard if already shown
      if (item.path === '/dashboard' && seenPaths.has('/dashboard')) {
        return null;
      }
      
      if (item.path) {
        seenPaths.add(item.path);
      }
      
      const Icon = item.icon;

      // Handle submenu items
      if (item.submenu) {
        const isExpanded = expandedMenus.includes(item.key);
        const hasActiveChild = item.submenu.some(
          (subItem) => location.pathname === subItem.path
        );

        return (
          <SubmenuButton
            key={item.key}
            item={item}
            Icon={Icon}
            isExpanded={isExpanded}
            hasActiveChild={hasActiveChild}
            toggleMenu={toggleMenu}
            onClose={onClose}
            location={location}
            closeAllMenus={closeAllMenus}
          />
        );
      }

      // Handle regular menu items
      const isActive = location.pathname === item.path;
      
      // Get badge count for specific items
      let badgeCount = null;
      if (item.path === '/dashboard/tasks' && hasStudentRole && pendingTasksCount > 0) {
        badgeCount = pendingTasksCount;
      } else if (item.path === '/dashboard/account-book' && hasStudentRole && pendingVouchersCount > 0) {
        badgeCount = pendingVouchersCount;
      } else if (item.path === '/dashboard/inbox' && unreadMessagesCount > 0) {
        badgeCount = unreadMessagesCount;
      }
      const showBadge = badgeCount !== null && badgeCount > 0;

      return (
        <div key={item.path} className="relative overflow-visible">
          <Tooltip content={item.title} side="right">
            <Link
              to={item.path}
              onClick={() => {
                onClose();
                closeAllMenus();
              }}
              className={cn(
                'relative flex items-center justify-center py-2 rounded-md text-sm font-medium transition-colors w-full',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5 mx-auto" />
              {showBadge && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-4.5 px-1 text-[10px] font-semibold text-white bg-red-500 rounded-full">
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </Link>
          </Tooltip>
        </div>
      );
    }).filter(Boolean);
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-16 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 overflow-visible',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full overflow-visible">
          {/* Logo/Brand */}
          <div className="h-16 flex items-center justify-center border-b border-border p-2">
            <img 
              src={logo} 
              alt="LMS Logo" 
              className="h-full w-auto object-contain max-h-12"
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto overflow-x-visible p-2 space-y-1">
            {(() => {
              const seenPaths = new Set();
              return menuGroups.map((group) => {
                return (
                  <div key={group.role} className="space-y-1">
                    {/* Menu Items for this role */}
                    {renderMenuItems(group.items, seenPaths)}
                  </div>
                );
              });
            })()}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

