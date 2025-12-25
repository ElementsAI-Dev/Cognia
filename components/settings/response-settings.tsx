'use client';

/**
 * ResponseSettings - Configure AI response formatting options
 * All settings are persisted to the settings store
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Type, Code, Palette, Eye, Calculator } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
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

/**
 * MathPreview - Live preview of math rendering with current settings
 */
function MathPreview({ scale, alignment }: { scale: number; alignment: 'center' | 'left' }) {
  const sampleMath = useMemo(() => {
    try {
      return katex.renderToString('E = mc^2 \\quad \\text{and} \\quad \\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}', {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      return '<span>Preview unavailable</span>';
    }
  }, []);

  return (
    <div className="p-3 rounded-lg border bg-muted/30">
      <p className="text-xs text-muted-foreground mb-2">Preview:</p>
      <div
        className="overflow-x-auto py-1"
        style={{
          fontSize: `${scale}em`,
          textAlign: alignment,
        }}
        dangerouslySetInnerHTML={{ __html: sampleMath }}
      />
    </div>
  );
}

export function ResponseSettings() {
  const t = useTranslations('responseSettings');

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
  const codeWordWrap = useSettingsStore((state) => state.codeWordWrap);
  const setCodeWordWrap = useSettingsStore((state) => state.setCodeWordWrap);
  const enableSyntaxHighlight = useSettingsStore((state) => state.enableSyntaxHighlight);
  const setEnableSyntaxHighlight = useSettingsStore((state) => state.setEnableSyntaxHighlight);
  const enableMathRendering = useSettingsStore((state) => state.enableMathRendering);
  const setEnableMathRendering = useSettingsStore((state) => state.setEnableMathRendering);
  const mathFontScale = useSettingsStore((state) => state.mathFontScale);
  const setMathFontScale = useSettingsStore((state) => state.setMathFontScale);
  const mathDisplayAlignment = useSettingsStore((state) => state.mathDisplayAlignment);
  const setMathDisplayAlignment = useSettingsStore((state) => state.setMathDisplayAlignment);
  const mathShowCopyButton = useSettingsStore((state) => state.mathShowCopyButton);
  const setMathShowCopyButton = useSettingsStore((state) => state.setMathShowCopyButton);
  const enableMermaidDiagrams = useSettingsStore((state) => state.enableMermaidDiagrams);
  const setEnableMermaidDiagrams = useSettingsStore((state) => state.setEnableMermaidDiagrams);
  const mermaidTheme = useSettingsStore((state) => state.mermaidTheme);
  const setMermaidTheme = useSettingsStore((state) => state.setMermaidTheme);
  const enableVegaLiteCharts = useSettingsStore((state) => state.enableVegaLiteCharts);
  const setEnableVegaLiteCharts = useSettingsStore((state) => state.setEnableVegaLiteCharts);
  const vegaLiteTheme = useSettingsStore((state) => state.vegaLiteTheme);
  const setVegaLiteTheme = useSettingsStore((state) => state.setVegaLiteTheme);
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
            {t('codeDisplay')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('codeDisplayDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('theme')}</Label>
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
              <Label className="text-xs">{t('font')}</Label>
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
              <Label className="text-sm">{t('fontSize')}: {codeFontSize}px</Label>
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
              <Label htmlFor="line-numbers" className="text-xs">{t('lineNumbers')}</Label>
              <Switch
                id="line-numbers"
                checked={showLineNumbers}
                onCheckedChange={setShowLineNumbers}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label htmlFor="syntax-highlight" className="text-xs">{t('syntaxHighlight')}</Label>
              <Switch
                id="syntax-highlight"
                checked={enableSyntaxHighlight}
                onCheckedChange={setEnableSyntaxHighlight}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label htmlFor="code-word-wrap" className="text-xs">{t('wordWrap')}</Label>
              <Switch
                id="code-word-wrap"
                checked={codeWordWrap}
                onCheckedChange={setCodeWordWrap}
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
            {t('textDisplay')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('textDisplayDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t('lineHeight')}: {lineHeight.toFixed(1)}</Label>
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

      {/* Math Display Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4" />
            {t('mathDisplay')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('mathDisplayDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t('fontScale')}: {mathFontScale.toFixed(1)}x</Label>
            </div>
            <Slider
              value={[mathFontScale * 10]}
              onValueChange={([v]) => setMathFontScale(v / 10)}
              min={8}
              max={20}
              step={1}
              disabled={!enableMathRendering}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t('alignment')}</Label>
            <Select 
              value={mathDisplayAlignment} 
              onValueChange={(v) => setMathDisplayAlignment(v as 'center' | 'left')}
              disabled={!enableMathRendering}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="center" className="text-xs">{t('center')}</SelectItem>
                <SelectItem value="left" className="text-xs">{t('left')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="math-copy-button" className="text-xs">{t('showCopyButton')}</Label>
            <Switch
              id="math-copy-button"
              checked={mathShowCopyButton}
              onCheckedChange={setMathShowCopyButton}
              disabled={!enableMathRendering}
            />
          </div>

          {/* Math Preview */}
          {enableMathRendering && (
            <MathPreview scale={mathFontScale} alignment={mathDisplayAlignment} />
          )}
        </CardContent>
      </Card>

      {/* Diagram Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4" />
            {t('diagramSettings')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('diagramSettingsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('mermaidTheme')}</Label>
              <Select 
                value={mermaidTheme} 
                onValueChange={(v) => setMermaidTheme(v as 'default' | 'dark' | 'forest' | 'neutral')}
                disabled={!enableMermaidDiagrams}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default" className="text-xs">Default</SelectItem>
                  <SelectItem value="dark" className="text-xs">Dark</SelectItem>
                  <SelectItem value="forest" className="text-xs">Forest</SelectItem>
                  <SelectItem value="neutral" className="text-xs">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('vegaLiteTheme')}</Label>
              <Select 
                value={vegaLiteTheme} 
                onValueChange={(v) => setVegaLiteTheme(v as 'default' | 'dark' | 'excel' | 'fivethirtyeight')}
                disabled={!enableVegaLiteCharts}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default" className="text-xs">Default</SelectItem>
                  <SelectItem value="dark" className="text-xs">Dark</SelectItem>
                  <SelectItem value="excel" className="text-xs">Excel</SelectItem>
                  <SelectItem value="fivethirtyeight" className="text-xs">FiveThirtyEight</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layout Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4" />
            {t('layoutOptions')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('layoutOptionsDesc')}
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
              <Label htmlFor="compact-mode" className="text-[10px] text-center">{t('compact')}</Label>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-md border px-2 py-3">
              <Switch
                id="show-timestamps"
                checked={showTimestamps}
                onCheckedChange={setShowTimestamps}
              />
              <Label htmlFor="show-timestamps" className="text-[10px] text-center">{t('timestamps')}</Label>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-md border px-2 py-3">
              <Switch
                id="show-tokens"
                checked={showTokenCount}
                onCheckedChange={setShowTokenCount}
              />
              <Label htmlFor="show-tokens" className="text-[10px] text-center">{t('tokens')}</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Palette className="h-3.5 w-3.5" />
            {t('preview')}
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
            <p className="mb-2 text-xs">{t('sampleResponse')}</p>
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
