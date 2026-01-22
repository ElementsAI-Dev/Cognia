/**
 * Layout components index
 */

export { AppShell } from './app-shell';
export { MobileNav } from './mobile-nav';
export { MobileBottomNav } from './mobile-bottom-nav';
export { TitleBar } from './title-bar';
export {
  registerTitleBarItem,
  unregisterTitleBarItem,
  useTitleBarRegistry,
  type TitleBarArea,
  type TitleBarItemContext,
  type TitleBarItemDefinition,
} from './title-bar-registry';
export { DebugButton } from './debug-button';
export { WindowInitializer } from './window-initializer';
export { ResizablePanel, type PanelPosition } from './resizable-panel';
export { SplitView, type SplitDirection, type SplitLayout } from './split-view';
export { FloatingPanel } from './floating-panel';
export { BackgroundRenderer } from './background-renderer';
