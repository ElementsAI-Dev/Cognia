'use client';

/**
 * ResponseSettings - Configure AI response formatting options
 * All settings are persisted to the settings store
 */

import { Type, Code, Palette, Eye } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { useSettingsStore, type CodeTheme, type FontFamily } from '@/stores';

const CODE_THEMES: { value: CodeTheme; label: string }[] = [
  { value: 'github-dark', label: 'GitHub Dark' },
  { value: 'github-light', label: 'GitHub Light' },
  { value: 'monokai', label: 'Monokai' },
  { value: 'dracula', label: 'Dracula' },
  { value: 'nord', label: 'Nord' },
  { value: 'one-dark', label: 'One Dark' },
];

const FONT_FAMILIES: { value: FontFamily; label: string }[] = [
  { value: 'system', label: 'System Default' },
  { value: 'inter', label: 'Inter' },
  { value: 'roboto', label: 'Roboto' },
  { value: 'fira-code', label: 'Fira Code' },
  { value: 'jetbrains-mono', label: 'JetBrains Mono' },
];

export function ResponseSettings() {
  // All settings are now persisted to the store
  const codeTheme = useSettingsStore((state) => state.codeTheme);
  const setCodeTheme = useSettingsStore((state) => state.setCodeTheme);
  const codeFontFamily = useSettingsStore((state) => state.codeFontFamily);
  const setCodeFontFamily = useSettingsStore((state) => state.setCodeFontFamily);
  const codeFontSize = useSettingsStore((state) => state.codeFontSize);
  const setCodeFontSize = useSettingsStore((state) => state.setCodeFontSize);
  const lineHeight = useSettingsStore((state) => state.lineHeight);
  const setLineHeight = useSettingsStore((state) => state.setLineHeight);
  const showLineNumbers = useSettingsStore((state) => state.showLineNumbers);
  const setShowLineNumbers = useSettingsStore((state) => state.setShowLineNumbers);
  const enableSyntaxHighlight = useSettingsStore((state) => state.enableSyntaxHighlight);
  const setEnableSyntaxHighlight = useSettingsStore((state) => state.setEnableSyntaxHighlight);
  const enableMathRendering = useSettingsStore((state) => state.enableMathRendering);
  const setEnableMathRendering = useSettingsStore((state) => state.setEnableMathRendering);
  const enableMermaidDiagrams = useSettingsStore((state) => state.enableMermaidDiagrams);
  const setEnableMermaidDiagrams = useSettingsStore((state) => state.setEnableMermaidDiagrams);
  const enableVegaLiteCharts = useSettingsStore((state) => state.enableVegaLiteCharts);
  const setEnableVegaLiteCharts = useSettingsStore((state) => state.setEnableVegaLiteCharts);
  const compactMode = useSettingsStore((state) => state.compactMode);
  const setCompactMode = useSettingsStore((state) => state.setCompactMode);
  const showTimestamps = useSettingsStore((state) => state.showTimestamps);
  const setShowTimestamps = useSettingsStore((state) => state.setShowTimestamps);
  const showTokenCount = useSettingsStore((state) => state.showTokenCount);
  const setShowTokenCount = useSettingsStore((state) => state.setShowTokenCount);

  return (
    <div className="space-y-4">
      {/* Code Display Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Code className="h-4 w-4" />
            Code Display
          </CardTitle>
          <CardDescription className="text-xs">
            Customize code block appearance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Theme</Label>
              <Select value={codeTheme} onValueChange={(v) => setCodeTheme(v as CodeTheme)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CODE_THEMES.map((theme) => (
                    <SelectItem key={theme.value} value={theme.value} className="text-xs">
                      {theme.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Font</Label>
              <Select value={codeFontFamily} onValueChange={(v) => setCodeFontFamily(v as FontFamily)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILIES.map((font) => (
                    <SelectItem key={font.value} value={font.value} className="text-xs">
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Font Size: {codeFontSize}px</Label>
            </div>
            <Slider
              value={[codeFontSize]}
              onValueChange={([v]) => setCodeFontSize(v)}
              min={10}
              max={20}
              step={1}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label htmlFor="line-numbers" className="text-xs">Line Numbers</Label>
              <Switch
                id="line-numbers"
                checked={showLineNumbers}
                onCheckedChange={setShowLineNumbers}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label htmlFor="syntax-highlight" className="text-xs">Syntax Highlight</Label>
              <Switch
                id="syntax-highlight"
                checked={enableSyntaxHighlight}
                onCheckedChange={setEnableSyntaxHighlight}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Text Display Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Type className="h-4 w-4" />
            Text Display
          </CardTitle>
          <CardDescription className="text-xs">
            Customize text rendering
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Line Height: {lineHeight.toFixed(1)}</Label>
            </div>
            <Slider
              value={[lineHeight * 10]}
              onValueChange={([v]) => setLineHeight(v / 10)}
              min={12}
              max={24}
              step={1}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label htmlFor="math-rendering" className="text-xs">LaTeX</Label>
              <Switch
                id="math-rendering"
                checked={enableMathRendering}
                onCheckedChange={setEnableMathRendering}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label htmlFor="mermaid-diagrams" className="text-xs">Mermaid</Label>
              <Switch
                id="mermaid-diagrams"
                checked={enableMermaidDiagrams}
                onCheckedChange={setEnableMermaidDiagrams}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label htmlFor="vegalite-charts" className="text-xs">VegaLite</Label>
              <Switch
                id="vegalite-charts"
                checked={enableVegaLiteCharts}
                onCheckedChange={setEnableVegaLiteCharts}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layout Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4" />
            Layout Options
          </CardTitle>
          <CardDescription className="text-xs">
            Customize chat interface
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center gap-2 rounded-md border px-2 py-3">
              <Switch
                id="compact-mode"
                checked={compactMode}
                onCheckedChange={setCompactMode}
              />
              <Label htmlFor="compact-mode" className="text-[10px] text-center">Compact</Label>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-md border px-2 py-3">
              <Switch
                id="show-timestamps"
                checked={showTimestamps}
                onCheckedChange={setShowTimestamps}
              />
              <Label htmlFor="show-timestamps" className="text-[10px] text-center">Timestamps</Label>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-md border px-2 py-3">
              <Switch
                id="show-tokens"
                checked={showTokenCount}
                onCheckedChange={setShowTokenCount}
              />
              <Label htmlFor="show-tokens" className="text-[10px] text-center">Tokens</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Palette className="h-3.5 w-3.5" />
            Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="p-3 rounded-lg border bg-muted/30 text-sm"
            style={{
              fontFamily: codeFontFamily === 'system' ? 'inherit' : codeFontFamily,
              lineHeight: lineHeight,
            }}
          >
            <p className="mb-2 text-xs">Sample AI response:</p>
            <pre
              className="p-2 rounded bg-zinc-900 text-zinc-100 overflow-x-auto"
              style={{ fontSize: `${codeFontSize}px` }}
            >
              <code>{`const greet = (n) => console.log(\`Hi \${n}!\`);`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ResponseSettings;
