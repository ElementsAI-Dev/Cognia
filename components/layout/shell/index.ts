/**
 * Shell layout components - core app structure
 */

export { AppShell } from './app-shell';
export { TitleBar } from './title-bar';
export {
  registerTitleBarItem,
  unregisterTitleBarItem,
  useTitleBarRegistry,
  type TitleBarArea,
  type TitleBarItemContext,
  type TitleBarItemDefinition,
} from './title-bar-registry';
export { WindowInitializer } from './window-initializer';
export { BackgroundRenderer } from './background-renderer';
