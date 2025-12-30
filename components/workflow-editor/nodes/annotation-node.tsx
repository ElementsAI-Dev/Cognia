'use client';

/**
 * AnnotationNode - Text annotation/sticky note for workflow documentation
 */

import { memo, useState, useCallback } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Trash2,
  Palette,
  Copy,
  StickyNote,
  Check,
} from 'lucide-react';
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store';

export interface AnnotationNodeData {
  [key: string]: unknown;
  label: string;
  content: string;
  nodeType: 'annotation';
  color: string;
  fontSize: 'small' | 'medium' | 'large';
  showBorder: boolean;
}

const ANNOTATION_COLORS = [
  { name: 'Yellow', value: '#fef08a', textColor: '#713f12' },
  { name: 'Blue', value: '#bfdbfe', textColor: '#1e3a8a' },
  { name: 'Green', value: '#bbf7d0', textColor: '#14532d' },
  { name: 'Pink', value: '#fbcfe8', textColor: '#831843' },
  { name: 'Purple', value: '#ddd6fe', textColor: '#4c1d95' },
  { name: 'Orange', value: '#fed7aa', textColor: '#7c2d12' },
  { name: 'Gray', value: '#e5e7eb', textColor: '#1f2937' },
  { name: 'White', value: '#ffffff', textColor: '#374151' },
];

const FONT_SIZES = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base',
};

function AnnotationNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as AnnotationNodeData;
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(nodeData.content || '');
  const { updateNode, deleteNode, duplicateNode } = useWorkflowEditorStore();

  const currentColor = ANNOTATION_COLORS.find(c => c.value === nodeData.color) || ANNOTATION_COLORS[0];

  const handleContentSave = useCallback(() => {
    updateNode(id, { content });
    setIsEditing(false);
  }, [id, content, updateNode]);

  const handleColorChange = useCallback((color: string) => {
    updateNode(id, { color });
  }, [id, updateNode]);

  const handleFontSizeChange = useCallback((fontSize: 'small' | 'medium' | 'large') => {
    updateNode(id, { fontSize });
  }, [id, updateNode]);

  const handleToggleBorder = useCallback(() => {
    updateNode(id, { showBorder: !nodeData.showBorder });
  }, [id, nodeData.showBorder, updateNode]);

  const handleDelete = useCallback(() => {
    deleteNode(id);
  }, [id, deleteNode]);

  const handleDuplicate = useCallback(() => {
    duplicateNode(id);
  }, [id, duplicateNode]);

  return (
    <>
      <NodeResizer
        minWidth={150}
        minHeight={80}
        isVisible={selected}
        lineClassName="border-primary"
        handleClassName="h-3 w-3 bg-primary border-2 border-background rounded"
      />
      
      <div
        className={cn(
          'rounded-lg transition-all duration-200 min-w-[150px] min-h-[80px] h-full',
          selected && 'ring-2 ring-primary ring-offset-2',
          nodeData.showBorder && 'border-2'
        )}
        style={{
          backgroundColor: nodeData.color || ANNOTATION_COLORS[0].value,
          borderColor: nodeData.showBorder ? currentColor.textColor + '40' : 'transparent',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-1">
            <StickyNote className="h-3 w-3" style={{ color: currentColor.textColor }} />
            <span 
              className="text-xs font-medium"
              style={{ color: currentColor.textColor }}
            >
              Note
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 opacity-60 hover:opacity-100"
              >
                <MoreHorizontal className="h-3 w-3" style={{ color: currentColor.textColor }} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {/* Font size */}
              <div className="px-2 py-1.5">
                <div className="text-xs font-medium mb-2">Font Size</div>
                <div className="flex gap-1">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <Button
                      key={size}
                      variant={nodeData.fontSize === size ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-xs flex-1"
                      onClick={() => handleFontSizeChange(size)}
                    >
                      {size.charAt(0).toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
              
              <DropdownMenuSeparator />
              
              {/* Color picker */}
              <div className="px-2 py-1.5">
                <div className="text-xs font-medium mb-2 flex items-center gap-1">
                  <Palette className="h-3 w-3" />
                  Color
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {ANNOTATION_COLORS.map((color) => (
                    <button
                      key={color.value}
                      className={cn(
                        'h-6 w-6 rounded-md border-2 transition-transform hover:scale-110',
                        nodeData.color === color.value ? 'border-foreground' : 'border-transparent'
                      )}
                      style={{ backgroundColor: color.value }}
                      onClick={() => handleColorChange(color.value)}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleToggleBorder}>
                <Check className={cn("h-4 w-4 mr-2", !nodeData.showBorder && "opacity-0")} />
                Show Border
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        <div className="px-2 pb-2 h-[calc(100%-28px)]">
          {isEditing ? (
            <div className="h-full flex flex-col gap-1">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={cn(
                  'flex-1 resize-none border-none bg-transparent p-0 focus-visible:ring-0',
                  FONT_SIZES[nodeData.fontSize || 'medium']
                )}
                style={{ color: currentColor.textColor }}
                placeholder="Add your note..."
                autoFocus
                onBlur={handleContentSave}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setContent(nodeData.content || '');
                    setIsEditing(false);
                  }
                }}
              />
            </div>
          ) : (
            <div
              className={cn(
                'h-full cursor-text whitespace-pre-wrap break-words',
                FONT_SIZES[nodeData.fontSize || 'medium'],
                !content && 'text-opacity-50 italic'
              )}
              style={{ color: currentColor.textColor }}
              onDoubleClick={() => setIsEditing(true)}
            >
              {content || 'Double-click to edit...'}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export const AnnotationNode = memo(AnnotationNodeComponent);
export default AnnotationNode;
