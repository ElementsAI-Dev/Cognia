'use client';

/**
 * CustomEdge - Advanced edge component with editable labels, animations, and validation
 */

import { memo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Edit2, Check, Zap, AlertTriangle } from 'lucide-react';
import { useWorkflowEditorStore } from '@/stores/workflow';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/utils';

export interface CustomEdgeData {
  [key: string]: unknown;
  label?: string;
  animated?: boolean;
  condition?: string;
  conditionValue?: boolean | string;
  edgeType?: 'default' | 'success' | 'failure' | 'conditional';
  priority?: number;
  isValid?: boolean;
  validationMessage?: string;
}

const EDGE_STYLES = {
  default: {
    stroke: 'hsl(var(--muted-foreground))',
    strokeWidth: 2,
  },
  success: {
    stroke: '#22c55e',
    strokeWidth: 2,
  },
  failure: {
    stroke: '#ef4444',
    strokeWidth: 2,
  },
  conditional: {
    stroke: '#f59e0b',
    strokeWidth: 2,
    strokeDasharray: '5 5',
  },
  selected: {
    stroke: 'hsl(var(--primary))',
    strokeWidth: 3,
  },
  invalid: {
    stroke: '#ef4444',
    strokeWidth: 2,
    strokeDasharray: '3 3',
  },
};

function CustomEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
  markerEnd,
  style,
}: EdgeProps) {
  const t = useTranslations('workflowEditor');
  const edgeData = (data || {}) as CustomEdgeData;
  const { deleteEdge, updateEdge } = useWorkflowEditorStore(
    useShallow((state) => ({
      deleteEdge: state.deleteEdge,
      updateEdge: state.updateEdge,
    }))
  );
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelText, setLabelText] = useState(edgeData.label || '');
  const [showPopover, setShowPopover] = useState(false);

  // Auto-derive display label for conditional edges (True/False branches)
  const displayLabel = edgeData.label
    || (edgeData.conditionValue === true ? t('true') : undefined)
    || (edgeData.conditionValue === false ? t('false') : undefined)
    || (edgeData.edgeType === 'success' ? '✓' : undefined)
    || (edgeData.edgeType === 'failure' ? '✗' : undefined);

  // Double-click to enter inline label editing
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingLabel(true);
  }, []);

  // Use smooth step path for better visualization
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    deleteEdge(id);
  }, [id, deleteEdge]);

  const handleLabelSave = useCallback(() => {
    updateEdge(id, { label: labelText.trim() || undefined });
    setIsEditingLabel(false);
  }, [id, labelText, updateEdge]);

  const handleEdgeTypeChange = useCallback((type: string) => {
    updateEdge(id, { edgeType: type as CustomEdgeData['edgeType'] });
  }, [id, updateEdge]);

  const handleAnimatedToggle = useCallback(() => {
    updateEdge(id, { animated: !edgeData.animated });
  }, [id, edgeData.animated, updateEdge]);

  // Determine edge style
  const getEdgeStyle = () => {
    if (edgeData.isValid === false) return EDGE_STYLES.invalid;
    if (selected) return EDGE_STYLES.selected;
    if (edgeData.edgeType && EDGE_STYLES[edgeData.edgeType]) {
      return EDGE_STYLES[edgeData.edgeType];
    }
    return EDGE_STYLES.default;
  };

  const currentStyle = getEdgeStyle();

  return (
    <>
      {/* Animated glow effect for running edges */}
      {edgeData.animated && (
        <BaseEdge
          id={`${id}-glow`}
          path={edgePath}
          style={{
            stroke: currentStyle.stroke,
            strokeWidth: 6,
            opacity: 0.3,
            filter: 'blur(3px)',
          }}
          className="animate-pulse"
        />
      )}

      {/* Main edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...currentStyle,
          ...style,
          transition: 'stroke 0.2s, stroke-width 0.2s',
        }}
        className={cn(
          'transition-all duration-200',
          edgeData.animated && 'animate-[dash_1s_linear_infinite]'
        )}
      />

      {/* Animated particles for data flow visualization */}
      {edgeData.animated && (
        <circle r="4" fill={currentStyle.stroke}>
          <animateMotion dur="1.5s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

      {/* Edge label and controls */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {/* Label display/edit */}
          {isEditingLabel ? (
            <div className="flex items-center gap-1 bg-background border rounded-md shadow-md p-1">
              <Input
                value={labelText}
                onChange={(e) => setLabelText(e.target.value)}
                className="h-6 w-24 text-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLabelSave();
                  if (e.key === 'Escape') {
                    setLabelText(edgeData.label || '');
                    setIsEditingLabel(false);
                  }
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={handleLabelSave}
              >
                <Check className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Popover open={showPopover} onOpenChange={setShowPopover}>
              <PopoverTrigger asChild>
                <div
                  className={cn(
                    'cursor-pointer transition-all duration-200',
                    selected || showPopover ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                  )}
                  onDoubleClick={handleDoubleClick}
                >
                  {displayLabel ? (
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-xs font-medium shadow-sm border',
                        edgeData.edgeType === 'success' && 'border-green-500 bg-green-500/10 text-green-600',
                        edgeData.edgeType === 'failure' && 'border-red-500 bg-red-500/10 text-red-600',
                        edgeData.edgeType === 'conditional' && 'border-yellow-500 bg-yellow-500/10 text-yellow-600',
                        edgeData.conditionValue === true && 'border-green-500 bg-green-500/10 text-green-600',
                        edgeData.conditionValue === false && 'border-red-500 bg-red-500/10 text-red-600',
                        edgeData.isValid === false && 'border-red-500 bg-red-500/10'
                      )}
                    >
                      {edgeData.animated && <Zap className="h-3 w-3 mr-1" />}
                      {edgeData.isValid === false && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {displayLabel}
                    </Badge>
                  ) : selected ? (
                    <div className="h-6 w-6 rounded-full bg-background border-2 border-primary flex items-center justify-center cursor-pointer hover:bg-accent">
                      <Edit2 className="h-3 w-3" />
                    </div>
                  ) : null}
                </div>
              </PopoverTrigger>

              <PopoverContent className="w-56 p-3" side="top">
                <div className="space-y-3">
                  <div className="text-xs font-medium">{t('edgeSettings')}</div>
                  
                  {/* Label */}
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">{t('label')}</label>
                    <div className="flex gap-1">
                      <Input
                        value={labelText}
                        onChange={(e) => setLabelText(e.target.value)}
                        placeholder="Add label..."
                        className="h-7 text-xs"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          handleLabelSave();
                          setShowPopover(false);
                        }}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Edge Type */}
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">{t('variableType')}</label>
                    <Select
                      value={edgeData.edgeType || 'default'}
                      onValueChange={handleEdgeTypeChange}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="success">Success (Green)</SelectItem>
                        <SelectItem value="failure">Failure (Red)</SelectItem>
                        <SelectItem value="conditional">Conditional (Yellow)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Animated toggle */}
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">Animate flow</label>
                    <Button
                      variant={edgeData.animated ? 'default' : 'outline'}
                      size="sm"
                      className="h-6 text-xs"
                      onClick={handleAnimatedToggle}
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      {edgeData.animated ? 'On' : 'Off'}
                    </Button>
                  </div>

                  {/* Validation message */}
                  {edgeData.isValid === false && edgeData.validationMessage && (
                    <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                      <AlertTriangle className="h-3 w-3 inline mr-1" />
                      {edgeData.validationMessage}
                    </div>
                  )}

                  {/* Delete button */}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={(e) => {
                      handleDelete(e);
                      setShowPopover(false);
                    }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    {t('deleteEdge')}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const CustomEdge = memo(CustomEdgeComponent);
export default CustomEdge;
