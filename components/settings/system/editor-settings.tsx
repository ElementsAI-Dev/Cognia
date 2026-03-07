'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Code2, Command, Gauge, Languages, RefreshCw, Search } from 'lucide-react';
import { useSettingsStore } from '@/stores';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EditorDiagnosticsSeverity } from '@/stores/settings/settings-store';
import {
  isTauriRuntime,
  lspGetServerStatus,
  lspInstallServer,
  lspListInstalledServers,
  lspRegistryGetRecommended,
  lspRegistrySearch,
  lspResolveLaunch,
  lspUninstallServer,
} from '@/lib/monaco/lsp/lsp-client';
import type {
  LspInstalledServerRecord,
  LspProvider,
  LspRegistryEntry,
  LspResolvedLaunch,
  LspServerStatus,
} from '@/types/designer/lsp';

const MIN_SEVERITIES: EditorDiagnosticsSeverity[] = ['hint', 'info', 'warning', 'error'];
const LSP_MANAGER_LANGUAGES = ['typescript', 'javascript', 'html', 'css', 'json', 'eslint'];

function normalizeProvider(provider: string | undefined): LspProvider {
  return provider === 'vs_marketplace' ? 'vs_marketplace' : 'open_vsx';
}

function dedupeRegistryEntries(entries: LspRegistryEntry[]): LspRegistryEntry[] {
  const seen = new Set<string>();
  const deduped: LspRegistryEntry[] = [];
  for (const entry of entries) {
    const key = `${entry.extensionId}::${entry.provider}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(entry);
  }
  return deduped;
}

export function EditorSettings() {
  const editorSettings = useSettingsStore((state) => state.editorSettings);
  const setEditorSettings = useSettingsStore((state) => state.setEditorSettings);
  const resetEditorSettings = useSettingsStore((state) => state.resetEditorSettings);
  const isDesktopLspRuntime = useMemo(() => isTauriRuntime(), []);
  const providerOrder = useMemo<LspProvider[]>(
    () =>
      editorSettings.lsp.providerOrder.length > 0
        ? editorSettings.lsp.providerOrder
        : ['open_vsx', 'vs_marketplace'],
    [editorSettings.lsp.providerOrder]
  );

  const [managedLanguageId, setManagedLanguageId] = useState<string>('typescript');
  const [lspServerStatus, setLspServerStatus] = useState<LspServerStatus | null>(null);
  const [lspResolvedLaunch, setLspResolvedLaunch] = useState<LspResolvedLaunch | null>(null);
  const [installedServers, setInstalledServers] = useState<LspInstalledServerRecord[]>([]);
  const [recommendedServers, setRecommendedServers] = useState<LspRegistryEntry[]>([]);
  const [registryQuery, setRegistryQuery] = useState('');
  const [registryResults, setRegistryResults] = useState<LspRegistryEntry[]>([]);
  const [lspManagerMessage, setLspManagerMessage] = useState<string>('');
  const [isLspManagerLoading, setIsLspManagerLoading] = useState(false);
  const [isRegistrySearching, setIsRegistrySearching] = useState(false);

  const refreshLspServerData = useCallback(async () => {
    if (!isDesktopLspRuntime) {
      return;
    }

    setIsLspManagerLoading(true);
    try {
      const [status, launch, installed, recommended] = await Promise.all([
        lspGetServerStatus(managedLanguageId),
        lspResolveLaunch(managedLanguageId).catch(() => null),
        lspListInstalledServers().catch(() => []),
        lspRegistryGetRecommended(managedLanguageId, providerOrder)
          .then((response) => response.entries)
          .catch(() => []),
      ]);
      setLspServerStatus(status);
      setLspResolvedLaunch(launch);
      setInstalledServers(installed);
      setRecommendedServers(dedupeRegistryEntries(recommended));
      setLspManagerMessage('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load LSP server state';
      setLspManagerMessage(message);
    } finally {
      setIsLspManagerLoading(false);
    }
  }, [isDesktopLspRuntime, managedLanguageId, providerOrder]);

  useEffect(() => {
    void refreshLspServerData();
  }, [refreshLspServerData]);

  const runRegistrySearch = useCallback(async () => {
    if (!isDesktopLspRuntime) {
      return;
    }

    const query = registryQuery.trim();
    if (!query) {
      setRegistryResults([]);
      return;
    }

    setIsRegistrySearching(true);
    try {
      const results = await lspRegistrySearch({
        query,
        languageId: managedLanguageId,
        providers: providerOrder,
      });
      setRegistryResults(dedupeRegistryEntries(results));
      setLspManagerMessage('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registry search failed';
      setLspManagerMessage(message);
      setRegistryResults([]);
    } finally {
      setIsRegistrySearching(false);
    }
  }, [isDesktopLspRuntime, managedLanguageId, providerOrder, registryQuery]);

  const handleInstallServer = useCallback(
    async (entry: LspRegistryEntry) => {
      if (!isDesktopLspRuntime) {
        return;
      }

      setIsLspManagerLoading(true);
      try {
        await lspInstallServer({
          extensionId: entry.extensionId,
          languageId: managedLanguageId,
          provider: normalizeProvider(entry.provider),
        });
        setLspManagerMessage(`Installed ${entry.extensionId}`);
        await refreshLspServerData();
      } catch (error) {
        const message = error instanceof Error ? error.message : `Failed to install ${entry.extensionId}`;
        setLspManagerMessage(message);
      } finally {
        setIsLspManagerLoading(false);
      }
    },
    [isDesktopLspRuntime, managedLanguageId, refreshLspServerData]
  );

  const handleUninstallServer = useCallback(
    async (extensionId: string) => {
      if (!isDesktopLspRuntime) {
        return;
      }

      setIsLspManagerLoading(true);
      try {
        await lspUninstallServer(extensionId);
        setLspManagerMessage(`Uninstalled ${extensionId}`);
        await refreshLspServerData();
      } catch (error) {
        const message = error instanceof Error ? error.message : `Failed to uninstall ${extensionId}`;
        setLspManagerMessage(message);
      } finally {
        setIsLspManagerLoading(false);
      }
    },
    [isDesktopLspRuntime, refreshLspServerData]
  );

  const providerOrderValue = providerOrder.join(',');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Editor Appearance</CardTitle>
              <CardDescription className="text-xs">
                Unified Monaco behavior across Designer, Canvas, Workflow, Skills and more.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Font Size</Label>
              <Slider
                value={[editorSettings.appearance.fontSize]}
                onValueChange={(value) =>
                  setEditorSettings({ appearance: { fontSize: value[0] ?? 14 } })
                }
                min={10}
                max={24}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Tab Size</Label>
              <Select
                value={String(editorSettings.appearance.tabSize)}
                onValueChange={(value) =>
                  setEditorSettings({ appearance: { tabSize: Number(value) } })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label className="text-xs">Word Wrap</Label>
              <Switch
                checked={editorSettings.appearance.wordWrap}
                onCheckedChange={(checked) => setEditorSettings({ appearance: { wordWrap: checked } })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label className="text-xs">Minimap</Label>
              <Switch
                checked={editorSettings.appearance.minimap}
                onCheckedChange={(checked) => setEditorSettings({ appearance: { minimap: checked } })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label className="text-xs">Format On Paste</Label>
              <Switch
                checked={editorSettings.appearance.formatOnPaste}
                onCheckedChange={(checked) =>
                  setEditorSettings({ appearance: { formatOnPaste: checked } })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label className="text-xs">Format On Type</Label>
              <Switch
                checked={editorSettings.appearance.formatOnType}
                onCheckedChange={(checked) =>
                  setEditorSettings({ appearance: { formatOnType: checked } })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label className="text-xs">Bracket Pair Colorization</Label>
              <Switch
                checked={editorSettings.appearance.bracketPairColorization}
                onCheckedChange={(checked) =>
                  setEditorSettings({ appearance: { bracketPairColorization: checked } })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label className="text-xs">Sticky Scroll</Label>
              <Switch
                checked={editorSettings.appearance.stickyScroll}
                onCheckedChange={(checked) =>
                  setEditorSettings({ appearance: { stickyScroll: checked } })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2 md:col-span-2">
              <Label className="text-xs">Auto Save</Label>
              <Switch
                checked={editorSettings.appearance.autoSave}
                onCheckedChange={(checked) =>
                  setEditorSettings({ appearance: { autoSave: checked } })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Cursor Style</Label>
              <Select
                value={editorSettings.appearance.cursorStyle}
                onValueChange={(value) =>
                  setEditorSettings({
                    appearance: {
                      cursorStyle: value as typeof editorSettings.appearance.cursorStyle,
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="block">Block</SelectItem>
                  <SelectItem value="underline">Underline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Render Whitespace</Label>
              <Select
                value={editorSettings.appearance.renderWhitespace}
                onValueChange={(value) =>
                  setEditorSettings({
                    appearance: {
                      renderWhitespace: value as typeof editorSettings.appearance.renderWhitespace,
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="boundary">Boundary</SelectItem>
                  <SelectItem value="selection">Selection</SelectItem>
                  <SelectItem value="trailing">Trailing</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">LSP Strategy</CardTitle>
              <CardDescription className="text-xs">
                Configure language-server behavior for desktop-enhanced Monaco.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label className="text-xs">Enable LSP</Label>
              <Switch
                checked={editorSettings.lsp.enabled}
                onCheckedChange={(checked) => setEditorSettings({ lsp: { enabled: checked } })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label className="text-xs">Protocol v2 Sync</Label>
              <Switch
                checked={editorSettings.lsp.protocolV2Enabled}
                onCheckedChange={(checked) =>
                  setEditorSettings({ lsp: { protocolV2Enabled: checked } })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2 md:col-span-2">
              <Label className="text-xs">Auto Install Recommended Servers</Label>
              <Switch
                checked={editorSettings.lsp.autoInstall}
                onCheckedChange={(checked) => setEditorSettings({ lsp: { autoInstall: checked } })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Request Timeout (ms)</Label>
            <Slider
              value={[editorSettings.lsp.timeoutMs]}
              onValueChange={(value) =>
                setEditorSettings({ lsp: { timeoutMs: value[0] ?? 10_000 } })
              }
              min={2_000}
              max={60_000}
              step={500}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Provider Order</Label>
            <Select
              value={providerOrderValue}
              onValueChange={(value) =>
                setEditorSettings({
                  lsp: {
                    providerOrder: value.split(',') as LspProvider[],
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open_vsx,vs_marketplace">
                  OpenVSX → VS Marketplace
                </SelectItem>
                <SelectItem value="vs_marketplace,open_vsx">
                  VS Marketplace → OpenVSX
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium">LSP Server Management</p>
                <p className="text-[11px] text-muted-foreground">
                  Discover, install, uninstall, and inspect language-server runtime details.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void refreshLspServerData()}
                disabled={!isDesktopLspRuntime || isLspManagerLoading}
              >
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>

            {!isDesktopLspRuntime && (
              <p className="text-xs text-muted-foreground">
                LSP server management is available in desktop runtime only.
              </p>
            )}

            {isDesktopLspRuntime && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Language</Label>
                    <Select value={managedLanguageId} onValueChange={setManagedLanguageId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LSP_MANAGER_LANGUAGES.map((languageId) => (
                          <SelectItem key={languageId} value={languageId}>
                            {languageId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Server Status</Label>
                    <div className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs">
                      <Badge variant={lspServerStatus?.ready ? 'default' : 'secondary'}>
                        {lspServerStatus?.ready ? 'ready' : 'not ready'}
                      </Badge>
                      <span className="text-muted-foreground">
                        {lspServerStatus?.supported ? 'supported' : 'unsupported'}
                      </span>
                      {lspServerStatus?.provider && (
                        <span className="text-muted-foreground">provider: {lspServerStatus.provider}</span>
                      )}
                    </div>
                  </div>
                </div>

                {(lspResolvedLaunch || lspServerStatus) && (
                  <div className="space-y-1 rounded-md border px-2 py-2 text-[11px]">
                    <p>
                      Launch source:{' '}
                      <span className="font-medium">
                        {lspResolvedLaunch?.source ?? lspServerStatus?.reason ?? 'unknown'}
                      </span>
                    </p>
                    {lspResolvedLaunch?.command && (
                      <p className="text-muted-foreground">
                        Command: {lspResolvedLaunch.command} {lspResolvedLaunch.args.join(' ')}
                      </p>
                    )}
                    {lspServerStatus?.reason && (
                      <p className="text-muted-foreground">Reason: {lspServerStatus.reason}</p>
                    )}
                  </div>
                )}

                {lspManagerMessage && (
                  <p className="text-xs text-muted-foreground">{lspManagerMessage}</p>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">Installed Servers</Label>
                  <div className="space-y-1">
                    {installedServers.length === 0 && (
                      <p className="text-xs text-muted-foreground">No installed LSP servers.</p>
                    )}
                    {installedServers.map((server) => (
                      <div
                        key={`${server.extensionId}:${server.version}:${server.provider}`}
                        className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs"
                      >
                        <div>
                          <p className="font-medium">{server.extensionId}</p>
                          <p className="text-muted-foreground">
                            {server.provider} · {server.version}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void handleUninstallServer(server.extensionId)}
                          disabled={isLspManagerLoading}
                        >
                          Uninstall
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Recommended Servers</Label>
                  <div className="space-y-1">
                    {recommendedServers.length === 0 && (
                      <p className="text-xs text-muted-foreground">No recommendations found.</p>
                    )}
                    {recommendedServers.map((entry) => (
                      <div
                        key={`${entry.extensionId}:${entry.provider}`}
                        className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs"
                      >
                        <div>
                          <p className="font-medium">{entry.displayName || entry.extensionId}</p>
                          <p className="text-muted-foreground">
                            {entry.extensionId} · {entry.provider}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void handleInstallServer(entry)}
                          disabled={isLspManagerLoading}
                        >
                          Install
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Registry Search</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={registryQuery}
                      onChange={(event) => setRegistryQuery(event.target.value)}
                      placeholder="Search language servers"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void runRegistrySearch()}
                      disabled={isRegistrySearching}
                    >
                      <Search className="mr-1 h-3.5 w-3.5" />
                      Search
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {registryResults.map((entry) => (
                      <div
                        key={`${entry.extensionId}:${entry.provider}:search`}
                        className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs"
                      >
                        <div>
                          <p className="font-medium">{entry.displayName || entry.extensionId}</p>
                          <p className="text-muted-foreground">
                            {entry.extensionId} · {entry.provider}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void handleInstallServer(entry)}
                          disabled={isLspManagerLoading}
                        >
                          Install
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Command className="h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Command Palette</CardTitle>
              <CardDescription className="text-xs">
                Control whether active-editor commands appear in global palette.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label className="text-xs">Show Context Commands</Label>
            <Switch
              checked={editorSettings.palette.showContextCommands}
              onCheckedChange={(checked) =>
                setEditorSettings({ palette: { showContextCommands: checked } })
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label className="text-xs">Group By Active Context</Label>
            <Switch
              checked={editorSettings.palette.groupByContext}
              onCheckedChange={(checked) =>
                setEditorSettings({ palette: { groupByContext: checked } })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Diagnostics</CardTitle>
              <CardDescription className="text-xs">
                Tune realtime diagnostics refresh and minimum visible severity.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Diagnostics Debounce (ms)</Label>
            <Slider
              value={[editorSettings.diagnostics.debounceMs]}
              onValueChange={(value) =>
                setEditorSettings({ diagnostics: { debounceMs: value[0] ?? 300 } })
              }
              min={50}
              max={2_000}
              step={50}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Minimum Severity</Label>
            <Select
              value={editorSettings.diagnostics.minimumSeverity}
              onValueChange={(value) =>
                setEditorSettings({
                  diagnostics: {
                    minimumSeverity: value as EditorDiagnosticsSeverity,
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MIN_SEVERITIES.map((severity) => (
                  <SelectItem key={severity} value={severity}>
                    {severity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="pt-1">
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={resetEditorSettings}
            >
              Reset Editor Settings
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
