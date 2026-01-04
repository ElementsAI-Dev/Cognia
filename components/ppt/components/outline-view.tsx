'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SLIDE_LAYOUT_INFO } from '@/types/workflow';
import { Copy, Check } from 'lucide-react';
import type { OutlineViewProps } from '../types';

/**
 * OutlineView - Displays presentation outline and Marp code
 */
export function OutlineView({ presentation, marpContent, onCopy, copied }: OutlineViewProps) {
  const t = useTranslations('pptPreview');
  
  return (
    <Tabs defaultValue="outline" className="flex-1 flex flex-col">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="outline">{t('outline')}</TabsTrigger>
        <TabsTrigger value="marp">{t('marpCode')}</TabsTrigger>
      </TabsList>

      <TabsContent value="outline" className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-3 p-2">
            {presentation.slides.map((slide, index) => (
              <div
                key={slide.id}
                className="border rounded-lg p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{slide.title || t('untitled')}</h4>
                      <Badge variant="outline" className="text-xs">
                        {SLIDE_LAYOUT_INFO[slide.layout]?.name || slide.layout}
                      </Badge>
                    </div>
                    {slide.subtitle && (
                      <p className="text-sm text-muted-foreground mt-1">{slide.subtitle}</p>
                    )}
                    {slide.bullets && slide.bullets.length > 0 && (
                      <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                        {slide.bullets.map((bullet, i) => (
                          <li key={i}>• {bullet}</li>
                        ))}
                      </ul>
                    )}
                    {slide.notes && (
                      <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                        <span className="font-medium">{t('notes')}:</span> {slide.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="marp" className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{t('marpMarkdown')}</span>
            <Button variant="ghost" size="sm" onClick={onCopy}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  {t('copied')}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  {t('copy')}
                </>
              )}
            </Button>
          </div>
          <ScrollArea className="flex-1 border rounded-lg">
            <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
              {marpContent}
            </pre>
          </ScrollArea>
        </div>
      </TabsContent>
    </Tabs>
  );
}

export default OutlineView;
