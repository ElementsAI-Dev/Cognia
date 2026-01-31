/**
 * Chat Widget Components
 * Unified chat assistant solution for Tauri desktop mode
 * 
 * Components:
 * - ChatWidget: Standalone chat window (used in Tauri chat-widget window)
 * - ChatAssistantContainer: FAB + Panel combo (used in main window)
 * - ChatAssistantFab: Floating action button
 * - ChatAssistantPanel: Expandable chat panel
 */

// Core chat UI components
export { ChatWidget } from "./chat-widget";
export { ChatWidgetHeader } from "./chat-widget-header";
export { ChatWidgetMessages } from "./chat-widget-messages";
export { ChatWidgetInput } from "./chat-widget-input";
export { ChatWidgetSettings } from "./chat-widget-settings";
export { ChatWidgetSuggestions } from "./chat-widget-suggestions";
export { ChatWidgetShortcuts } from "./chat-widget-shortcuts";
export { ChatWidgetModelSelector } from "./chat-widget-model-selector";

// Floating assistant components (Tauri only)
export { ChatAssistantContainer } from "./chat-assistant-container";
export { ChatAssistantFab } from "./chat-assistant-fab";
export { ChatAssistantPanel } from "./chat-assistant-panel";

// Re-export types and hooks from hooks/chat for convenience
export {
  useFloatingPosition,
  useDraggableFab,
  type FabPosition,
  type PanelExpandDirection,
} from "@/hooks/chat";
