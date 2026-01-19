'use client';

/**
 * Plugin Config - Configuration panel for a plugin
 */

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { Plugin } from '@/types/plugin';
import { usePluginStore } from '@/stores/plugin';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Save, RotateCcw, Shield, CheckCircle, XCircle } from 'lucide-react';
import { SchemaForm, type JSONSchema } from '../schema/schema-form';
import { usePluginPermissions } from '@/hooks/plugin';

interface PluginConfigProps {
  plugin: Plugin;
  onClose: () => void;
}

export function PluginConfig({ plugin, onClose: _onClose }: PluginConfigProps) {
  const t = useTranslations('pluginConfig');
  const { setPluginConfig } = usePluginStore();
  const [config, setConfig] = useState<Record<string, unknown>>(plugin.config);
  const [hasChanges, setHasChanges] = useState(false);
  const { permissions, grants, hasPermission } = usePluginPermissions({ pluginId: plugin.manifest.id });

  const configSchema = plugin.manifest.configSchema as JSONSchema | undefined;

  const handleSchemaFormChange = useCallback(
    (newConfig: Record<string, unknown>) => {
      setConfig(newConfig);
      setHasChanges(true);
    },
    []
  );

  const handleSave = useCallback(() => {
    setPluginConfig(plugin.manifest.id, config);
    setHasChanges(false);
  }, [plugin.manifest.id, config, setPluginConfig]);

  const handleReset = useCallback(() => {
    setConfig(plugin.manifest.defaultConfig || {});
    setHasChanges(true);
  }, [plugin.manifest.defaultConfig]);

  return (
    <Tabs defaultValue="config" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="config" className="flex-1">
          {t('tabs.configuration')}
        </TabsTrigger>
        <TabsTrigger value="info" className="flex-1">
          {t('tabs.information')}
        </TabsTrigger>
        <TabsTrigger value="permissions" className="flex-1">
          {t('tabs.permissions')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="config" className="mt-4">
        <ScrollArea className="h-[400px] pr-4">
          {configSchema?.properties ? (
            <SchemaForm
              schema={configSchema}
              value={config}
              onChange={handleSchemaFormChange}
            />
          ) : (
            <p className="text-muted-foreground text-center py-8">
              {t('noConfig')}
            </p>
          )}
        </ScrollArea>

        {configSchema?.properties && (
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('reset')}
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges}>
              <Save className="h-4 w-4 mr-2" />
              {t('save')}
            </Button>
          </div>
        )}
      </TabsContent>

      <TabsContent value="info" className="mt-4">
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">{t('info.id')}</Label>
              <p className="font-mono text-sm">{plugin.manifest.id}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('info.version')}</Label>
              <p>{plugin.manifest.version}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('info.type')}</Label>
              <p className="capitalize">{plugin.manifest.type}</p>
            </div>
            {plugin.manifest.author && (
              <div>
                <Label className="text-muted-foreground">{t('info.author')}</Label>
                <p>{plugin.manifest.author.name}</p>
              </div>
            )}
            {plugin.manifest.homepage && (
              <div>
                <Label className="text-muted-foreground">{t('info.homepage')}</Label>
                <a
                  href={plugin.manifest.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm"
                >
                  {plugin.manifest.homepage}
                </a>
              </div>
            )}
            <div>
              <Label className="text-muted-foreground">{t('info.capabilities')}</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {plugin.manifest.capabilities.map((cap) => (
                  <Badge key={cap} variant="secondary">
                    {cap}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('info.path')}</Label>
              <p className="font-mono text-xs break-all">{plugin.path}</p>
            </div>
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="permissions" className="mt-4">
        <ScrollArea className="h-[400px]">
          {permissions.length > 0 ? (
            <div className="space-y-2">
              {permissions.map((perm) => {
                const isGranted = hasPermission(perm);
                const grant = grants.find((g) => g.permission === perm);
                return (
                  <div
                    key={perm}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      {isGranted ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-mono text-sm">{perm}</span>
                    </div>
                    <Badge variant={isGranted ? 'default' : 'outline'} className="text-xs">
                      {grant?.grantedBy || t('permissions.pending')}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {t('permissions.noPermissions')}
              </p>
            </div>
          )}
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
