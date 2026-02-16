'use client';

/**
 * Root page — delegates to the ChatContainer.
 *
 * The primary chat UI lives at (main)/(chat)/page.tsx with its own layout
 * that provides sidebar, panels, and error boundary. This root page exists
 * as a fallback for the (main) route group and renders the same component.
 *
 * @see app/(main)/(chat)/layout.tsx  — Unified layout with sidebar & panels
 * @see app/(main)/(chat)/page.tsx    — Primary chat page
 */

import { ChatContainer } from '@/components/chat';

export default function Home() {
  return <ChatContainer />;
}
