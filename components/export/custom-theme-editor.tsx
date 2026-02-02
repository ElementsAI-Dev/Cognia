'use client';

/**
 * CustomThemeEditor - Create and edit custom syntax highlighting themes
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, Save, RotateCcw, Download, Upload } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useCustomThemeStore, createDefaultThemeTemplate } from '@/stores/settings';
import type { SyntaxTheme } from '@/lib/export/html/syntax-themes';

interface CustomThemeEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingThemeId?: string | null;
  onSave?: (themeId: string) => void;
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

function ColorField({ label, value, onChange, description }: ColorFieldProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border cursor-pointer"
        />
        <div className="flex-1 min-w-0">
          <Label className="text-sm font-medium">{label}</Label>
          {description && (
            <p className="text-xs text-muted-foreground truncate">{description}</p>
          )}
        </div>
      </div>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-24 h-8 text-xs font-mono"
        placeholder="#000000"
      />
    </div>
  );
}

const COLOR_FIELDS = [
  { key: 'background', labelKey: 'colorBackground', descKey: 'colorBackgroundDesc' },
  { key: 'foreground', labelKey: 'colorForeground', descKey: 'colorForegroundDesc' },
  { key: 'comment', labelKey: 'colorComment', descKey: 'colorCommentDesc' },
  { key: 'keyword', labelKey: 'colorKeyword', descKey: 'colorKeywordDesc' },
  { key: 'string', labelKey: 'colorString', descKey: 'colorStringDesc' },
  { key: 'number', labelKey: 'colorNumber', descKey: 'colorNumberDesc' },
  { key: 'function', labelKey: 'colorFunction', descKey: 'colorFunctionDesc' },
  { key: 'operator', labelKey: 'colorOperator', descKey: 'colorOperatorDesc' },
  { key: 'property', labelKey: 'colorProperty', descKey: 'colorPropertyDesc' },
  { key: 'className', labelKey: 'colorClass', descKey: 'colorClassDesc' },
  { key: 'constant', labelKey: 'colorConstant', descKey: 'colorConstantDesc' },
  { key: 'tag', labelKey: 'colorTag', descKey: 'colorTagDesc' },
  { key: 'attrName', labelKey: 'colorAttrName', descKey: 'colorAttrNameDesc' },
  { key: 'attrValue', labelKey: 'colorAttrValue', descKey: 'colorAttrValueDesc' },
  { key: 'punctuation', labelKey: 'colorPunctuation', descKey: 'colorPunctuationDesc' },
  { key: 'selection', labelKey: 'colorSelection', descKey: 'colorSelectionDesc' },
  { key: 'lineHighlight', labelKey: 'colorLineHighlight', descKey: 'colorLineHighlightDesc' },
] as const;

const SAMPLE_CODE = `// Sample code preview
function greetUser(name) {
  const message = "Hello, " + name;
  console.log(message);
  return { greeting: message, count: 42 };
}

// Call the function
const result = greetUser("World");`;

export function CustomThemeEditor({ 
  open, 
  onOpenChange, 
  editingThemeId,
  onSave 
}: CustomThemeEditorProps) {
  const t = useTranslations('customThemeEditor');
  const { addTheme, updateTheme, getTheme, exportTheme, importTheme } = useCustomThemeStore();
  
  const existingTheme = editingThemeId ? getTheme(editingThemeId) : null;
  
  const [themeName, setThemeName] = useState(existingTheme?.displayName || 'My Custom Theme');
  const [isDark, setIsDark] = useState(existingTheme?.isDark ?? true);
  const [colors, setColors] = useState<SyntaxTheme['colors']>(
    existingTheme?.colors || createDefaultThemeTemplate('', true).colors
  );

  const updateColor = useCallback((key: keyof SyntaxTheme['colors'], value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetToDefaults = useCallback(() => {
    const template = createDefaultThemeTemplate('', isDark);
    setColors(template.colors);
  }, [isDark]);

  const handleSave = useCallback(() => {
    if (!themeName.trim()) {
      toast.error(t('enterThemeName'));
      return;
    }

    const themeData = {
      name: themeName.toLowerCase().replace(/\s+/g, '-'),
      displayName: themeName,
      isDark,
      colors,
    };

    let themeId: string;
    if (editingThemeId && existingTheme) {
      updateTheme(editingThemeId, themeData);
      themeId = editingThemeId;
      toast.success(t('themeUpdated'));
    } else {
      themeId = addTheme(themeData);
      toast.success(t('themeCreated'));
    }

    onSave?.(themeId);
    onOpenChange(false);
  }, [themeName, isDark, colors, editingThemeId, existingTheme, addTheme, updateTheme, onSave, onOpenChange, t]);

  const handleExport = useCallback(() => {
    if (editingThemeId) {
      const json = exportTheme(editingThemeId);
      if (json) {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${themeName.toLowerCase().replace(/\s+/g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(t('themeExported'));
      }
    }
  }, [editingThemeId, exportTheme, themeName, t]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const text = await file.text();
      const result = importTheme(text);
      
      if (result.success) {
        toast.success(t('themeImported'));
        onOpenChange(false);
      } else {
        toast.error(result.error || t('importFailed'));
      }
    };
    input.click();
  }, [importTheme, onOpenChange, t]);

  const previewStyles = useMemo(() => {
    return `
      .preview-code {
        background: ${colors.background};
        color: ${colors.foreground};
        padding: 16px;
        border-radius: 8px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px;
        line-height: 1.6;
        overflow-x: auto;
      }
      .preview-code .comment { color: ${colors.comment}; font-style: italic; }
      .preview-code .keyword { color: ${colors.keyword}; font-weight: 500; }
      .preview-code .string { color: ${colors.string}; }
      .preview-code .number { color: ${colors.number}; }
      .preview-code .function { color: ${colors.function}; }
      .preview-code .operator { color: ${colors.operator}; }
      .preview-code .property { color: ${colors.property}; }
      .preview-code .punctuation { color: ${colors.punctuation}; }
    `;
  }, [colors]);

  const highlightedCode = useMemo(() => {
    return SAMPLE_CODE
      .replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>')
      .replace(/\b(function|const|return)\b/g, '<span class="keyword">$1</span>')
      .replace(/"([^"]*)"/g, '<span class="string">"$1"</span>')
      .replace(/\b(\d+)\b/g, '<span class="number">$1</span>')
      .replace(/\b(\w+)\s*\(/g, '<span class="function">$1</span>(')
      .replace(/([+:{}(),;])/g, '<span class="punctuation">$1</span>');
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {editingThemeId ? t('editTheme') : t('createTheme')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          {/* Left: Settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme-name">{t('themeName')}</Label>
              <Input
                id="theme-name"
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                placeholder={t('defaultThemeName')}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="is-dark">{t('darkTheme')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('darkThemeDesc')}
                </p>
              </div>
              <Switch
                id="is-dark"
                checked={isDark}
                onCheckedChange={setIsDark}
              />
            </div>

            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">{t('basicColors')}</TabsTrigger>
                <TabsTrigger value="advanced">{t('advanced')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic">
                <ScrollArea className="h-[280px] pr-4">
                  <div className="space-y-1">
                    {COLOR_FIELDS.slice(0, 10).map((field) => (
                      <ColorField
                        key={field.key}
                        label={t(field.labelKey)}
                        value={colors[field.key]}
                        onChange={(value) => updateColor(field.key, value)}
                        description={t(field.descKey)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="advanced">
                <ScrollArea className="h-[280px] pr-4">
                  <div className="space-y-1">
                    {COLOR_FIELDS.slice(10).map((field) => (
                      <ColorField
                        key={field.key}
                        label={t(field.labelKey)}
                        value={colors[field.key]}
                        onChange={(value) => updateColor(field.key, value)}
                        description={t(field.descKey)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: Preview */}
          <div className="space-y-3">
            <Label>{t('livePreview')}</Label>
            <style dangerouslySetInnerHTML={{ __html: previewStyles }} />
            <div 
              className="preview-code"
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
            
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefaults}
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('reset')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleImport}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                {t('import')}
              </Button>
              {editingThemeId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('export')}
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            {editingThemeId ? t('updateTheme') : t('createThemeBtn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CustomThemeEditor;
