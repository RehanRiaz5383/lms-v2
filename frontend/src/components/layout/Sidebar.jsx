import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { cn } from '../../utils/cn';
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
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [expandedMenus, setExpandedMenus] = useState(['management', 'academics', 'settings']); // Default expanded

  // Check if user is admin (user_type = 1 or has admin role)
  const isAdmin = user?.user_type === 1 || 
                  user?.roles?.some(role => role.title?.toLowerCase() === 'admin') ||
                  user?.user_type_title?.toLowerCase() === 'admin';
  
  // Check if user is student
  const isStudent = user?.roles?.some(role => role.title?.toLowerCase() === 'student') || 
                   user?.user_type_title?.toLowerCase() === 'student';

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
      ],
    },
  ];

  const menuItems = isStudent ? studentMenuItems : adminMenuItems;

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
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {menuItems.map((item) => {
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
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

