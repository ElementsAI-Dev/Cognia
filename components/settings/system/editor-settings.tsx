'use client';

import { Code2, Command, Gauge, Languages } from 'lucide-react';
import { useSettingsStore } from '@/stores';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EditorDiagnosticsSeverity } from '@/stores/settings/settings-store';

const MIN_SEVERITIES: EditorDiagnosticsSeverity[] = ['hint', 'info', 'warning', 'error'];

export function EditorSettings() {
  const editorSettings = useSettingsStore((state) => state.editorSettings);
  const setEditorSettings = useSettingsStore((state) => state.setEditorSettings);
  const resetEditorSettings = useSettingsStore((state) => state.resetEditorSettings);

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
