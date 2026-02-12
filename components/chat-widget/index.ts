/**
 * Chat Widget Components
 * Unified chat assistant solution for Tauri desktop mode
 *
 * Components:
 * - ChatWidget: Standalone chat window (used in Tauri chat-widget window)
 * - ChatAssistantContainer: FAB + Panel combo (used in main window via providers.tsx)
 */

// Standalone chat window (used by app/(standalone-chat-widget)/chat-widget/page.tsx)
export { ChatWidget } from './chat-widget';

// Floating assistant components (used by app/providers.tsx ChatAssistantContainerGate)
export { ChatAssistantContainer } from './chat-assistant-container';
