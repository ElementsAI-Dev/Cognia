'use client';

/**
 * MobileDesignerLayout - Responsive tab-based layout for mobile devices
 * Switches from side-by-side panels to tab navigation on smaller screens
 */

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, Code2, Layers, Palette } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useDesignerStore } from '@/stores/designer';

interface MobileDesignerLayoutProps {
  previewContent: React.ReactNode;
  codeContent: React.ReactNode;
  elementsContent: React.ReactNode;
  stylesContent: React.ReactNode;
  className?: string;
}

export function MobileDesignerLayout({
  previewContent,
  codeContent,
  elementsContent,
  stylesContent,
  className,
}: MobileDesignerLayoutProps) {
  const t = useTranslations('designer');
  const mobileActiveTab = useDesignerStore((state) => state.mobileActiveTab);
  const setMobileActiveTab = useDesignerStore((state) => state.setMobileActiveTab);

  const handleTabChange = useCallback(
    (value: string) => {
      setMobileActiveTab(value as 'preview' | 'code' | 'elements' | 'styles');
    },
    [setMobileActiveTab]
  );

  return (
    <Tabs
      value={mobileActiveTab}
      onValueChange={handleTabChange}
      className={cn('flex flex-col h-full', className)}
    >
      {/* Tab content - takes up most of the space */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <TabsContent value="preview" className="h-full m-0 data-[state=inactive]:hidden">
          {previewContent}
        </TabsContent>
        <TabsContent value="code" className="h-full m-0 data-[state=inactive]:hidden">
          {codeContent}
        </TabsContent>
        <TabsContent value="elements" className="h-full m-0 data-[state=inactive]:hidden">
          {elementsContent}
        </TabsContent>
        <TabsContent value="styles" className="h-full m-0 data-[state=inactive]:hidden">
          {stylesContent}
        </TabsContent>
      </div>

      {/* Bottom tab bar - fixed at bottom */}
      <TabsList className="grid grid-cols-4 h-14 rounded-none border-t bg-background/95 backdrop-blur-sm">
        <TabsTrigger
          value="preview"
          className="flex flex-col gap-0.5 h-full rounded-none data-[state=active]:bg-muted"
        >
          <Eye className="h-4 w-4" />
          <span className="text-[10px]">{t('preview', { fallback: 'Preview' })}</span>
        </TabsTrigger>
        <TabsTrigger
          value="code"
          className="flex flex-col gap-0.5 h-full rounded-none data-[state=active]:bg-muted"
        >
          <Code2 className="h-4 w-4" />
          <span className="text-[10px]">{t('code', { fallback: 'Code' })}</span>
        </TabsTrigger>
        <TabsTrigger
          value="elements"
          className="flex flex-col gap-0.5 h-full rounded-none data-[state=active]:bg-muted"
        >
          <Layers className="h-4 w-4" />
          <span className="text-[10px]">{t('elements', { fallback: 'Elements' })}</span>
        </TabsTrigger>
        <TabsTrigger
          value="styles"
          className="flex flex-col gap-0.5 h-full rounded-none data-[state=active]:bg-muted"
        >
          <Palette className="h-4 w-4" />
          <span className="text-[10px]">{t('styles', { fallback: 'Styles' })}</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

export default MobileDesignerLayout;
