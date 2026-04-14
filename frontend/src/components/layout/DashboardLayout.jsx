import { useState, useCallback, useMemo, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import { cn } from '../../utils/cn';
import Sidebar from './Sidebar';
import Header from './Header';
import { SidebarLayoutContext } from './sidebarLayoutContext';
import { getRequiredPermissionRule, userHasNavPermission } from '../../config/routePermissionMap';

/** Avoid remounting the whole dashboard page when only the inbox conversation id changes. */
function outletTransitionKey(pathname) {
  if (/^\/dashboard\/inbox(?:\/[^/]+)?$/.test(pathname)) {
    return '/dashboard/inbox';
  }
  return pathname;
}

const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const outletKey = useMemo(
    () => outletTransitionKey(location.pathname),
    [location.pathname]
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  /** Always start expanded on load/refresh; compact mode is session-only. */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!user) return;
    const rule = getRequiredPermissionRule(location.pathname);
    if (!userHasNavPermission(user, rule)) {
      navigate('/dashboard', { replace: true });
    }
  }, [location.pathname, user, navigate]);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((c) => !c);
  }, []);

  const layoutValue = useMemo(
    () => ({
      sidebarCollapsed,
      toggleSidebarCollapsed,
    }),
    [sidebarCollapsed, toggleSidebarCollapsed]
  );

  return (
    <SidebarLayoutContext.Provider value={layoutValue}>
      <div className="min-h-screen bg-background">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleSidebarCollapsed}
        />
        <div
          className={cn(
            'transition-[padding] duration-300 ease-out',
            sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-72'
          )}
        >
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <main className="relative z-0 p-4 lg:p-6">
            <div key={outletKey} className="animate-page-enter">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarLayoutContext.Provider>
  );
};

export default DashboardLayout;
