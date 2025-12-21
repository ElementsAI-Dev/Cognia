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
  const compactMode = useSettingsStore((state) => state.compactMode);
  const setCompactMode = useSettingsStore((state) => state.setCompactMode);
  const showTimestamps = useSettingsStore((state) => state.showTimestamps);
  const setShowTimestamps = useSettingsStore((state) => state.setShowTimestamps);
  const showTokenCount = useSettingsStore((state) => state.showTokenCount);
  const setShowTokenCount = useSettingsStore((state) => state.setShowTokenCount);

  return (
    <div className="space-y-6">
      {/* Code Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Code Display
          </CardTitle>
          <CardDescription>
            Customize how code blocks are displayed in AI responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Code Theme</Label>
              <Select value={codeTheme} onValueChange={(v) => setCodeTheme(v as CodeTheme)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CODE_THEMES.map((theme) => (
                    <SelectItem key={theme.value} value={theme.value}>
                      {theme.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Font Family</Label>
              <Select value={codeFontFamily} onValueChange={(v) => setCodeFontFamily(v as FontFamily)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILIES.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Font Size: {codeFontSize}px</Label>
              </div>
              <Slider
                value={[codeFontSize]}
                onValueChange={([v]) => setCodeFontSize(v)}
                min={10}
                max={20}
                step={1}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="line-numbers">Show Line Numbers</Label>
                <p className="text-sm text-muted-foreground">
                  Display line numbers in code blocks
                </p>
              </div>
              <Switch
                id="line-numbers"
                checked={showLineNumbers}
                onCheckedChange={setShowLineNumbers}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="syntax-highlight">Syntax Highlighting</Label>
                <p className="text-sm text-muted-foreground">
                  Enable syntax highlighting for code
                </p>
              </div>
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Text Display
          </CardTitle>
          <CardDescription>
            Customize text rendering in AI responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line Height: {lineHeight.toFixed(1)}</Label>
            </div>
            <Slider
              value={[lineHeight * 10]}
              onValueChange={([v]) => setLineHeight(v / 10)}
              min={12}
              max={24}
              step={1}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="math-rendering">Math Rendering (LaTeX)</Label>
              <p className="text-sm text-muted-foreground">
                Render mathematical formulas using LaTeX
              </p>
            </div>
            <Switch
              id="math-rendering"
              checked={enableMathRendering}
              onCheckedChange={setEnableMathRendering}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="mermaid-diagrams">Mermaid Diagrams</Label>
              <p className="text-sm text-muted-foreground">
                Render Mermaid diagrams in responses
              </p>
            </div>
            <Switch
              id="mermaid-diagrams"
              checked={enableMermaidDiagrams}
              onCheckedChange={setEnableMermaidDiagrams}
            />
          </div>
        </CardContent>
      </Card>

      {/* Layout Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Layout Options
          </CardTitle>
          <CardDescription>
            Customize the chat interface layout
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="compact-mode">Compact Mode</Label>
              <p className="text-sm text-muted-foreground">
                Reduce spacing between messages
              </p>
            </div>
            <Switch
              id="compact-mode"
              checked={compactMode}
              onCheckedChange={setCompactMode}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-timestamps">Show Timestamps</Label>
              <p className="text-sm text-muted-foreground">
                Display message timestamps
              </p>
            </div>
            <Switch
              id="show-timestamps"
              checked={showTimestamps}
              onCheckedChange={setShowTimestamps}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-tokens">Show Token Count</Label>
              <p className="text-sm text-muted-foreground">
                Display token usage for each message
              </p>
            </div>
            <Switch
              id="show-tokens"
              checked={showTokenCount}
              onCheckedChange={setShowTokenCount}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="p-4 rounded-lg border bg-muted/30"
            style={{
              fontFamily: codeFontFamily === 'system' ? 'inherit' : codeFontFamily,
              lineHeight: lineHeight,
            }}
          >
            <p className="mb-4">
              This is a preview of how AI responses will appear with your current settings.
            </p>
            <pre
              className="p-3 rounded bg-zinc-900 text-zinc-100 overflow-x-auto"
              style={{ fontSize: `${codeFontSize}px` }}
            >
              <code>
{`function greet(name: string) {
  console.log(\`Hello, \${name}!\`);
}

greet("World");`}
              </code>
            </pre>
            {enableMathRendering && (
              <p className="mt-4 text-sm text-muted-foreground">
                Math example: E = mc²
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ResponseSettings;
