import { useState, useCallback, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';
import Sidebar from './Sidebar';
import Header from './Header';
import { SidebarLayoutContext } from './sidebarLayoutContext';

const DashboardLayout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  /** Always start expanded on load/refresh; compact mode is session-only. */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
            <div key={location.pathname} className="animate-page-enter">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarLayoutContext.Provider>
  );
};

export default DashboardLayout;
