'use client';

/**
 * CustomThemeEditor - Create and edit custom syntax highlighting themes
 */

import { useState, useCallback, useMemo } from 'react';
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
import { toast } from '@/components/ui/toaster';
import { useCustomThemeStore, createDefaultThemeTemplate } from '@/stores/custom-theme-store';
import type { SyntaxTheme } from '@/lib/export/syntax-themes';

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
  { key: 'background', label: 'Background', description: 'Code block background' },
  { key: 'foreground', label: 'Foreground', description: 'Default text color' },
  { key: 'comment', label: 'Comments', description: '// comments' },
  { key: 'keyword', label: 'Keywords', description: 'const, function, if' },
  { key: 'string', label: 'Strings', description: '"text", \'text\'' },
  { key: 'number', label: 'Numbers', description: '123, 3.14' },
  { key: 'function', label: 'Functions', description: 'functionName()' },
  { key: 'operator', label: 'Operators', description: '+, -, =, =>' },
  { key: 'property', label: 'Properties', description: 'object.property' },
  { key: 'className', label: 'Classes', description: 'ClassName, types' },
  { key: 'constant', label: 'Constants', description: 'TRUE, NULL' },
  { key: 'tag', label: 'Tags', description: '<div>, <span>' },
  { key: 'attrName', label: 'Attr Names', description: 'class=, id=' },
  { key: 'attrValue', label: 'Attr Values', description: '"value"' },
  { key: 'punctuation', label: 'Punctuation', description: '(), {}, []' },
  { key: 'selection', label: 'Selection', description: 'Selected text bg' },
  { key: 'lineHighlight', label: 'Line Highlight', description: 'Current line bg' },
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
      toast.error('Please enter a theme name');
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
      toast.success('Theme updated');
    } else {
      themeId = addTheme(themeData);
      toast.success('Theme created');
    }

    onSave?.(themeId);
    onOpenChange(false);
  }, [themeName, isDark, colors, editingThemeId, existingTheme, addTheme, updateTheme, onSave, onOpenChange]);

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
        toast.success('Theme exported');
      }
    }
  }, [editingThemeId, exportTheme, themeName]);

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
        toast.success('Theme imported');
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Failed to import theme');
      }
    };
    input.click();
  }, [importTheme, onOpenChange]);

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
            {editingThemeId ? 'Edit Theme' : 'Create Custom Theme'}
          </DialogTitle>
          <DialogDescription>
            Customize syntax highlighting colors for code blocks in exports
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          {/* Left: Settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme-name">Theme Name</Label>
              <Input
                id="theme-name"
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                placeholder="My Custom Theme"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="is-dark">Dark Theme</Label>
                <p className="text-xs text-muted-foreground">
                  Optimized for dark backgrounds
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
                <TabsTrigger value="basic">Basic Colors</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic">
                <ScrollArea className="h-[280px] pr-4">
                  <div className="space-y-1">
                    {COLOR_FIELDS.slice(0, 10).map((field) => (
                      <ColorField
                        key={field.key}
                        label={field.label}
                        value={colors[field.key]}
                        onChange={(value) => updateColor(field.key, value)}
                        description={field.description}
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
                        label={field.label}
                        value={colors[field.key]}
                        onChange={(value) => updateColor(field.key, value)}
                        description={field.description}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: Preview */}
          <div className="space-y-3">
            <Label>Live Preview</Label>
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
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleImport}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              {editingThemeId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            {editingThemeId ? 'Update Theme' : 'Create Theme'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CustomThemeEditor;
