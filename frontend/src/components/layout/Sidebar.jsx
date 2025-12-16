import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { cn } from '../../utils/cn';
import { apiService } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
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
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [expandedMenus, setExpandedMenus] = useState([]); // Start with all collapsed
  const [pendingTasksCount, setPendingTasksCount] = useState(0);

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
    setExpandedMenus((prev) =>
      prev.includes(menuKey)
        ? prev.filter((key) => key !== menuKey)
        : [...prev, menuKey]
    );
  };

  // Student menu items
  const studentMenuItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
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
      title: 'Account Book',
      icon: Wallet,
      path: '/dashboard/account-book',
    },
  ];

  // Admin menu items
  const adminMenuItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
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
      ],
    },
    {
      title: 'Students',
      icon: Users,
      path: '/dashboard/students',
    },
    {
      title: 'Reports',
      icon: BarChart3,
      path: '/dashboard/reports',
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
      ],
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
          <div key={item.key}>
            <button
              onClick={() => toggleMenu(item.key)}
              className={cn(
                'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                hasActiveChild
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5" />
                <span>{item.title}</span>
              </div>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {isExpanded && (
              <div className="ml-4 mt-1 space-y-1">
                {item.submenu.map((subItem) => {
                  const SubIcon = subItem.icon;
                  const isActive = location.pathname === subItem.path;

                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      onClick={onClose}
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
      }

      // Handle regular menu items
      const isActive = location.pathname === item.path;
      const showBadge = item.path === '/dashboard/tasks' && hasStudentRole && pendingTasksCount > 0;

      return (
        <Link
          key={item.path}
          to={item.path}
          onClick={onClose}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Icon className="h-5 w-5" />
          <span className="flex-1">{item.title}</span>
          {showBadge && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-red-500 rounded-full">
              {pendingTasksCount > 99 ? '99+' : pendingTasksCount}
            </span>
          )}
        </Link>
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
          'fixed left-0 top-0 z-50 h-full w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="h-16 flex items-center justify-center border-b border-border px-4">
            <h1 className="text-xl font-bold text-foreground">LMS</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-4">
            {(() => {
              const seenPaths = new Set();
              return menuGroups.map((group) => {
                return (
                  <div key={group.role} className="space-y-1">
                    {/* Role Header */}
                    {menuGroups.length > 1 && (
                      <div className="px-3 py-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {group.role}
                        </h3>
                      </div>
                    )}
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

