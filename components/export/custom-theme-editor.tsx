'use client';

/**
 * CustomThemeEditor - Create and edit custom syntax highlighting themes
 */

import { useMemo } from 'react';
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
import type { CustomThemeEditorProps } from '@/types/export/custom-theme';
import { useThemeEditor } from '@/hooks/export';
import {
  COLOR_FIELDS,
  SAMPLE_CODE,
  generatePreviewStyles,
  generateHighlightedCode,
} from '@/lib/export/html/theme-editor-constants';

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
          {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
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

export function CustomThemeEditor({
  open,
  onOpenChange,
  editingThemeId,
  onSave,
}: CustomThemeEditorProps) {
  const t = useTranslations('customThemeEditor');

  const {
    themeName,
    setThemeName,
    isDark,
    setIsDark,
    colors,
    updateColor,
    resetToDefaults,
    handleSave,
    handleExport,
    handleImport,
  } = useThemeEditor(editingThemeId, onSave, onOpenChange, t);

  const previewStyles = useMemo(() => generatePreviewStyles(colors), [colors]);
  const highlightedCode = useMemo(() => generateHighlightedCode(SAMPLE_CODE), []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {editingThemeId ? t('editTheme') : t('createTheme')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
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
                <p className="text-xs text-muted-foreground">{t('darkThemeDesc')}</p>
              </div>
              <Switch id="is-dark" checked={isDark} onCheckedChange={setIsDark} />
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
            <div className="preview-code" dangerouslySetInnerHTML={{ __html: highlightedCode }} />

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={resetToDefaults} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('reset')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleImport} className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                {t('import')}
              </Button>
              {editingThemeId && (
                <Button variant="outline" size="sm" onClick={handleExport} className="flex-1">
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
