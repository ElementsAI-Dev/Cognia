'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
  Image as ImageIcon,
  BarChart3,
  Trash2,
  Upload,
  Link,
  Plus,
  Minus,
  Copy,
  ArrowUpToLine,
  ArrowDownToLine,
  RotateCw,
} from 'lucide-react';
import { ChartElement } from '../elements/chart-element';
import { ChartEditor } from '../elements/chart-editor';
import type { ChartData } from '../elements/chart-element';
import type { SlideElementProps } from '../types';

type ResizeDirection = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

interface DragState {
  isDragging: boolean;
  isResizing: boolean;
  resizeDir: ResizeDirection | null;
  startX: number;
  startY: number;
  startElX: number;
  startElY: number;
  startElW: number;
  startElH: number;
  containerRect: DOMRect | null;
}

/**
 * SlideElement - Individual editable element within a slide
 * Supports drag-to-move, resize handles, and inline editing
 */
export function SlideElement({
  element,
  theme,
  isSelected,
  isEditing,
  onClick,
  onUpdate,
  onDelete,
  onDuplicate,
  onBringToFront,
  onSendToBack,
}: SlideElementProps) {
  const t = useTranslations('pptEditor');
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showImagePopover, setShowImagePopover] = useState(false);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [showChartEditor, setShowChartEditor] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState>({
    isDragging: false,
    isResizing: false,
    resizeDir: null,
    startX: 0,
    startY: 0,
    startElX: 0,
    startElY: 0,
    startElW: 0,
    startElH: 0,
    containerRect: null,
  });

  const elX = element.position?.x || 0;
  const elY = element.position?.y || 0;
  const elW = element.position?.width || 20;
  const elH = element.position?.height || 20;

  const elStyle = element.style;
  const rotation = useMemo(() => parseFloat(elStyle?.transform?.replace(/rotate\(|deg\)/g, '') || '0'), [elStyle]);
  const opacity = useMemo(() => elStyle?.opacity ? parseFloat(elStyle.opacity) * 100 : 100, [elStyle]);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${elX}%`,
    top: `${elY}%`,
    width: `${elW}%`,
    height: `${elH}%`,
    ...element.style,
    // Ensure rotation and opacity are properly applied
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
    opacity: opacity < 100 ? opacity / 100 : undefined,
  };

  // --- Drag & Resize ---
  const getContainerRect = useCallback((): DOMRect | null => {
    const container = elementRef.current?.parentElement;
    return container ? container.getBoundingClientRect() : null;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, mode: 'drag' | 'resize', dir?: ResizeDirection) => {
    if (!isEditing || !isSelected) return;
    e.preventDefault();
    e.stopPropagation();

    const containerRect = getContainerRect();
    if (!containerRect) return;

    const state = dragStateRef.current;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.startElX = elX;
    state.startElY = elY;
    state.startElW = elW;
    state.startElH = elH;
    state.containerRect = containerRect;

    if (mode === 'drag') {
      state.isDragging = true;
      state.isResizing = false;
    } else {
      state.isResizing = true;
      state.isDragging = false;
      state.resizeDir = dir || null;
    }

    const handleMouseMove = (ev: MouseEvent) => {
      const s = dragStateRef.current;
      if (!s.containerRect) return;
      const cw = s.containerRect.width;
      const ch = s.containerRect.height;
      const dx = ((ev.clientX - s.startX) / cw) * 100;
      const dy = ((ev.clientY - s.startY) / ch) * 100;

      if (s.isDragging) {
        const newX = Math.max(0, Math.min(100 - s.startElW, s.startElX + dx));
        const newY = Math.max(0, Math.min(100 - s.startElH, s.startElY + dy));
        onUpdate({
          position: { x: newX, y: newY, width: s.startElW, height: s.startElH },
        });
      } else if (s.isResizing && s.resizeDir) {
        let newX = s.startElX;
        let newY = s.startElY;
        let newW = s.startElW;
        let newH = s.startElH;

        if (s.resizeDir.includes('e')) { newW = Math.max(3, s.startElW + dx); }
        if (s.resizeDir.includes('w')) { newW = Math.max(3, s.startElW - dx); newX = s.startElX + dx; }
        if (s.resizeDir.includes('s')) { newH = Math.max(3, s.startElH + dy); }
        if (s.resizeDir.includes('n')) { newH = Math.max(3, s.startElH - dy); newY = s.startElY + dy; }

        newX = Math.max(0, newX);
        newY = Math.max(0, newY);
        if (newX + newW > 100) newW = 100 - newX;
        if (newY + newH > 100) newH = 100 - newY;

        onUpdate({ position: { x: newX, y: newY, width: newW, height: newH } });
      }
    };

    const handleMouseUp = () => {
      dragStateRef.current.isDragging = false;
      dragStateRef.current.isResizing = false;
      dragStateRef.current.resizeDir = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [isEditing, isSelected, elX, elY, elW, elH, getContainerRect, onUpdate]);

  // --- Image handling ---
  const handleImageUrlSubmit = useCallback(() => {
    if (imageUrlInput.trim()) {
      onUpdate({ content: imageUrlInput.trim() });
      setImageUrlInput('');
      setShowImagePopover(false);
    }
  }, [imageUrlInput, onUpdate]);

  const handleImageFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        onUpdate({ content: dataUrl });
        setShowImagePopover(false);
      }
    };
    reader.readAsDataURL(file);
  }, [onUpdate]);

  // --- Table helpers ---
  const getTableData = useCallback((): string[][] => {
    if (element.metadata?.tableData && Array.isArray(element.metadata.tableData)) {
      return element.metadata.tableData as string[][];
    }
    return [
      ['Header 1', 'Header 2', 'Header 3'],
      ['Cell 1', 'Cell 2', 'Cell 3'],
      ['Cell 4', 'Cell 5', 'Cell 6'],
    ];
  }, [element.metadata]);

  const updateTableCell = useCallback((row: number, col: number, value: string) => {
    const data = getTableData().map(r => [...r]);
    if (data[row]) {
      data[row][col] = value;
      onUpdate({ metadata: { ...element.metadata, tableData: data } });
    }
  }, [getTableData, element.metadata, onUpdate]);

  const addTableRow = useCallback(() => {
    const data = getTableData().map(r => [...r]);
    const cols = data[0]?.length || 3;
    data.push(Array(cols).fill(''));
    onUpdate({ metadata: { ...element.metadata, tableData: data } });
  }, [getTableData, element.metadata, onUpdate]);

  const addTableCol = useCallback(() => {
    const data = getTableData().map(r => [...r, '']);
    onUpdate({ metadata: { ...element.metadata, tableData: data } });
  }, [getTableData, element.metadata, onUpdate]);

  const removeTableRow = useCallback(() => {
    const data = getTableData().map(r => [...r]);
    if (data.length > 1) {
      data.pop();
      onUpdate({ metadata: { ...element.metadata, tableData: data } });
    }
  }, [getTableData, element.metadata, onUpdate]);

  const removeTableCol = useCallback(() => {
    const data = getTableData().map(r => [...r]);
    if (data[0]?.length > 1) {
      const newData = data.map(r => r.slice(0, -1));
      onUpdate({ metadata: { ...element.metadata, tableData: newData } });
    }
  }, [getTableData, element.metadata, onUpdate]);

  const handleContentChange = (value: string) => {
    onUpdate({ content: value });
  };

  const renderContent = () => {
    switch (element.type) {
      case 'text':
        if (isEditingContent && isEditing) {
          return (
            <Textarea
              value={element.content}
              onChange={(e) => handleContentChange(e.target.value)}
              onBlur={() => setIsEditingContent(false)}
              autoFocus
              className="w-full h-full bg-transparent border-none resize-none p-2"
              style={{ fontFamily: theme.bodyFont, color: theme.textColor }}
            />
          );
        }
        return (
          <div
            className="w-full h-full p-2 overflow-hidden"
            style={{ fontFamily: theme.bodyFont, color: theme.textColor }}
            onDoubleClick={() => isEditing && setIsEditingContent(true)}
          >
            {element.content}
          </div>
        );

      case 'image':
        return (
          <div className="w-full h-full flex items-center justify-center bg-muted/30 rounded">
            {element.content ? (
              <div className="relative w-full h-full group/img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={element.content}
                  alt={t('slideElementAlt')}
                  className="w-full h-full object-contain"
                />
                {isEditing && (
                  <Popover open={showImagePopover} onOpenChange={setShowImagePopover}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-1 right-1 opacity-0 group-hover/img:opacity-100 transition-opacity h-7 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t('changeImage') || 'Change'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium flex items-center gap-1">
                            <Link className="h-3 w-3" />
                            {t('imageUrl') || 'Image URL'}
                          </label>
                          <div className="flex gap-1.5">
                            <Input
                              value={imageUrlInput}
                              onChange={(e) => setImageUrlInput(e.target.value)}
                              placeholder="https://..."
                              className="h-8 text-xs"
                              onKeyDown={(e) => e.key === 'Enter' && handleImageUrlSubmit()}
                            />
                            <Button size="sm" className="h-8" onClick={handleImageUrlSubmit}>OK</Button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium flex items-center gap-1">
                            <Upload className="h-3 w-3" />
                            {t('uploadImage') || 'Upload'}
                          </label>
                          <Input
                            type="file"
                            accept="image/*"
                            className="h-8 text-xs"
                            onChange={handleImageFileUpload}
                          />
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            ) : (
              <Popover open={showImagePopover} onOpenChange={setShowImagePopover}>
                <PopoverTrigger asChild>
                  <button
                    className="text-center text-muted-foreground hover:text-foreground transition-colors p-4"
                    onClick={(e) => { e.stopPropagation(); setShowImagePopover(true); }}
                  >
                    <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                    <span className="text-sm">{t('clickToAddImage')}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72" onClick={(e) => e.stopPropagation()}>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium flex items-center gap-1">
                        <Link className="h-3 w-3" />
                        {t('imageUrl') || 'Image URL'}
                      </label>
                      <div className="flex gap-1.5">
                        <Input
                          value={imageUrlInput}
                          onChange={(e) => setImageUrlInput(e.target.value)}
                          placeholder="https://..."
                          className="h-8 text-xs"
                          onKeyDown={(e) => e.key === 'Enter' && handleImageUrlSubmit()}
                        />
                        <Button size="sm" className="h-8" onClick={handleImageUrlSubmit}>OK</Button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium flex items-center gap-1">
                        <Upload className="h-3 w-3" />
                        {t('uploadImage') || 'Upload'}
                      </label>
                      <Input
                        type="file"
                        accept="image/*"
                        className="h-8 text-xs"
                        onChange={handleImageFileUpload}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        );

      case 'shape': {
        const shapeType = (element.metadata?.shape as string) || 'rectangle';
        return (
          <div
            className="w-full h-full"
            style={{
              backgroundColor: element.style?.backgroundColor || theme.primaryColor,
              borderRadius: shapeType === 'circle' ? '50%' : shapeType === 'rounded' ? '8px' : '0',
            }}
          />
        );
      }

      case 'chart':
        return (
          <>
            {element.metadata?.chartData ? (
              <div
                className="w-full h-full cursor-pointer"
                onDoubleClick={() => isEditing && setShowChartEditor(true)}
              >
                <ChartElement
                  type={element.metadata?.chartType as string}
                  data={element.metadata?.chartData as { labels: string[]; values: number[] }}
                  theme={theme}
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div
                className="w-full h-full flex items-center justify-center bg-muted/30 rounded border border-dashed cursor-pointer"
                onDoubleClick={() => isEditing && setShowChartEditor(true)}
              >
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                  <span className="text-sm">{String(element.metadata?.chartType || t('chartPlaceholder'))}</span>
                </div>
              </div>
            )}
            <ChartEditor
              open={showChartEditor}
              onOpenChange={setShowChartEditor}
              chartType={element.metadata?.chartType as string}
              chartData={element.metadata?.chartData as ChartData | undefined}
              onSave={(chartType, chartData) => {
                onUpdate({
                  metadata: { ...element.metadata, chartType, chartData },
                });
              }}
            />
          </>
        );

      case 'table': {
        const tableData = getTableData();
        return (
          <div className="w-full h-full overflow-auto p-1">
            <table className="w-full border-collapse text-xs" style={{ color: theme.textColor }}>
              <tbody>
                {tableData.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={cn(
                          'border px-1.5 py-1',
                          ri === 0 && 'font-semibold',
                          editingCell?.row === ri && editingCell?.col === ci && 'p-0'
                        )}
                        style={{
                          borderColor: theme.primaryColor + '40',
                          backgroundColor: ri === 0 ? theme.primaryColor + '15' : 'transparent',
                        }}
                        onDoubleClick={() => isEditing && setEditingCell({ row: ri, col: ci })}
                      >
                        {editingCell?.row === ri && editingCell?.col === ci && isEditing ? (
                          <input
                            autoFocus
                            className="w-full h-full bg-transparent outline-none px-1.5 py-1 text-xs"
                            value={cell}
                            onChange={(e) => updateTableCell(ri, ci, e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
                          />
                        ) : (
                          cell
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {isEditing && isSelected && (
              <div className="flex items-center gap-1 mt-1 justify-end">
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); addTableRow(); }}>
                  <Plus className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); removeTableRow(); }}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-[10px] text-muted-foreground mx-0.5">|</span>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); addTableCol(); }}>
                  <Plus className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); removeTableCol(); }}>
                  <Minus className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        );
      }

      case 'code':
        if (isEditingContent && isEditing) {
          return (
            <Textarea
              value={element.content || ''}
              onChange={(e) => handleContentChange(e.target.value)}
              onBlur={() => setIsEditingContent(false)}
              autoFocus
              className="w-full h-full bg-black/90 text-green-400 border-none resize-none p-3 text-sm"
              style={{ fontFamily: theme.codeFont }}
            />
          );
        }
        return (
          <pre
            className="w-full h-full p-3 bg-black/90 text-green-400 rounded overflow-auto text-sm"
            style={{ fontFamily: theme.codeFont }}
            onDoubleClick={() => isEditing && setIsEditingContent(true)}
          >
            <code>{element.content || t('codePlaceholder')}</code>
          </pre>
        );

      default:
        return (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            {t('unknownElement')}
          </div>
        );
    }
  };

  return (
    <div
      ref={elementRef}
      style={style}
      className={cn(
        'group',
        isSelected && isEditing ? 'ring-2 ring-primary ring-offset-1' : isSelected ? 'ring-1 ring-primary/50' : '',
        isEditing && isSelected ? 'cursor-move' : 'cursor-pointer'
      )}
      onClick={onClick}
      onMouseDown={(e) => {
        if (isEditing && isSelected && !isEditingContent && !showImagePopover && editingCell === null) {
          handleMouseDown(e, 'drag');
        }
      }}
    >
      {renderContent()}
      
      {/* Selection handles */}
      {isSelected && isEditing && (
        <>
          {/* Corner resize handles */}
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-primary border-2 border-background rounded-sm cursor-nw-resize z-10"
            onMouseDown={(e) => handleMouseDown(e, 'resize', 'nw')} />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-primary border-2 border-background rounded-sm cursor-ne-resize z-10"
            onMouseDown={(e) => handleMouseDown(e, 'resize', 'ne')} />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-primary border-2 border-background rounded-sm cursor-sw-resize z-10"
            onMouseDown={(e) => handleMouseDown(e, 'resize', 'sw')} />
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-primary border-2 border-background rounded-sm cursor-se-resize z-10"
            onMouseDown={(e) => handleMouseDown(e, 'resize', 'se')} />
          {/* Edge resize handles */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-primary/80 rounded-sm cursor-n-resize z-10"
            onMouseDown={(e) => handleMouseDown(e, 'resize', 'n')} />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-primary/80 rounded-sm cursor-s-resize z-10"
            onMouseDown={(e) => handleMouseDown(e, 'resize', 's')} />
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-4 bg-primary/80 rounded-sm cursor-w-resize z-10"
            onMouseDown={(e) => handleMouseDown(e, 'resize', 'w')} />
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-4 bg-primary/80 rounded-sm cursor-e-resize z-10"
            onMouseDown={(e) => handleMouseDown(e, 'resize', 'e')} />
          
          {/* Element context toolbar */}
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-background border rounded-md shadow-md px-1 py-0.5 opacity-0 group-hover:opacity-100 z-20 transition-opacity">
            <TooltipProvider delayDuration={200}>
              {/* Duplicate */}
              {onDuplicate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">{t('duplicate') || 'Duplicate'}</TooltipContent>
                </Tooltip>
              )}

              {/* Bring to front */}
              {onBringToFront && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onBringToFront(); }}>
                      <ArrowUpToLine className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">{t('bringToFront') || 'Front'}</TooltipContent>
                </Tooltip>
              )}

              {/* Send to back */}
              {onSendToBack && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onSendToBack(); }}>
                      <ArrowDownToLine className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">{t('sendToBack') || 'Back'}</TooltipContent>
                </Tooltip>
              )}

              {/* Rotation control */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                    <RotateCw className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-3" side="top" onClick={(e) => e.stopPropagation()}>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{t('rotation') || 'Rotation'}</span>
                        <span className="text-xs text-muted-foreground">{rotation}°</span>
                      </div>
                      <Slider
                        value={[rotation]}
                        min={0}
                        max={360}
                        step={15}
                        onValueChange={([v]) => onUpdate({ style: { ...element.style, transform: `rotate(${v}deg)` } })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{t('opacity') || 'Opacity'}</span>
                        <span className="text-xs text-muted-foreground">{Math.round(opacity)}%</span>
                      </div>
                      <Slider
                        value={[opacity]}
                        min={10}
                        max={100}
                        step={5}
                        onValueChange={([v]) => onUpdate({ style: { ...element.style, opacity: String(v / 100) } })}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Delete */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">{t('deleteElement')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </>
      )}
    </div>
  );
}

export default SlideElement;
