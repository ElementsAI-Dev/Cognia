'use client';

/**
 * Plugins Page
 *
 * Main page for discovering, installing, and managing plugins.
 * Delegates to PluginPageContent for the unified sidebar layout.
 */

import { PluginPageContent } from '@/components/plugin';

export default function PluginsPage() {
  return <PluginPageContent className="h-full" />;
}
