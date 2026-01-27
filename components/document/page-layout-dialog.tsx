'use client';

/**
 * PageLayoutDialog - Dialog for configuring page layout settings
 * Supports page size, orientation, margins, header/footer settings
 * Fully responsive with mobile-optimized layouts
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  FileText,
  RotateCcw,
  Ruler,
  Settings2,
  Check,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  type PageSize,
  type PageOrientation,
  type PageMargins,
  PAGE_SIZES,
  MARGIN_PRESETS,
} from '@/types/document/document-formatting';
import { useMediaQuery } from '@/hooks/ui/use-media-query';

export interface PageLayoutSettings {
  pageSize: PageSize;
  customWidth?: number;
  customHeight?: number;
  orientation: PageOrientation;
  margins: PageMargins;
  headerEnabled?: boolean;
  headerContent?: string;
  footerEnabled?: boolean;
  footerContent?: string;
  showPageNumbers?: boolean;
}

export interface PageLayoutDialogProps {
  settings: PageLayoutSettings;
  onSettingsChange: (settings: PageLayoutSettings) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DEFAULT_SETTINGS: PageLayoutSettings = {
  pageSize: 'a4',
  orientation: 'portrait',
  margins: MARGIN_PRESETS.normal,
  headerEnabled: false,
  footerEnabled: true,
  showPageNumbers: true,
};

export function PageLayoutDialog({
  settings = DEFAULT_SETTINGS,
  onSettingsChange,
  trigger,
  open,
  onOpenChange,
}: PageLayoutDialogProps) {
  const t = useTranslations('document');
  const [localSettings, setLocalSettings] = useState<PageLayoutSettings>(settings);
  const [marginPreset, setMarginPreset] = useState<string>('normal');
  const isDesktop = useMediaQuery('(min-width: 640px)');

  const handleSave = useCallback(() => {
    onSettingsChange(localSettings);
    onOpenChange?.(false);
  }, [localSettings, onSettingsChange, onOpenChange]);

  const handleReset = useCallback(() => {
    setLocalSettings(DEFAULT_SETTINGS);
    setMarginPreset('normal');
  }, []);

  const updateMargins = useCallback((key: keyof PageMargins, value: number) => {
    setLocalSettings(prev => ({
      ...prev,
      margins: {
        ...prev.margins,
        [key]: value,
      },
    }));
    setMarginPreset('custom');
  }, []);

  const applyMarginPreset = useCallback((preset: string) => {
    if (preset in MARGIN_PRESETS) {
      setLocalSettings(prev => ({
        ...prev,
        margins: MARGIN_PRESETS[preset as keyof typeof MARGIN_PRESETS],
      }));
      setMarginPreset(preset);
    }
  }, []);

  const pageDimensions = localSettings.pageSize === 'custom'
    ? { width: localSettings.customWidth || 210, height: localSettings.customHeight || 297 }
    : PAGE_SIZES[localSettings.pageSize];

  const displayDimensions = localSettings.orientation === 'landscape'
    ? { width: pageDimensions.height, height: pageDimensions.width }
    : pageDimensions;

  // Calculate responsive preview scale
  const previewScale = isDesktop ? 0.5 : 0.35;

  // Shared content for both Dialog and Drawer
  const dialogContent = (
    <Tabs defaultValue="page" className="mt-2 sm:mt-4">
      <TabsList className="grid w-full grid-cols-3 h-auto">
        <TabsTrigger value="page" className="text-xs sm:text-sm py-2">
          {t('page')}
        </TabsTrigger>
        <TabsTrigger value="margins" className="text-xs sm:text-sm py-2">
          {t('margins')}
        </TabsTrigger>
        <TabsTrigger value="headerFooter" className="text-xs sm:text-sm py-2 whitespace-nowrap">
          <span className="hidden sm:inline">{t('headerFooter')}</span>
          <span className="sm:hidden">{t('header')}/{t('footer')}</span>
        </TabsTrigger>
      </TabsList>

      {/* Page Tab */}
      <TabsContent value="page" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
        {/* Page Size */}
        <div className="space-y-2">
          <Label className="text-sm">{t('pageSize')}</Label>
          <Select
            value={localSettings.pageSize}
            onValueChange={(value) => setLocalSettings(prev => ({ 
              ...prev, 
              pageSize: value as PageSize 
            }))}
          >
            <SelectTrigger className="h-9 sm:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a4">A4 (210 × 297 mm)</SelectItem>
              <SelectItem value="a3">A3 (297 × 420 mm)</SelectItem>
              <SelectItem value="a5">A5 (148 × 210 mm)</SelectItem>
              <SelectItem value="letter">Letter (216 × 279 mm)</SelectItem>
              <SelectItem value="legal">Legal (216 × 356 mm)</SelectItem>
              <SelectItem value="custom">{t('custom')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Size */}
        {localSettings.pageSize === 'custom' && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-sm">{t('width')} (mm)</Label>
              <Input
                type="number"
                value={localSettings.customWidth || 210}
                onChange={(e) => setLocalSettings(prev => ({
                  ...prev,
                  customWidth: Number(e.target.value),
                }))}
                min={50}
                max={500}
                className="h-9 sm:h-10"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-sm">{t('height')} (mm)</Label>
              <Input
                type="number"
                value={localSettings.customHeight || 297}
                onChange={(e) => setLocalSettings(prev => ({
                  ...prev,
                  customHeight: Number(e.target.value),
                }))}
                min={50}
                max={500}
                className="h-9 sm:h-10"
              />
            </div>
          </div>
        )}

        {/* Orientation */}
        <div className="space-y-2">
          <Label className="text-sm">{t('orientation')}</Label>
          <RadioGroup
            value={localSettings.orientation}
            onValueChange={(value) => setLocalSettings(prev => ({
              ...prev,
              orientation: value as PageOrientation,
            }))}
            className="flex flex-wrap gap-3 sm:gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="portrait" id="portrait" className="touch-manipulation" />
              <Label htmlFor="portrait" className="flex items-center gap-2 cursor-pointer text-sm">
                <div className="w-5 h-7 sm:w-6 sm:h-8 border-2 border-current rounded-sm" />
                {t('portrait')}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="landscape" id="landscape" className="touch-manipulation" />
              <Label htmlFor="landscape" className="flex items-center gap-2 cursor-pointer text-sm">
                <div className="w-7 h-5 sm:w-8 sm:h-6 border-2 border-current rounded-sm" />
                {t('landscape')}
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Preview */}
        <div className="flex justify-center pt-2 sm:pt-4">
          <div 
            className="border-2 border-dashed border-muted-foreground/30 rounded bg-white dark:bg-gray-100 relative transition-all"
            style={{
              width: displayDimensions.width * previewScale,
              height: displayDimensions.height * previewScale,
              minWidth: 80,
              minHeight: 100,
            }}
          >
            <div className="absolute inset-1.5 sm:inset-2 border border-primary/30 rounded-sm" />
            <div className="absolute bottom-0.5 sm:bottom-1 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
              {displayDimensions.width} × {displayDimensions.height} mm
            </div>
          </div>
        </div>
      </TabsContent>

      {/* Margins Tab */}
      <TabsContent value="margins" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
        {/* Margin Presets */}
        <div className="space-y-2">
          <Label className="text-sm">{t('marginPresets')}</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
            {Object.entries(MARGIN_PRESETS).map(([key, _value]) => (
              <Button
                key={key}
                variant={marginPreset === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyMarginPreset(key)}
                className={cn(
                  "capitalize text-xs sm:text-sm h-8 sm:h-9 touch-manipulation",
                  marginPreset === key && "ring-2 ring-primary ring-offset-1"
                )}
              >
                {marginPreset === key && <Check className="h-3 w-3 mr-1" />}
                {t(key as 'normal' | 'narrow' | 'moderate' | 'wide' | 'mirrored')}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Margins */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="flex items-center gap-1.5 sm:gap-2 text-sm">
              <Ruler className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t('top')} (mm)
            </Label>
            <Input
              type="number"
              value={localSettings.margins.top}
              onChange={(e) => updateMargins('top', Number(e.target.value))}
              min={0}
              max={100}
              step={0.1}
              className="h-9 sm:h-10"
            />
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="flex items-center gap-1.5 sm:gap-2 text-sm">
              <Ruler className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t('bottom')} (mm)
            </Label>
            <Input
              type="number"
              value={localSettings.margins.bottom}
              onChange={(e) => updateMargins('bottom', Number(e.target.value))}
              min={0}
              max={100}
              step={0.1}
              className="h-9 sm:h-10"
            />
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="flex items-center gap-1.5 sm:gap-2 text-sm">
              <Ruler className="h-3.5 w-3.5 sm:h-4 sm:w-4 rotate-90" />
              {t('left')} (mm)
            </Label>
            <Input
              type="number"
              value={localSettings.margins.left}
              onChange={(e) => updateMargins('left', Number(e.target.value))}
              min={0}
              max={100}
              step={0.1}
              className="h-9 sm:h-10"
            />
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="flex items-center gap-1.5 sm:gap-2 text-sm">
              <Ruler className="h-3.5 w-3.5 sm:h-4 sm:w-4 rotate-90" />
              {t('right')} (mm)
            </Label>
            <Input
              type="number"
              value={localSettings.margins.right}
              onChange={(e) => updateMargins('right', Number(e.target.value))}
              min={0}
              max={100}
              step={0.1}
              className="h-9 sm:h-10"
            />
          </div>
        </div>

        {/* Margin Preview */}
        <div className="flex justify-center pt-2 sm:pt-4">
          <div 
            className="border border-border rounded bg-white dark:bg-gray-100 relative transition-all"
            style={{ 
              width: isDesktop ? 150 : 120, 
              height: isDesktop ? 200 : 160 
            }}
          >
            <div 
              className="absolute bg-primary/10 border border-primary/30 transition-all"
              style={{
                top: Math.min(localSettings.margins.top * (isDesktop ? 0.5 : 0.4), 40),
                bottom: Math.min(localSettings.margins.bottom * (isDesktop ? 0.5 : 0.4), 40),
                left: Math.min(localSettings.margins.left * (isDesktop ? 0.5 : 0.4), 30),
                right: Math.min(localSettings.margins.right * (isDesktop ? 0.5 : 0.4), 30),
              }}
            />
          </div>
        </div>
      </TabsContent>

      {/* Header/Footer Tab */}
      <TabsContent value="headerFooter" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
        {/* Header */}
        <div className="space-y-2.5 sm:space-y-3 p-3 sm:p-4 border rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm sm:text-base font-medium">{t('header')}</Label>
            <Switch
              checked={localSettings.headerEnabled}
              onCheckedChange={(checked) => setLocalSettings(prev => ({
                ...prev,
                headerEnabled: checked,
              }))}
              className="touch-manipulation"
            />
          </div>
          {localSettings.headerEnabled && (
            <Input
              placeholder={t('headerContentPlaceholder')}
              value={localSettings.headerContent || ''}
              onChange={(e) => setLocalSettings(prev => ({
                ...prev,
                headerContent: e.target.value,
              }))}
              className="h-9 sm:h-10"
            />
          )}
        </div>

        {/* Footer */}
        <div className="space-y-2.5 sm:space-y-3 p-3 sm:p-4 border rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm sm:text-base font-medium">{t('footer')}</Label>
            <Switch
              checked={localSettings.footerEnabled}
              onCheckedChange={(checked) => setLocalSettings(prev => ({
                ...prev,
                footerEnabled: checked,
              }))}
              className="touch-manipulation"
            />
          </div>
          {localSettings.footerEnabled && (
            <>
              <Input
                placeholder={t('footerContentPlaceholder')}
                value={localSettings.footerContent || ''}
                onChange={(e) => setLocalSettings(prev => ({
                  ...prev,
                  footerContent: e.target.value,
                }))}
                className="h-9 sm:h-10"
              />
              <div className="flex items-center gap-2">
                <Switch
                  id="showPageNumbers"
                  checked={localSettings.showPageNumbers}
                  onCheckedChange={(checked) => setLocalSettings(prev => ({
                    ...prev,
                    showPageNumbers: checked,
                  }))}
                  className="touch-manipulation"
                />
                <Label htmlFor="showPageNumbers" className="text-xs sm:text-sm cursor-pointer">
                  {t('showPageNumbers')}
                </Label>
              </div>
            </>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );

  const footerContent = (
    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 w-full">
      <Button 
        variant="outline" 
        onClick={handleReset}
        className="flex-1 sm:flex-none h-10 sm:h-9 touch-manipulation"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        {t('reset')}
      </Button>
      <Button 
        onClick={handleSave}
        className="flex-1 sm:flex-none h-10 sm:h-9 touch-manipulation"
      >
        {t('apply')}
      </Button>
    </div>
  );

  const triggerButton = trigger || (
    <Button variant="outline" size="sm" className="touch-manipulation">
      <Settings2 className="h-4 w-4 mr-2" />
      <span className="hidden xs:inline">{t('pageLayout')}</span>
      <span className="xs:hidden">{t('page')}</span>
    </Button>
  );

  // Single responsive Dialog for both mobile and desktop
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className={cn(
        "max-h-[90vh] overflow-hidden flex flex-col",
        "w-[95vw] max-w-[550px]", // Responsive width
        "p-4 sm:p-6", // Responsive padding
      )}>
        <DialogHeader className="pb-2 sm:pb-4">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            {t('pageLayoutSettings')}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {t('pageLayoutDescription')}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-4 px-4 sm:-mx-6 sm:px-6" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {dialogContent}
        </ScrollArea>
        <DialogFooter className="mt-4 sm:mt-6 pt-4 border-t">
          {footerContent}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PageLayoutDialog;
