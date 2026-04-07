import { createContext, useContext } from 'react';

export const SidebarLayoutContext = createContext({
  sidebarCollapsed: false,
  toggleSidebarCollapsed: () => {},
});

export function useSidebarLayout() {
  return useContext(SidebarLayoutContext);
}
