'use client';

/**
 * Plugin Dev Tools - Development and debugging tools for plugins
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { usePluginStore } from '@/stores/plugin';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Play,
  Code,
  Terminal,
  Bug,
  RefreshCw,
  Copy,
  Check,
  Activity,
  Layers,
  Zap,
} from 'lucide-react';
import { PluginProfiler } from '../monitoring/plugin-profiler';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '@/lib/utils';

interface PluginDevToolsProps {
  className?: string;
}

export function PluginDevTools({ className }: PluginDevToolsProps) {
  const t = useTranslations('pluginDevTools');
  const { plugins, getEnabledPlugins } = usePluginStore();
  const enabledPlugins = getEnabledPlugins();

  const [selectedPluginId, setSelectedPluginId] = useState<string>('');
  const [pythonCode, setPythonCode] = useState('');
  const [toolName, setToolName] = useState('');
  const [toolArgs, setToolArgs] = useState('{}');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedPlugin = selectedPluginId ? plugins[selectedPluginId] : null;

  const handleEvalPython = useCallback(async () => {
    if (!selectedPluginId || !pythonCode) return;

    setIsLoading(true);
    setOutput('');

    try {
      const result = await invoke<unknown>('plugin_python_eval', {
        pluginId: selectedPluginId,
        code: pythonCode,
        locals: {},
      });
      setOutput(JSON.stringify(result, null, 2));
    } catch (error) {
      setOutput(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPluginId, pythonCode]);

  const handleCallTool = useCallback(async () => {
    if (!selectedPluginId || !toolName) return;

    setIsLoading(true);
    setOutput('');

    try {
      const args = JSON.parse(toolArgs);
      const result = await invoke<unknown>('plugin_python_call_tool', {
        pluginId: selectedPluginId,
        toolName,
        args,
      });
      setOutput(JSON.stringify(result, null, 2));
    } catch (error) {
      setOutput(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPluginId, toolName, toolArgs]);

  const handleCopyOutput = useCallback(() => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const isPythonCapable = useMemo(() => {
    if (!selectedPlugin) return false;
    return selectedPlugin.manifest.type === 'python' || selectedPlugin.manifest.type === 'hybrid';
  }, [selectedPlugin]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="p-3 sm:p-4 border-b">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Bug className="h-4 w-4 sm:h-5 sm:w-5" />
          <h2 className="text-base sm:text-lg font-semibold">{t('title')}</h2>
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          <Label className="text-xs sm:text-sm">{t('selectPlugin')}</Label>
          <Select
            value={selectedPluginId}
            onValueChange={setSelectedPluginId}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={t('selectPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {enabledPlugins.map((plugin) => (
                <SelectItem key={plugin.manifest.id} value={plugin.manifest.id}>
                  <div className="flex items-center gap-2">
                    <span>{plugin.manifest.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                      {plugin.manifest.type}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedPlugin ? (
        <Tabs defaultValue={isPythonCapable ? 'eval' : 'info'} className="flex-1 flex flex-col">
          <div className="border-b px-2 sm:px-4 overflow-x-auto scrollbar-none">
            <TabsList className="h-9 sm:h-10 w-max sm:w-auto inline-flex">
              {isPythonCapable && (
                <TabsTrigger value="eval" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3">
                  <Code className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">{t('tabs.eval')}</span>
                  <span className="xs:hidden">Eval</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="tools" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3">
                <Terminal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">{t('tabs.tools')}</span>
                <span className="xs:hidden">Tools</span>
              </TabsTrigger>
              <TabsTrigger value="info" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3">
                <Bug className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">{t('tabs.info')}</span>
                <span className="xs:hidden">Info</span>
              </TabsTrigger>
              <TabsTrigger value="profiler" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3">
                <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t('tabs.performance')}</span>
                <span className="sm:hidden">Perf</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <TabsContent value="eval" className="flex-1 m-0 p-3 sm:p-4 flex flex-col">
              <div className="flex-1 flex flex-col gap-3 sm:gap-4">
                <div className="flex-1 min-h-0">
                  <Label className="mb-1.5 sm:mb-2 block text-xs sm:text-sm">{t('eval.pythonCode')}</Label>
                  <Textarea
                    className="h-full font-mono text-xs sm:text-sm resize-none"
                    placeholder={t('eval.placeholder')}
                    value={pythonCode}
                    onChange={(e) => setPythonCode(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleEvalPython}
                  disabled={isLoading || !pythonCode}
                  className="self-start"
                  size="sm"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {t('eval.execute')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="tools" className="flex-1 m-0 p-3 sm:p-4 flex flex-col">
              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-xs sm:text-sm">{t('tools.toolName')}</Label>
                    <Select value={toolName} onValueChange={setToolName}>
                      <SelectTrigger className="h-9 mt-1.5">
                        <SelectValue placeholder={t('tools.selectTool')} />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedPlugin.tools?.map((tool) => (
                          <SelectItem key={tool.name} value={tool.name}>
                            {tool.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">{t('tools.arguments')}</Label>
                  <Textarea
                    className="font-mono text-xs sm:text-sm mt-1.5"
                    placeholder="{}"
                    value={toolArgs}
                    onChange={(e) => setToolArgs(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleCallTool}
                  disabled={isLoading || !toolName}
                  size="sm"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {t('tools.callTool')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="info" className="flex-1 m-0 p-3 sm:p-4">
              <ScrollArea className="h-full">
                <div className="space-y-3 sm:space-y-4">
                  <Card>
                    <CardHeader className="p-3 sm:p-4 pb-2">
                      <CardTitle className="text-xs sm:text-sm">{t('info.registeredTools')}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                      {selectedPlugin.tools && selectedPlugin.tools.length > 0 ? (
                        <ul className="space-y-1.5 sm:space-y-2">
                          {selectedPlugin.tools.map((tool) => (
                            <li
                              key={tool.name}
                              className="text-xs sm:text-sm font-mono bg-muted/50 p-1.5 sm:p-2 rounded"
                            >
                              {tool.name}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {t('info.noTools')}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Components */}
                  {selectedPlugin.components && selectedPlugin.components.length > 0 && (
                    <Card>
                      <CardHeader className="p-3 sm:p-4 pb-2">
                        <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
                          <Layers className="h-3.5 w-3.5" />
                          {t('info.registeredComponents')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-4 pt-0">
                        <ul className="space-y-1.5 sm:space-y-2">
                          {selectedPlugin.components.map((comp) => (
                            <li
                              key={comp.type}
                              className="text-xs sm:text-sm font-mono bg-muted/50 p-1.5 sm:p-2 rounded flex items-center justify-between"
                            >
                              <span>{comp.type}</span>
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{comp.pluginId}</Badge>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Modes */}
                  {selectedPlugin.modes && selectedPlugin.modes.length > 0 && (
                    <Card>
                      <CardHeader className="p-3 sm:p-4 pb-2">
                        <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
                          <Zap className="h-3.5 w-3.5" />
                          {t('info.registeredModes')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-4 pt-0">
                        <ul className="space-y-1.5 sm:space-y-2">
                          {selectedPlugin.modes.map((mode) => (
                            <li
                              key={mode.id}
                              className="text-xs sm:text-sm bg-muted/50 p-1.5 sm:p-2 rounded"
                            >
                              <div className="font-mono font-medium">{mode.name || mode.id}</div>
                              {mode.description && (
                                <div className="text-muted-foreground text-[10px] mt-0.5">{mode.description}</div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader className="p-3 sm:p-4 pb-2">
                      <CardTitle className="text-xs sm:text-sm">{t('info.pluginState')}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                      <pre className="text-[10px] sm:text-xs font-mono overflow-auto">
                        {JSON.stringify(
                          {
                            id: selectedPlugin.manifest.id,
                            status: selectedPlugin.status,
                            type: selectedPlugin.manifest.type,
                            capabilities: selectedPlugin.manifest.capabilities,
                            path: selectedPlugin.path,
                            config: selectedPlugin.config,
                            toolCount: selectedPlugin.tools?.length || 0,
                            componentCount: selectedPlugin.components?.length || 0,
                            modeCount: selectedPlugin.modes?.length || 0,
                          },
                          null,
                          2
                        )}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="profiler" className="flex-1 m-0 overflow-hidden p-3 sm:p-0">
              <PluginProfiler
                pluginId={selectedPluginId}
                autoRefresh
                refreshInterval={2000}
                className="h-full"
              />
            </TabsContent>

            {/* Output Panel */}
            <div className="border-t p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <Label className="text-xs sm:text-sm">{t('output.title')}</Label>
                {output && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyOutput}
                    className="h-7 w-7 p-0"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>
              <ScrollArea className="h-24 sm:h-32">
                <pre className="text-[10px] sm:text-xs font-mono whitespace-pre-wrap">
                  {output || t('output.noOutput')}
                </pre>
              </ScrollArea>
            </div>
          </div>
        </Tabs>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
          <p className="text-sm text-center">{t('selectPromptAll')}</p>
        </div>
      )}
    </div>
  );
}
