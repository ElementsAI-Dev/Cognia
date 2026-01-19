'use client';

import { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { usePPTEditorStore } from '@/stores/tools/ppt-editor-store';
import type { PPTSlideElement, PPTSlideLayout } from '@/types/workflow';
import { SLIDE_LAYOUT_INFO } from '@/types/workflow';
import { SlideElement } from './slide-element';
import type { SlideEditorProps } from '../types';
import {
  Plus,
  Type,
  Image as ImageIcon,
  Square,
  BarChart3,
  Table,
  Code,
  Trash2,
} from 'lucide-react';

/**
 * SlideEditor - Editor for individual slide content
 * Supports editing title, subtitle, content, bullets, and custom elements
 */
export function SlideEditor({
  slide,
  theme,
  isEditing = true,
  className,
}: SlideEditorProps) {
  const t = useTranslations('pptEditor');
  const [editingField, setEditingField] = useState<'title' | 'subtitle' | 'content' | 'bullet' | null>(null);
  const [editingBulletIndex, setEditingBulletIndex] = useState<number | null>(null);
  const [showAddElement, setShowAddElement] = useState(false);
  
  const {
    updateSlide,
    addElement,
    updateElement,
    deleteElement,
    selection,
    selectElement,
    clearSelection,
    startEditing,
    stopEditing,
  } = usePPTEditorStore();

  const containerRef = useRef<HTMLDivElement>(null);

  // Handle title edit
  const handleTitleChange = useCallback((value: string) => {
    updateSlide(slide.id, { title: value });
  }, [slide.id, updateSlide]);

  // Handle subtitle edit
  const handleSubtitleChange = useCallback((value: string) => {
    updateSlide(slide.id, { subtitle: value });
  }, [slide.id, updateSlide]);

  // Handle content edit
  const handleContentChange = useCallback((value: string) => {
    updateSlide(slide.id, { content: value });
  }, [slide.id, updateSlide]);

  // Handle bullet edit
  const handleBulletChange = useCallback((index: number, value: string) => {
    const newBullets = [...(slide.bullets || [])];
    newBullets[index] = value;
    updateSlide(slide.id, { bullets: newBullets });
  }, [slide.id, slide.bullets, updateSlide]);

  // Add new bullet
  const handleAddBullet = useCallback(() => {
    const newBullets = [...(slide.bullets || []), ''];
    updateSlide(slide.id, { bullets: newBullets });
    setEditingBulletIndex(newBullets.length - 1);
    setEditingField('bullet');
  }, [slide.id, slide.bullets, updateSlide]);

  // Delete bullet
  const handleDeleteBullet = useCallback((index: number) => {
    const newBullets = (slide.bullets || []).filter((_, i) => i !== index);
    updateSlide(slide.id, { bullets: newBullets });
    setEditingBulletIndex(null);
    setEditingField(null);
  }, [slide.id, slide.bullets, updateSlide]);

  // Add element
  const handleAddElement = useCallback((type: PPTSlideElement['type']) => {
    const element: Omit<PPTSlideElement, 'id'> = {
      type,
      content: type === 'text' ? 'New text' : '',
      position: {
        x: 10,
        y: 50,
        width: 30,
        height: 20,
      },
    };
    addElement(slide.id, element);
    setShowAddElement(false);
  }, [slide.id, addElement]);

  // Handle element click
  const handleElementClick = useCallback((e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    selectElement(elementId);
    if (isEditing) {
      startEditing(elementId);
    }
  }, [selectElement, startEditing, isEditing]);

  // Handle slide background click
  const handleBackgroundClick = useCallback(() => {
    clearSelection();
    stopEditing();
    setEditingField(null);
    setEditingBulletIndex(null);
  }, [clearSelection, stopEditing]);

  // Get layout-specific classes
  const getLayoutClasses = (layout: PPTSlideLayout) => {
    switch (layout) {
      case 'title':
      case 'section':
        return 'flex flex-col items-center justify-center text-center';
      case 'two-column':
        return 'grid grid-cols-2 gap-8';
      case 'image-left':
        return 'grid grid-cols-[40%_60%] gap-8';
      case 'image-right':
        return 'grid grid-cols-[60%_40%] gap-8';
      case 'full-image':
        return 'relative';
      default:
        return 'flex flex-col';
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-[960px] aspect-video rounded-lg shadow-xl overflow-hidden',
        className
      )}
      style={{
        backgroundColor: slide.backgroundColor || theme.backgroundColor,
        backgroundImage: slide.backgroundImage ? `url(${slide.backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      onClick={handleBackgroundClick}
    >
      {/* Background overlay for images */}
      {slide.backgroundImage && (
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
      )}

      {/* Slide content */}
      <div className={cn('relative z-10 h-full p-12', getLayoutClasses(slide.layout))}>
        {/* Title */}
        {(slide.layout !== 'blank') && (
          <div className="mb-4">
            {editingField === 'title' && isEditing ? (
              <Input
                value={slide.title || ''}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={() => setEditingField(null)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                autoFocus
                className={cn(
                  'bg-transparent border-dashed text-3xl font-bold p-0 h-auto',
                  slide.layout === 'title' || slide.layout === 'section' ? 'text-5xl text-center' : ''
                )}
                style={{
                  fontFamily: theme.headingFont,
                  color: theme.primaryColor,
                }}
              />
            ) : (
              <h1
                className={cn(
                  'font-bold cursor-text',
                  slide.layout === 'title' || slide.layout === 'section' ? 'text-5xl' : 'text-3xl',
                  !slide.title && 'text-muted-foreground/50 italic'
                )}
                style={{
                  fontFamily: theme.headingFont,
                  color: theme.primaryColor,
                }}
                onClick={(e) => {
                  if (isEditing) {
                    e.stopPropagation();
                    setEditingField('title');
                  }
                }}
              >
                {slide.title || t('clickToAddTitle')}
              </h1>
            )}
          </div>
        )}

        {/* Subtitle */}
        {(slide.layout === 'title' || slide.layout === 'section' || slide.layout === 'title-content') && (
          <div className="mb-6">
            {editingField === 'subtitle' && isEditing ? (
              <Input
                value={slide.subtitle || ''}
                onChange={(e) => handleSubtitleChange(e.target.value)}
                onBlur={() => setEditingField(null)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                autoFocus
                className={cn(
                  'bg-transparent border-dashed text-xl p-0 h-auto',
                  slide.layout === 'title' && 'text-center'
                )}
                style={{
                  fontFamily: theme.bodyFont,
                  color: theme.secondaryColor,
                }}
              />
            ) : (
              <h2
                className={cn(
                  'text-xl cursor-text',
                  slide.layout === 'title' && 'text-center',
                  !slide.subtitle && 'text-muted-foreground/50 italic text-lg'
                )}
                style={{
                  fontFamily: theme.bodyFont,
                  color: theme.secondaryColor,
                }}
                onClick={(e) => {
                  if (isEditing) {
                    e.stopPropagation();
                    setEditingField('subtitle');
                  }
                }}
              >
                {slide.subtitle || t('clickToAddSubtitle')}
              </h2>
            )}
          </div>
        )}

        {/* Content */}
        {(slide.layout === 'title-content' || slide.layout === 'two-column' || slide.layout === 'quote') && (
          <div className="mb-4 flex-1">
            {editingField === 'content' && isEditing ? (
              <Textarea
                value={slide.content || ''}
                onChange={(e) => handleContentChange(e.target.value)}
                onBlur={() => setEditingField(null)}
                autoFocus
                className="bg-transparent border-dashed min-h-[100px] p-0 resize-none"
                style={{
                  fontFamily: theme.bodyFont,
                  color: theme.textColor,
                }}
              />
            ) : (
              <div
                className={cn(
                  'text-lg leading-relaxed cursor-text whitespace-pre-wrap',
                  slide.layout === 'quote' && 'text-2xl italic text-center',
                  !slide.content && 'text-muted-foreground/50 italic'
                )}
                style={{
                  fontFamily: theme.bodyFont,
                  color: theme.textColor,
                }}
                onClick={(e) => {
                  if (isEditing) {
                    e.stopPropagation();
                    setEditingField('content');
                  }
                }}
              >
                {slide.content || t('clickToAddContent')}
              </div>
            )}
          </div>
        )}

        {/* Bullets */}
        {(slide.layout === 'bullets' || slide.layout === 'title-content' || slide.layout === 'numbered') && (
          <div className="space-y-3">
            {(slide.bullets || []).map((bullet, index) => (
              <div key={index} className="flex items-start gap-3 group">
                {slide.layout === 'numbered' ? (
                  <span
                    className="font-bold text-lg shrink-0 w-6"
                    style={{ color: theme.primaryColor }}
                  >
                    {index + 1}.
                  </span>
                ) : (
                  <span
                    className="mt-2 h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: theme.primaryColor }}
                  />
                )}
                {editingField === 'bullet' && editingBulletIndex === index && isEditing ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      value={bullet}
                      onChange={(e) => handleBulletChange(index, e.target.value)}
                      onBlur={() => {
                        setEditingField(null);
                        setEditingBulletIndex(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setEditingField(null);
                          setEditingBulletIndex(null);
                        }
                      }}
                      autoFocus
                      className="bg-transparent border-dashed p-0 h-auto text-lg"
                      style={{
                        fontFamily: theme.bodyFont,
                        color: theme.textColor,
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBullet(index);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <span
                    className={cn(
                      'text-lg cursor-text flex-1',
                      !bullet && 'text-muted-foreground/50 italic'
                    )}
                    style={{
                      fontFamily: theme.bodyFont,
                      color: theme.textColor,
                    }}
                    onClick={(e) => {
                      if (isEditing) {
                        e.stopPropagation();
                        setEditingField('bullet');
                        setEditingBulletIndex(index);
                      }
                    }}
                  >
                    {bullet || t('clickToEdit')}
                  </span>
                )}
              </div>
            ))}
            
            {/* Add bullet button */}
            {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddBullet();
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('addBullet')}
              </Button>
            )}
          </div>
        )}

        {/* Custom elements */}
        {slide.elements.map((element) => (
          <SlideElement
            key={element.id}
            element={element}
            theme={theme}
            isSelected={selection.elementIds.includes(element.id)}
            isEditing={isEditing}
            onClick={(e) => handleElementClick(e, element.id)}
            onUpdate={(updates) => updateElement(slide.id, element.id, updates)}
            onDelete={() => deleteElement(slide.id, element.id)}
          />
        ))}
      </div>

      {/* Add element button (floating) */}
      {isEditing && (
        <Popover open={showAddElement} onOpenChange={setShowAddElement}>
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="absolute bottom-4 right-4 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('addElement')}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48">
            <div className="grid gap-1">
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => handleAddElement('text')}
              >
                <Type className="h-4 w-4 mr-2" />
                {t('text')}
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => handleAddElement('image')}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                {t('image')}
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => handleAddElement('shape')}
              >
                <Square className="h-4 w-4 mr-2" />
                {t('shape')}
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => handleAddElement('chart')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                {t('chart')}
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => handleAddElement('table')}
              >
                <Table className="h-4 w-4 mr-2" />
                {t('table')}
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => handleAddElement('code')}
              >
                <Code className="h-4 w-4 mr-2" />
                {t('code')}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Layout indicator */}
      <div className="absolute top-2 left-2 text-xs text-muted-foreground/50">
        {SLIDE_LAYOUT_INFO[slide.layout]?.name || slide.layout}
      </div>
    </div>
  );
}

export default SlideEditor;
