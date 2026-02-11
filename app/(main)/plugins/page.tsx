'use client';

/**
 * Plugins Page
 * 
 * Main page for discovering, installing, and managing plugins.
 * Includes tabs for installed plugins, marketplace, and updates.
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Package, Store, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PluginMarketplace } from '@/components/plugin/marketplace';
import { PluginDetailModal } from '@/components/plugin/marketplace';
import type { MarketplacePlugin } from '@/components/plugin/marketplace/components/marketplace-types';
import { PluginSettingsPage } from '@/components/plugin/config/plugin-settings-page';

export default function PluginsPage() {
  const t = useTranslations('pluginSettings');
  const [selectedPlugin, setSelectedPlugin] = useState<MarketplacePlugin | null>(null);
  const [activeTab, setActiveTab] = useState('marketplace');

  const handleViewDetails = useCallback((plugin: MarketplacePlugin) => {
    setSelectedPlugin(plugin);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedPlugin(null);
  }, []);

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b px-4 sm:px-6 py-2 flex items-center gap-4">
          <TabsList>
            <TabsTrigger value="installed" className="gap-1.5">
              <Package className="h-4 w-4" />
              {t('tabs.installed')}
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="gap-1.5">
              <Store className="h-4 w-4" />
              {t('tabs.marketplace')}
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <RefreshCw className="h-4 w-4" />
              {t('tabs.settings')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="installed" className="flex-1 overflow-auto mt-0">
          <PluginSettingsPage />
        </TabsContent>

        <TabsContent value="marketplace" className="flex-1 overflow-auto mt-0">
          <PluginMarketplace onViewDetails={handleViewDetails} />
        </TabsContent>

        <TabsContent value="settings" className="flex-1 overflow-auto mt-0 p-4 sm:p-6">
          <div className="text-muted-foreground text-sm">
            {t('settingsTab.description')}
          </div>
        </TabsContent>
      </Tabs>

      {selectedPlugin && (
        <PluginDetailModal
          plugin={selectedPlugin}
          open={!!selectedPlugin}
          onOpenChange={(open) => !open && handleCloseDetails()}
          variant="sheet"
        />
      )}
    </div>
  );
}
