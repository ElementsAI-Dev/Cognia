'use client';

/**
 * Plugin Dev Tools - Development and debugging tools for plugins
 */

import React, { useState, useCallback } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Play,
  Code,
  Terminal,
  Bug,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface PluginDevToolsProps {
  className?: string;
}

export function PluginDevTools({ className }: PluginDevToolsProps) {
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

  const pythonPlugins = enabledPlugins.filter(
    (p) => p.manifest.type === 'python' || p.manifest.type === 'hybrid'
  );

  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-4">
          <Bug className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Plugin Dev Tools</h2>
        </div>

        <div className="space-y-2">
          <Label>Select Plugin</Label>
          <Select
            value={selectedPluginId}
            onValueChange={setSelectedPluginId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a Python plugin..." />
            </SelectTrigger>
            <SelectContent>
              {pythonPlugins.map((plugin) => (
                <SelectItem key={plugin.manifest.id} value={plugin.manifest.id}>
                  {plugin.manifest.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedPlugin ? (
        <Tabs defaultValue="eval" className="flex-1 flex flex-col">
          <div className="border-b px-4">
            <TabsList>
              <TabsTrigger value="eval" className="gap-2">
                <Code className="h-4 w-4" />
                Eval
              </TabsTrigger>
              <TabsTrigger value="tools" className="gap-2">
                <Terminal className="h-4 w-4" />
                Tools
              </TabsTrigger>
              <TabsTrigger value="info" className="gap-2">
                <Bug className="h-4 w-4" />
                Info
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <TabsContent value="eval" className="flex-1 m-0 p-4 flex flex-col">
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex-1 min-h-0">
                  <Label className="mb-2 block">Python Code</Label>
                  <Textarea
                    className="h-full font-mono text-sm resize-none"
                    placeholder="Enter Python code to evaluate..."
                    value={pythonCode}
                    onChange={(e) => setPythonCode(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleEvalPython}
                  disabled={isLoading || !pythonCode}
                  className="self-start"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Execute
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="tools" className="flex-1 m-0 p-4 flex flex-col">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tool Name</Label>
                    <Select value={toolName} onValueChange={setToolName}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tool..." />
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
                  <Label>Arguments (JSON)</Label>
                  <Textarea
                    className="font-mono text-sm"
                    placeholder="{}"
                    value={toolArgs}
                    onChange={(e) => setToolArgs(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button
                  onClick={handleCallTool}
                  disabled={isLoading || !toolName}
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Call Tool
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="info" className="flex-1 m-0 p-4">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Registered Tools</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedPlugin.tools && selectedPlugin.tools.length > 0 ? (
                        <ul className="space-y-2">
                          {selectedPlugin.tools.map((tool) => (
                            <li
                              key={tool.name}
                              className="text-sm font-mono bg-muted/50 p-2 rounded"
                            >
                              {tool.name}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No tools registered
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Plugin State</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs font-mono overflow-auto">
                        {JSON.stringify(
                          {
                            id: selectedPlugin.manifest.id,
                            status: selectedPlugin.status,
                            type: selectedPlugin.manifest.type,
                            path: selectedPlugin.path,
                            config: selectedPlugin.config,
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

            {/* Output Panel */}
            <div className="border-t p-4">
              <div className="flex items-center justify-between mb-2">
                <Label>Output</Label>
                {output && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyOutput}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              <ScrollArea className="h-32">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {output || 'No output yet'}
                </pre>
              </ScrollArea>
            </div>
          </div>
        </Tabs>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p>Select a Python plugin to use dev tools</p>
        </div>
      )}
    </div>
  );
}
