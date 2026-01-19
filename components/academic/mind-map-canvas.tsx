'use client';

/**
 * MindMapCanvas - Interactive mind map visualization component
 * Renders knowledge maps as visual mind maps with navigation and annotation support
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  RotateCcw,
  Eye,
  EyeOff,
  Search,
  Link2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type {
  MindMapData,
  MindMapNode,
  MindMapTheme,
  KnowledgeMapLocation,
} from '@/types/learning/knowledge-map';
import { DEFAULT_MIND_MAP_THEME } from '@/types/learning/knowledge-map';

interface MindMapCanvasProps {
  data: MindMapData;
  onNodeClick?: (node: MindMapNode) => void;
  onNodeDoubleClick?: (node: MindMapNode) => void;
  onLocationNavigate?: (location: KnowledgeMapLocation) => void;
  onExport?: (format: 'svg' | 'png' | 'json') => void;
  className?: string;
  readOnly?: boolean;
  showMinimap?: boolean;
  showControls?: boolean;
  theme?: MindMapTheme;
}

interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  isDragging: boolean;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  searchQuery: string;
  showLabels: boolean;
  highlightedNodes: Set<string>;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const NODE_PADDING = 16;
const NODE_MIN_WIDTH = 120;
const NODE_HEIGHT = 40;
const LEVEL_GAP_X = 200;
const LEVEL_GAP_Y = 80;

export function MindMapCanvas({
  data,
  onNodeClick,
  onNodeDoubleClick,
  onLocationNavigate,
  onExport,
  className,
  readOnly: _readOnly = false,
  showMinimap = true,
  showControls = true,
  theme = DEFAULT_MIND_MAP_THEME,
}: MindMapCanvasProps) {
  const t = useTranslations('academic.mindMap');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [state, setState] = useState<CanvasState>({
    zoom: 1,
    panX: 0,
    panY: 0,
    isDragging: false,
    selectedNodeId: null,
    hoveredNodeId: null,
    searchQuery: '',
    showLabels: true,
    highlightedNodes: new Set(),
  });

  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [nodePositions, setNodePositions] = useState<
    Map<string, { x: number; y: number; width: number; height: number }>
  >(new Map());

  const flatNodes = useMemo(() => {
    const result: MindMapNode[] = [];
    const flatten = (node: MindMapNode) => {
      result.push(node);
      node.children?.forEach(flatten);
    };
    data.nodes.forEach(flatten);
    return result;
  }, [data.nodes]);

  const calculateLayout = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      const positions = new Map<string, { x: number; y: number; width: number; height: number }>();
      if (!canvas) return positions;

      const ctx = canvas.getContext('2d');
      if (!ctx) return positions;

      ctx.font = '14px Inter, system-ui, sans-serif';

      const measureNode = (node: MindMapNode): number => {
        const textWidth = ctx.measureText(node.label).width;
        return Math.max(NODE_MIN_WIDTH, textWidth + NODE_PADDING * 2);
      };

      const rootNode = data.nodes.find((n) => n.id === data.rootId);
      if (!rootNode) return positions;

      const layoutTree = (
        node: MindMapNode,
        x: number,
        y: number,
        _level: number
      ): { minY: number; maxY: number } => {
        const width = measureNode(node);
        const height = NODE_HEIGHT;

        if (!node.children || node.children.length === 0) {
          positions.set(node.id, { x, y, width, height });
          return { minY: y, maxY: y + height };
        }

        let currentY = y;
        let minY = Infinity;
        let maxY = -Infinity;

        for (const child of node.children) {
          const childResult = layoutTree(child, x + LEVEL_GAP_X, currentY, _level + 1);
          minY = Math.min(minY, childResult.minY);
          maxY = Math.max(maxY, childResult.maxY);
          currentY = childResult.maxY + LEVEL_GAP_Y;
        }

        const nodeY = (minY + maxY) / 2 - height / 2;
        positions.set(node.id, { x, y: nodeY, width, height });

        return { minY, maxY };
      };

      layoutTree(rootNode, 100, 100, 0);

      return positions;
    },
    [data.nodes, data.rootId]
  );

  useEffect(() => {
    const positions = calculateLayout(canvasRef.current);
    setNodePositions(positions);
  }, [calculateLayout]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(state.panX, state.panY);
    ctx.scale(state.zoom, state.zoom);

    data.edges.forEach((edge) => {
      const sourcePos = nodePositions.get(edge.source);
      const targetPos = nodePositions.get(edge.target);
      if (!sourcePos || !targetPos) return;

      ctx.beginPath();
      ctx.strokeStyle = edge.style?.strokeColor || theme.edgeColor;
      ctx.lineWidth = edge.style?.strokeWidth || 2;

      const startX = sourcePos.x + sourcePos.width;
      const startY = sourcePos.y + sourcePos.height / 2;
      const endX = targetPos.x;
      const endY = targetPos.y + targetPos.height / 2;

      const controlX1 = startX + (endX - startX) * 0.5;
      const controlY1 = startY;
      const controlX2 = startX + (endX - startX) * 0.5;
      const controlY2 = endY;

      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(controlX1, controlY1, controlX2, controlY2, endX, endY);
      ctx.stroke();
    });

    flatNodes.forEach((node) => {
      const pos = nodePositions.get(node.id);
      if (!pos) return;

      const isSelected = state.selectedNodeId === node.id;
      const isHovered = state.hoveredNodeId === node.id;
      const isHighlighted = state.highlightedNodes.has(node.id);

      const bgColor =
        node.style?.backgroundColor || theme.nodeColors[node.type] || theme.nodeColors.detail;
      const borderColor = isSelected
        ? '#3b82f6'
        : isHovered
          ? '#60a5fa'
          : node.style?.borderColor || bgColor;

      ctx.fillStyle = bgColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = isSelected ? 3 : isHovered ? 2 : 1;

      const radius = 8;
      ctx.beginPath();
      ctx.roundRect(pos.x, pos.y, pos.width, pos.height, radius);
      ctx.fill();
      ctx.stroke();

      if (isHighlighted) {
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      if (state.showLabels) {
        ctx.fillStyle = node.style?.textColor || '#ffffff';
        ctx.font = `${node.style?.fontWeight || 'normal'} ${node.style?.fontSize || 14}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.label, pos.x + pos.width / 2, pos.y + pos.height / 2);
      }

      if (node.type === 'figure') {
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Inter, system-ui, sans-serif';
        ctx.fillText('📊', pos.x + 8, pos.y + pos.height / 2);
      } else if (node.type === 'table') {
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Inter, system-ui, sans-serif';
        ctx.fillText('📋', pos.x + 8, pos.y + pos.height / 2);
      } else if (node.type === 'equation') {
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Inter, system-ui, sans-serif';
        ctx.fillText('∑', pos.x + 8, pos.y + pos.height / 2);
      }

      if (node.pageNumber) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`p.${node.pageNumber}`, pos.x + pos.width - 4, pos.y + pos.height - 4);
      }
    });

    ctx.restore();
  }, [data.edges, flatNodes, nodePositions, state, theme]);

  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [draw]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - state.panX) / state.zoom;
      const y = (e.clientY - rect.top - state.panY) / state.zoom;

      let clickedNode: MindMapNode | null = null;
      for (const node of flatNodes) {
        const pos = nodePositions.get(node.id);
        if (pos && x >= pos.x && x <= pos.x + pos.width && y >= pos.y && y <= pos.y + pos.height) {
          clickedNode = node;
          break;
        }
      }

      if (clickedNode) {
        setState((prev) => ({ ...prev, selectedNodeId: clickedNode!.id }));
        onNodeClick?.(clickedNode);
      } else {
        setState((prev) => ({ ...prev, isDragging: true, selectedNodeId: null }));
        setDragStart({ x: e.clientX - state.panX, y: e.clientY - state.panY });
      }
    },
    [flatNodes, nodePositions, state.panX, state.panY, state.zoom, onNodeClick]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (state.isDragging) {
        setState((prev) => ({
          ...prev,
          panX: e.clientX - dragStart.x,
          panY: e.clientY - dragStart.y,
        }));
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - state.panX) / state.zoom;
      const y = (e.clientY - rect.top - state.panY) / state.zoom;

      let hoveredNode: MindMapNode | null = null;
      for (const node of flatNodes) {
        const pos = nodePositions.get(node.id);
        if (pos && x >= pos.x && x <= pos.x + pos.width && y >= pos.y && y <= pos.y + pos.height) {
          hoveredNode = node;
          break;
        }
      }

      setState((prev) => ({
        ...prev,
        hoveredNodeId: hoveredNode?.id || null,
      }));

      canvas.style.cursor = hoveredNode ? 'pointer' : state.isDragging ? 'grabbing' : 'grab';
    },
    [dragStart, flatNodes, nodePositions, state.isDragging, state.panX, state.panY, state.zoom]
  );

  const handleMouseUp = useCallback(() => {
    setState((prev) => ({ ...prev, isDragging: false }));
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - state.panX) / state.zoom;
      const y = (e.clientY - rect.top - state.panY) / state.zoom;

      for (const node of flatNodes) {
        const pos = nodePositions.get(node.id);
        if (pos && x >= pos.x && x <= pos.x + pos.width && y >= pos.y && y <= pos.y + pos.height) {
          onNodeDoubleClick?.(node);
          break;
        }
      }
    },
    [flatNodes, nodePositions, state.panX, state.panY, state.zoom, onNodeDoubleClick]
  );

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setState((prev) => ({
      ...prev,
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom + delta)),
    }));
  }, []);

  const handleZoomIn = () => {
    setState((prev) => ({ ...prev, zoom: Math.min(MAX_ZOOM, prev.zoom + ZOOM_STEP) }));
  };

  const handleZoomOut = () => {
    setState((prev) => ({ ...prev, zoom: Math.max(MIN_ZOOM, prev.zoom - ZOOM_STEP) }));
  };

  const handleResetView = () => {
    setState((prev) => ({ ...prev, zoom: 1, panX: 0, panY: 0 }));
  };

  const handleFitView = () => {
    const canvas = canvasRef.current;
    if (!canvas || nodePositions.size === 0) return;

    const positions = Array.from(nodePositions.values());
    const minX = Math.min(...positions.map((p) => p.x));
    const maxX = Math.max(...positions.map((p) => p.x + p.width));
    const minY = Math.min(...positions.map((p) => p.y));
    const maxY = Math.max(...positions.map((p) => p.y + p.height));

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const { width, height } = canvas.getBoundingClientRect();

    const scaleX = (width - 100) / contentWidth;
    const scaleY = (height - 100) / contentHeight;
    const zoom = Math.min(scaleX, scaleY, 1);

    const panX = (width - contentWidth * zoom) / 2 - minX * zoom;
    const panY = (height - contentHeight * zoom) / 2 - minY * zoom;

    setState((prev) => ({ ...prev, zoom, panX, panY }));
  };

  const handleSearch = (query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query }));

    if (!query) {
      setState((prev) => ({ ...prev, highlightedNodes: new Set() }));
      return;
    }

    const matches = new Set<string>();
    flatNodes.forEach((node) => {
      if (
        node.label.toLowerCase().includes(query.toLowerCase()) ||
        node.description?.toLowerCase().includes(query.toLowerCase())
      ) {
        matches.add(node.id);
      }
    });

    setState((prev) => ({ ...prev, highlightedNodes: matches }));
  };

  const handleExport = (format: 'svg' | 'png' | 'json') => {
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mindmap.json';
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'png' && canvasRef.current) {
      const url = canvasRef.current.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mindmap.png';
      a.click();
    }
    onExport?.(format);
  };

  const selectedNode = flatNodes.find((n) => n.id === state.selectedNodeId);

  return (
    <div
      ref={containerRef}
      className={cn('relative flex flex-col h-full bg-background', className)}
      data-testid="mind-map-canvas"
    >
      {showControls && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <TooltipProvider>
            <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg border p-1 shadow-sm">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleZoomOut}
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('zoomOut')}</TooltipContent>
              </Tooltip>
              <span className="text-xs text-muted-foreground px-2 min-w-[50px] text-center">
                {Math.round(state.zoom * 100)}%
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleZoomIn}
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('zoomIn')}</TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg border p-1 shadow-sm">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleResetView}
                    aria-label="Reset view"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('resetView')}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleFitView}
                    aria-label="Fit to view"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('fitView')}</TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg border p-1 shadow-sm">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setState((prev) => ({ ...prev, showLabels: !prev.showLabels }))}
                    aria-label={state.showLabels ? 'Hide labels' : 'Show labels'}
                  >
                    {state.showLabels ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {state.showLabels ? t('hideLabels') : t('showLabels')}
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      )}

      {showControls && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchNodes')}
              value={state.searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 w-48 h-8 bg-background/80 backdrop-blur-sm"
            />
            {state.searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => handleSearch('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="bg-background/80 backdrop-blur-sm">
                <Download className="h-4 w-4 mr-2" />
                {t('export')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('png')}>
                {t('exportPNG')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('svg')}>
                {t('exportSVG')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('json')}>
                {t('exportJSON')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {state.highlightedNodes.size > 0 && (
        <div className="absolute top-16 right-4 z-10">
          <Badge variant="secondary">
            {state.highlightedNodes.size} {t('matchesFound')}
          </Badge>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="flex-1 w-full cursor-grab"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      />

      {selectedNode && (
        <Sheet
          open={!!selectedNode}
          onOpenChange={() => setState((prev) => ({ ...prev, selectedNodeId: null }))}
          data-testid="node-detail-sheet"
        >
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: theme.nodeColors[selectedNode.type] }}
                />
                {selectedNode.label}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <div>
                <span className="text-sm font-medium text-muted-foreground">{t('type')}</span>
                <Badge variant="outline" className="ml-2">
                  {selectedNode.type}
                </Badge>
              </div>

              {selectedNode.description && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {t('description')}
                  </span>
                  <p className="text-sm mt-1">{selectedNode.description}</p>
                </div>
              )}

              {selectedNode.pageNumber && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">{t('page')}</span>
                  <span className="text-sm ml-2">{selectedNode.pageNumber}</span>
                </div>
              )}

              {selectedNode.locationRef && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    onLocationNavigate?.({
                      id: selectedNode.locationRef!,
                      title: selectedNode.label,
                      description: selectedNode.description || '',
                      pageNumber: selectedNode.pageNumber,
                    });
                  }}
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  {t('navigateToLocation')}
                </Button>
              )}

              {selectedNode.children && selectedNode.children.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">{t('children')}</span>
                  <ul className="mt-2 space-y-1">
                    {selectedNode.children.slice(0, 5).map((child) => (
                      <li
                        key={child.id}
                        className="text-sm text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => setState((prev) => ({ ...prev, selectedNodeId: child.id }))}
                      >
                        • {child.label}
                      </li>
                    ))}
                    {selectedNode.children.length > 5 && (
                      <li className="text-sm text-muted-foreground">
                        {t('andMore', { count: selectedNode.children.length - 5 })}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {showMinimap && (
        <div className="absolute bottom-4 right-4 w-40 h-24 bg-background/80 backdrop-blur-sm border rounded-lg overflow-hidden">
          <div className="relative w-full h-full p-1">
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              {t('minimap')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MindMapCanvas;
