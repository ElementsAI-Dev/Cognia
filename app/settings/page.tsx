'use client';

/**
 * Settings Page - Configure providers, appearance, memory, search, and data
 */

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProviderSettings } from '@/components/settings/provider-settings';
import { AppearanceSettings } from '@/components/settings/appearance-settings';
import { SearchSettings } from '@/components/settings/search-settings';
import { DataSettings } from '@/components/settings/data-settings';
import { MemorySettings } from '@/components/settings/memory-settings';
import { CustomInstructionsSettings } from '@/components/settings/custom-instructions-settings';
import { UsageSettings } from '@/components/settings/usage-settings';
import { McpSettings } from '@/components/settings/mcp-settings';

export default function SettingsPage() {
  const t = useTranslations('settings');

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden">
      {/* Header */}
      <header className="flex h-14 items-center gap-4 border-b px-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">{t('title')}</h1>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl p-6">
          <Tabs defaultValue="providers" className="space-y-6">
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="providers">{t('tabProviders')}</TabsTrigger>
              <TabsTrigger value="mcp">MCP</TabsTrigger>
              <TabsTrigger value="instructions">Instructions</TabsTrigger>
              <TabsTrigger value="memory">Memory</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
              <TabsTrigger value="appearance">{t('tabAppearance')}</TabsTrigger>
              <TabsTrigger value="search">{t('tabSearch')}</TabsTrigger>
              <TabsTrigger value="data">{t('tabData')}</TabsTrigger>
            </TabsList>

            <TabsContent value="providers" className="space-y-6">
              <ProviderSettings />
            </TabsContent>

            <TabsContent value="mcp" className="space-y-6">
              <McpSettings />
            </TabsContent>

            <TabsContent value="instructions" className="space-y-6">
              <CustomInstructionsSettings />
            </TabsContent>

            <TabsContent value="memory" className="space-y-6">
              <MemorySettings />
            </TabsContent>

            <TabsContent value="usage" className="space-y-6">
              <UsageSettings />
            </TabsContent>

            <TabsContent value="appearance" className="space-y-6">
              <AppearanceSettings />
            </TabsContent>

            <TabsContent value="search" className="space-y-6">
              <SearchSettings />
            </TabsContent>

            <TabsContent value="data" className="space-y-6">
              <DataSettings />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
