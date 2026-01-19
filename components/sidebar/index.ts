/**
 * Sidebar components index
 */

// Core sidebar components
export { AppSidebar } from './app-sidebar';
export { SidebarContainer } from './sidebar-container';

// Session components
export {
  SessionGroup,
  useSessionGroups,
  type GroupType,
  SessionItem,
  SessionList,
  SessionSearch,
  type SearchFilters,
} from './sessions';

// Widget components
export {
  SidebarUsageStats,
  SidebarBackgroundTasks,
  SidebarQuickActions,
  SidebarRecentFiles,
  SidebarWorkflows,
  SidebarProjectSelector,
} from './widgets';
