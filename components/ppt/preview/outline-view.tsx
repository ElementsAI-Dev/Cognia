'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { SLIDE_LAYOUT_INFO } from '@/types/workflow';
import {
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  BarChart3,
  Layout,
  Presentation,
  ListTree,
  ChevronsUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OutlineViewProps } from '../types';

// Layout icon mapping
const getLayoutIcon = (layout: string) => {
  switch (layout) {
    case 'title':
    case 'section':
      return <Presentation className="h-4 w-4" />;
    case 'image-left':
    case 'image-right':
    case 'full-image':
      return <ImageIcon className="h-4 w-4" />;
    case 'chart':
      return <BarChart3 className="h-4 w-4" />;
    case 'bullets':
    case 'two-column':
      return <ListTree className="h-4 w-4" />;
    default:
      return <Layout className="h-4 w-4" />;
  }
};

/**
 * OutlineView - Enhanced presentation outline with collapsible sections
 */
export function OutlineView({ presentation, marpContent, onCopy, copied }: OutlineViewProps) {
  const t = useTranslations('pptPreview');
  const [expandedSlides, setExpandedSlides] = useState<Set<string>>(new Set(presentation.slides.map(s => s.id)));
  const [activeTab, setActiveTab] = useState<'outline' | 'marp' | 'structure'>('outline');

  const toggleSlide = useCallback((slideId: string) => {
    setExpandedSlides(prev => {
      const next = new Set(prev);
      if (next.has(slideId)) {
        next.delete(slideId);
      } else {
        next.add(slideId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedSlides(new Set(presentation.slides.map(s => s.id)));
  }, [presentation.slides]);

  const collapseAll = useCallback(() => {
    setExpandedSlides(new Set());
  }, []);

  // Calculate presentation statistics
  const stats = {
    totalSlides: presentation.slides.length,
    totalBullets: presentation.slides.reduce((acc, s) => acc + (s.bullets?.length || 0), 0),
    slidesWithNotes: presentation.slides.filter(s => s.notes).length,
    slidesWithImages: presentation.slides.filter(s => s.backgroundImage || s.elements?.some(e => e.type === 'image')).length,
  };

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="outline">{t('outline')}</TabsTrigger>
        <TabsTrigger value="structure">结构概览</TabsTrigger>
        <TabsTrigger value="marp">{t('marpCode')}</TabsTrigger>
      </TabsList>

      <TabsContent value="outline" className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{stats.totalSlides} 张幻灯片</span>
            <span>•</span>
            <span>{stats.totalBullets} 个要点</span>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={expandAll} className="h-7 px-2 text-xs">
              展开全部
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll} className="h-7 px-2 text-xs">
              折叠全部
            </Button>
          </div>
        </div>
        
        <ScrollArea className="h-full">
          <div className="space-y-2 p-2">
            {presentation.slides.map((slide, index) => (
              <Collapsible
                key={slide.id}
                open={expandedSlides.has(slide.id)}
                onOpenChange={() => toggleSlide(slide.id)}
              >
                <div className={cn(
                  'border rounded-lg overflow-hidden transition-colors',
                  expandedSlides.has(slide.id) ? 'bg-muted/20' : 'hover:bg-muted/10'
                )}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full p-3 flex items-center gap-3 text-left">
                      <div 
                        className="shrink-0 w-8 h-8 rounded flex items-center justify-center text-sm font-medium"
                        style={{ 
                          backgroundColor: presentation.theme.primaryColor + '20',
                          color: presentation.theme.primaryColor 
                        }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {getLayoutIcon(slide.layout)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{slide.title || t('untitled')}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {slide.notes && (
                          <Badge variant="outline" className="text-xs">
                            <FileText className="h-3 w-3 mr-1" />
                            备注
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {SLIDE_LAYOUT_INFO[slide.layout]?.name || slide.layout}
                        </Badge>
                        {expandedSlides.has(slide.id) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-3 pb-3 ml-11 border-l-2 border-muted space-y-2">
                      {slide.subtitle && (
                        <p className="text-sm text-muted-foreground">{slide.subtitle}</p>
                      )}
                      {slide.content && (
                        <p className="text-sm text-muted-foreground line-clamp-3">{slide.content}</p>
                      )}
                      {slide.bullets && slide.bullets.length > 0 && (
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {slide.bullets.map((bullet, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span 
                                className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: presentation.theme.primaryColor }}
                              />
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      )}
                      {slide.notes && (
                        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 mt-2">
                          <span className="font-medium">{t('notes')}:</span> {slide.notes}
                        </div>
                      )}
                      {slide.elements && slide.elements.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          包含 {slide.elements.length} 个自定义元素
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="structure" className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-6">
            {/* Presentation info */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg" style={{ color: presentation.theme.primaryColor }}>
                {presentation.title}
              </h3>
              {presentation.subtitle && (
                <p className="text-sm text-muted-foreground">{presentation.subtitle}</p>
              )}
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="border rounded-lg p-3">
                <div className="text-2xl font-bold" style={{ color: presentation.theme.primaryColor }}>
                  {stats.totalSlides}
                </div>
                <div className="text-xs text-muted-foreground">幻灯片</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-2xl font-bold" style={{ color: presentation.theme.primaryColor }}>
                  {stats.totalBullets}
                </div>
                <div className="text-xs text-muted-foreground">要点</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-2xl font-bold" style={{ color: presentation.theme.primaryColor }}>
                  {stats.slidesWithNotes}
                </div>
                <div className="text-xs text-muted-foreground">有备注</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-2xl font-bold" style={{ color: presentation.theme.primaryColor }}>
                  {stats.slidesWithImages}
                </div>
                <div className="text-xs text-muted-foreground">有图片</div>
              </div>
            </div>

            {/* Structure tree */}
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <ChevronsUpDown className="h-4 w-4" />
                内容结构
              </h4>
              <div className="border rounded-lg p-3 space-y-1">
                {presentation.slides.map((slide, index) => (
                  <div key={slide.id} className="flex items-center gap-2 text-sm">
                    <span className="w-6 text-center text-muted-foreground">{index + 1}.</span>
                    <span className="text-muted-foreground">{getLayoutIcon(slide.layout)}</span>
                    <span className={cn(
                      slide.layout === 'title' || slide.layout === 'section' 
                        ? 'font-semibold' 
                        : ''
                    )}>
                      {slide.title || t('untitled')}
                    </span>
                    {slide.bullets && slide.bullets.length > 0 && (
                      <Badge variant="outline" className="text-xs ml-auto">
                        {slide.bullets.length} 项
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Theme info */}
            <div className="space-y-2">
              <h4 className="font-medium">主题</h4>
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded-full border"
                  style={{ backgroundColor: presentation.theme.primaryColor }}
                />
                <div 
                  className="w-6 h-6 rounded-full border"
                  style={{ backgroundColor: presentation.theme.secondaryColor }}
                />
                <div 
                  className="w-6 h-6 rounded-full border"
                  style={{ backgroundColor: presentation.theme.backgroundColor }}
                />
                <span className="text-sm text-muted-foreground ml-2">
                  {presentation.theme.name}
                </span>
              </div>
            </div>
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
