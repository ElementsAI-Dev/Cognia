'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Image as ImageIcon,
  BarChart3,
  Table,
  Trash2,
} from 'lucide-react';
import type { SlideElementProps } from '../types';

/**
 * SlideElement - Individual editable element within a slide
 */
export function SlideElement({
  element,
  theme,
  isSelected,
  isEditing,
  onClick,
  onUpdate,
  onDelete,
}: SlideElementProps) {
  const [isEditingContent, setIsEditingContent] = useState(false);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${element.position?.x || 0}%`,
    top: `${element.position?.y || 0}%`,
    width: `${element.position?.width || 20}%`,
    height: `${element.position?.height || 20}%`,
    ...element.style,
  };

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
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={element.content}
                alt="Slide element"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                <span className="text-sm">Click to add image</span>
              </div>
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
          <div className="w-full h-full flex items-center justify-center bg-muted/30 rounded border border-dashed">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-8 w-8 mx-auto mb-2" />
              <span className="text-sm">{String(element.metadata?.chartType || 'Chart')}</span>
            </div>
          </div>
        );

      case 'table':
        return (
          <div className="w-full h-full flex items-center justify-center bg-muted/30 rounded border border-dashed">
            <div className="text-center text-muted-foreground">
              <Table className="h-8 w-8 mx-auto mb-2" />
              <span className="text-sm">Table</span>
            </div>
          </div>
        );

      case 'code':
        return (
          <pre
            className="w-full h-full p-3 bg-black/90 text-green-400 rounded overflow-auto text-sm"
            style={{ fontFamily: theme.codeFont }}
          >
            <code>{element.content || '// Code here'}</code>
          </pre>
        );

      default:
        return (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            Unknown element
          </div>
        );
    }
  };

  return (
    <div
      style={style}
      className={cn(
        'group cursor-move',
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      onClick={onClick}
    >
      {renderContent()}
      
      {/* Selection handles */}
      {isSelected && isEditing && (
        <>
          {/* Resize handles */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-primary rounded-full cursor-nw-resize" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full cursor-ne-resize" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-primary rounded-full cursor-sw-resize" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-primary rounded-full cursor-se-resize" />
          
          {/* Delete button */}
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-3 -right-3 h-6 w-6 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  );
}

export default SlideElement;
