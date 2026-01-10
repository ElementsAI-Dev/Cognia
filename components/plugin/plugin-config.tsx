'use client';

/**
 * Plugin Config - Configuration panel for a plugin
 */

import React, { useState, useCallback } from 'react';
import type { Plugin } from '@/types/plugin';
import { usePluginStore } from '@/stores/plugin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Save, RotateCcw } from 'lucide-react';

interface PluginConfigProps {
  plugin: Plugin;
  onClose: () => void;
}

export function PluginConfig({ plugin, onClose: _onClose }: PluginConfigProps) {
  const { setPluginConfig } = usePluginStore();
  const [config, setConfig] = useState<Record<string, unknown>>(plugin.config);
  const [hasChanges, setHasChanges] = useState(false);

  const configSchema = plugin.manifest.configSchema;

  const handleConfigChange = useCallback(
    (key: string, value: unknown) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
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

  const renderConfigField = (
    key: string,
    schema: Record<string, unknown>
  ): React.ReactNode => {
    const value = config[key];
    const type = schema.type as string;
    const title = (typeof schema.title === 'string' ? schema.title : key) as string;
    const description = schema.description as string | undefined;
    const enumValues = schema.enum as unknown[] | undefined;

    switch (type) {
      case 'boolean':
        return (
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor={key}>{title}</Label>
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </div>
            <Switch
              id={key}
              checked={Boolean(value)}
              onCheckedChange={(checked) => handleConfigChange(key, checked)}
            />
          </div>
        );

      case 'string':
        if (enumValues) {
          return (
            <div className="space-y-2">
              <Label htmlFor={key}>{title}</Label>
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
              <Select
                value={String(value || '')}
                onValueChange={(v) => handleConfigChange(key, v)}
              >
                <SelectTrigger id={key}>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {enumValues.map((opt) => (
                    <SelectItem key={String(opt)} value={String(opt)}>
                      {String(opt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }

        const isMultiline = (schema.maxLength as number | undefined) 
          ? (schema.maxLength as number) > 100 
          : false;

        return (
          <div className="space-y-2">
            <Label htmlFor={key}>{title}</Label>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {isMultiline ? (
              <Textarea
                id={key}
                value={String(value || '')}
                onChange={(e) => handleConfigChange(key, e.target.value)}
                rows={4}
              />
            ) : (
              <Input
                id={key}
                value={String(value || '')}
                onChange={(e) => handleConfigChange(key, e.target.value)}
              />
            )}
          </div>
        );

      case 'number':
      case 'integer':
        return (
          <div className="space-y-2">
            <Label htmlFor={key}>{title}</Label>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            <Input
              id={key}
              type="number"
              value={String(value || '')}
              onChange={(e) =>
                handleConfigChange(
                  key,
                  type === 'integer'
                    ? parseInt(e.target.value, 10)
                    : parseFloat(e.target.value)
                )
              }
              min={schema.minimum as number | undefined}
              max={schema.maximum as number | undefined}
            />
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <Label htmlFor={key}>{title}</Label>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            <Input
              id={key}
              value={JSON.stringify(value)}
              onChange={(e) => {
                try {
                  handleConfigChange(key, JSON.parse(e.target.value));
                } catch {
                  handleConfigChange(key, e.target.value);
                }
              }}
            />
          </div>
        );
    }
  };

  return (
    <Tabs defaultValue="config" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="config" className="flex-1">
          Configuration
        </TabsTrigger>
        <TabsTrigger value="info" className="flex-1">
          Information
        </TabsTrigger>
        <TabsTrigger value="permissions" className="flex-1">
          Permissions
        </TabsTrigger>
      </TabsList>

      <TabsContent value="config" className="mt-4">
        <ScrollArea className="h-[400px] pr-4">
          {configSchema?.properties ? (
            <div className="space-y-6">
              {Object.entries(configSchema.properties as Record<string, unknown>).map(
                ([key, schema]) => (
                  <div key={key}>
                    {renderConfigField(key, schema as Record<string, unknown>)}
                  </div>
                )
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              This plugin has no configuration options.
            </p>
          )}
        </ScrollArea>

        {configSchema?.properties && (
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        )}
      </TabsContent>

      <TabsContent value="info" className="mt-4">
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">ID</Label>
              <p className="font-mono text-sm">{plugin.manifest.id}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Version</Label>
              <p>{plugin.manifest.version}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Type</Label>
              <p className="capitalize">{plugin.manifest.type}</p>
            </div>
            {plugin.manifest.author && (
              <div>
                <Label className="text-muted-foreground">Author</Label>
                <p>{plugin.manifest.author.name}</p>
              </div>
            )}
            {plugin.manifest.homepage && (
              <div>
                <Label className="text-muted-foreground">Homepage</Label>
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
              <Label className="text-muted-foreground">Capabilities</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {plugin.manifest.capabilities.map((cap) => (
                  <Badge key={cap} variant="secondary">
                    {cap}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Path</Label>
              <p className="font-mono text-xs break-all">{plugin.path}</p>
            </div>
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="permissions" className="mt-4">
        <ScrollArea className="h-[400px]">
          {plugin.manifest.permissions && plugin.manifest.permissions.length > 0 ? (
            <div className="space-y-2">
              {plugin.manifest.permissions.map((perm) => (
                <div
                  key={perm}
                  className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                >
                  <span className="font-mono text-sm">{perm}</span>
                  <Badge variant="outline" className="text-xs">
                    Required
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              This plugin requires no special permissions.
            </p>
          )}
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
