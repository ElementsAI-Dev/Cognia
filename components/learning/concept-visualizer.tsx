'use client';

/**
 * Concept Visualizer Component
 *
 * Interactive visualization for abstract concepts with
 * multiple layout types and animated transitions.
 */

import { memo, useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Info,
  ChevronDown,
  Layers,
  GitBranch,
  Network,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

/**
 * Types of concept visualizations
 */
export type VisualizationType =
  | 'flow' // Left-to-right flow diagram
  | 'hierarchy' // Top-down tree structure
  | 'network' // Connected network graph
  | 'layers' // Stacked layers
  | 'sequence'; // Sequential steps

/**
 * A node in the concept visualization
 */
export interface ConceptNode {
  id: string;
  label: string;
  description?: string;

  // Visual properties
  type?: 'input' | 'output' | 'process' | 'decision' | 'data' | 'default';
  color?: string;
  icon?: string;

  // Content
  details?: React.ReactNode;
  annotations?: string[];

  // For hierarchy/network
  parentId?: string;
  children?: ConceptNode[];

  // For layers
  layer?: number;

  // Connections (for network type)
  connections?: {
    targetId: string;
    label?: string;
    type?: 'directed' | 'bidirectional';
  }[];
}

/**
 * Connection between nodes
 */
export interface ConceptConnection {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  type?: 'directed' | 'bidirectional';
  style?: 'solid' | 'dashed' | 'dotted';
}

/**
 * Complete concept visualization data
 */
export interface ConceptData {
  id: string;
  title: string;
  description?: string;
  type: VisualizationType;
  nodes: ConceptNode[];
  connections?: ConceptConnection[];

  // Metadata
  category?: string;
  tags?: string[];
}

/**
 * Props for ConceptVisualizer
 */
export interface ConceptVisualizerProps {
  data: ConceptData;

  // Interaction options
  interactive?: boolean;
  expandable?: boolean;
  zoomable?: boolean;

  // Callbacks
  onNodeClick?: (node: ConceptNode) => void;
  onNodeHover?: (node: ConceptNode | null) => void;

  // UI options
  showLegend?: boolean;
  showDetails?: boolean;
  compact?: boolean;

  // Styling
  className?: string;
}

// Node type colors
const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  input: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-green-400',
    text: 'text-green-700 dark:text-green-300',
  },
  output: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-400',
    text: 'text-blue-700 dark:text-blue-300',
  },
  process: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-400',
    text: 'text-purple-700 dark:text-purple-300',
  },
  decision: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    border: 'border-amber-400',
    text: 'text-amber-700 dark:text-amber-300',
  },
  data: {
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    border: 'border-cyan-400',
    text: 'text-cyan-700 dark:text-cyan-300',
  },
  default: { bg: 'bg-muted', border: 'border-border', text: 'text-foreground' },
};

// Visualization type icons
const VIS_TYPE_ICONS: Record<VisualizationType, React.ElementType> = {
  flow: ArrowRight,
  hierarchy: GitBranch,
  network: Network,
  layers: Layers,
  sequence: ArrowRight,
};

/**
 * Node component for visualization
 */
interface ConceptNodeCardProps {
  node: ConceptNode;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  prefersReducedMotion: boolean;
  compact?: boolean;
}

const ConceptNodeCard = memo(function ConceptNodeCard({
  node,
  isSelected,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
  prefersReducedMotion,
  compact,
}: ConceptNodeCardProps) {
  const colors = NODE_COLORS[node.type || 'default'];

  const motionProps = prefersReducedMotion
    ? {}
    : {
        whileHover: { scale: 1.02 },
        whileTap: { scale: 0.98 },
      };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            {...motionProps}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className={cn(
              'relative rounded-lg border-2 p-3 cursor-pointer transition-shadow',
              colors.bg,
              colors.border,
              isSelected && 'ring-2 ring-primary ring-offset-2',
              isHovered && 'shadow-lg',
              compact ? 'min-w-20' : 'min-w-30'
            )}
          >
            <div className="flex flex-col items-center gap-1">
              <span className={cn('font-medium text-center text-sm', colors.text)}>
                {node.label}
              </span>
              {node.annotations && node.annotations.length > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5">
                  {node.annotations.length}
                </Badge>
              )}
            </div>
          </motion.div>
        </TooltipTrigger>
        {node.description && (
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-sm">{node.description}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
});

/**
 * Flow visualization layout
 */
interface FlowLayoutProps {
  nodes: ConceptNode[];
  connections?: ConceptConnection[];
  selectedNode: string | null;
  hoveredNode: string | null;
  onNodeClick: (node: ConceptNode) => void;
  onNodeHover: (node: ConceptNode | null) => void;
  prefersReducedMotion: boolean;
  compact?: boolean;
}

const FlowLayout = memo(function FlowLayout({
  nodes,
  selectedNode,
  hoveredNode,
  onNodeClick,
  onNodeHover,
  prefersReducedMotion,
  compact,
}: FlowLayoutProps) {
  return (
    <div className="flex items-center gap-4 p-4 overflow-x-auto">
      {nodes.map((node, index) => (
        <div key={node.id} className="flex items-center gap-4">
          <ConceptNodeCard
            node={node}
            isSelected={selectedNode === node.id}
            isHovered={hoveredNode === node.id}
            onClick={() => onNodeClick(node)}
            onMouseEnter={() => onNodeHover(node)}
            onMouseLeave={() => onNodeHover(null)}
            prefersReducedMotion={prefersReducedMotion}
            compact={compact}
          />
          {index < nodes.length - 1 && (
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
            </motion.div>
          )}
        </div>
      ))}
    </div>
  );
});

/**
 * Layers visualization layout
 */
const LayersLayout = memo(function LayersLayout({
  nodes,
  selectedNode,
  hoveredNode,
  onNodeClick,
  onNodeHover,
  prefersReducedMotion,
  compact,
}: FlowLayoutProps) {
  // Group nodes by layer
  const layers = useMemo(() => {
    const layerMap = new Map<number, ConceptNode[]>();
    nodes.forEach((node) => {
      const layer = node.layer ?? 0;
      if (!layerMap.has(layer)) {
        layerMap.set(layer, []);
      }
      layerMap.get(layer)!.push(node);
    });
    return Array.from(layerMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, layerNodes]) => layerNodes);
  }, [nodes]);

  return (
    <div className="flex flex-col gap-2 p-4">
      {layers.map((layerNodes, layerIndex) => (
        <motion.div
          key={layerIndex}
          className="flex justify-center gap-4 p-3 rounded-lg bg-muted/30 border border-dashed"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: layerIndex * 0.15 }}
        >
          {layerNodes.map((node) => (
            <ConceptNodeCard
              key={node.id}
              node={node}
              isSelected={selectedNode === node.id}
              isHovered={hoveredNode === node.id}
              onClick={() => onNodeClick(node)}
              onMouseEnter={() => onNodeHover(node)}
              onMouseLeave={() => onNodeHover(null)}
              prefersReducedMotion={prefersReducedMotion}
              compact={compact}
            />
          ))}
        </motion.div>
      ))}
    </div>
  );
});

/**
 * Hierarchy visualization layout
 */
const HierarchyLayout = memo(function HierarchyLayout({
  nodes,
  selectedNode,
  hoveredNode,
  onNodeClick,
  onNodeHover,
  prefersReducedMotion,
  compact,
}: FlowLayoutProps) {
  // Build tree structure
  const rootNodes = useMemo(() => {
    return nodes.filter((n) => !n.parentId);
  }, [nodes]);

  const renderNode = (node: ConceptNode, depth: number = 0): React.ReactNode => {
    const children = nodes.filter((n) => n.parentId === node.id);

    return (
      <motion.div
        key={node.id}
        className="flex flex-col items-center"
        initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: depth * 0.1 }}
      >
        <ConceptNodeCard
          node={node}
          isSelected={selectedNode === node.id}
          isHovered={hoveredNode === node.id}
          onClick={() => onNodeClick(node)}
          onMouseEnter={() => onNodeHover(node)}
          onMouseLeave={() => onNodeHover(null)}
          prefersReducedMotion={prefersReducedMotion}
          compact={compact}
        />
        {children.length > 0 && (
          <>
            <div className="w-px h-4 bg-border" />
            <div className="flex gap-4">
              {children.map((child) => renderNode(child, depth + 1))}
            </div>
          </>
        )}
      </motion.div>
    );
  };

  return (
    <ScrollArea className="w-full">
      <div className="flex justify-center gap-8 p-4">
        {rootNodes.map((node) => renderNode(node))}
      </div>
    </ScrollArea>
  );
});

/**
 * Node details panel
 */
interface NodeDetailsPanelProps {
  node: ConceptNode | null;
  onClose: () => void;
}

const NodeDetailsPanel = memo(function NodeDetailsPanel({ node, onClose }: NodeDetailsPanelProps) {
  const t = useTranslations('learning.visualization');

  if (!node) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="border-t mt-4 pt-4"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            {node.label}
          </h4>
          {node.description && <p className="text-sm text-muted-foreground">{node.description}</p>}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ✕
        </Button>
      </div>

      {node.details && (
        <div className="mt-3 prose prose-sm dark:prose-invert max-w-none">{node.details}</div>
      )}

      {node.annotations && node.annotations.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">{t('annotations')}</p>
          <ul className="text-sm space-y-1">
            {node.annotations.map((annotation, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary">•</span>
                {annotation}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
});

/**
 * Main ConceptVisualizer Component
 */
export const ConceptVisualizer = memo(function ConceptVisualizer({
  data,
  interactive = true,
  expandable = true,
  zoomable = true,
  onNodeClick,
  onNodeHover,
  showLegend = true,
  showDetails = true,
  compact = false,
  className,
}: ConceptVisualizerProps) {
  const t = useTranslations('learning.visualization');
  const prefersReducedMotion = useReducedMotion() ?? false;

  // State
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Get selected node data
  const selectedNodeData = useMemo(() => {
    if (!selectedNode) return null;
    return data.nodes.find((n) => n.id === selectedNode) || null;
  }, [selectedNode, data.nodes]);

  // Handlers
  const handleNodeClick = useCallback(
    (node: ConceptNode) => {
      setSelectedNode((prev) => (prev === node.id ? null : node.id));
      onNodeClick?.(node);
    },
    [onNodeClick]
  );

  const handleNodeHover = useCallback(
    (node: ConceptNode | null) => {
      setHoveredNode(node?.id || null);
      onNodeHover?.(node);
    },
    [onNodeHover]
  );

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  // Get visualization icon
  const VisIcon = VIS_TYPE_ICONS[data.type];

  // Render layout based on type
  const renderLayout = () => {
    const layoutProps: FlowLayoutProps = {
      nodes: data.nodes,
      connections: data.connections,
      selectedNode,
      hoveredNode,
      onNodeClick: handleNodeClick,
      onNodeHover: handleNodeHover,
      prefersReducedMotion,
      compact,
    };

    switch (data.type) {
      case 'flow':
      case 'sequence':
        return <FlowLayout {...layoutProps} />;
      case 'layers':
        return <LayersLayout {...layoutProps} />;
      case 'hierarchy':
        return <HierarchyLayout {...layoutProps} />;
      case 'network':
        // Network layout is more complex, using flow as fallback
        return <FlowLayout {...layoutProps} />;
      default:
        return <FlowLayout {...layoutProps} />;
    }
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className={cn('pb-2', compact && 'py-3')}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn('flex items-center gap-2', compact ? 'text-base' : 'text-lg')}>
            <VisIcon className="h-5 w-5 text-primary" />
            {data.title}
          </CardTitle>

          <div className="flex items-center gap-1">
            {zoomable && (
              <>
                <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={zoom <= 0.5}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={zoom >= 2}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleResetZoom}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </>
            )}
            {expandable && (
              <Button variant="ghost" size="icon" onClick={() => setIsExpanded((prev) => !prev)}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {data.description && !compact && (
          <p className="text-sm text-muted-foreground">{data.description}</p>
        )}

        {/* Tags */}
        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {data.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {/* Visualization area */}
        <div
          className={cn(
            'overflow-auto border-y bg-muted/10',
            isExpanded ? 'min-h-100' : 'min-h-50'
          )}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        >
          {renderLayout()}
        </div>

        {/* Legend */}
        {showLegend && (
          <Collapsible className="p-3 border-b">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="text-xs text-muted-foreground">{t('legend')}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-wrap gap-3 pt-2">
                {Object.entries(NODE_COLORS).map(([type, colors]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div className={cn('w-3 h-3 rounded border', colors.bg, colors.border)} />
                    <span className="text-xs capitalize">{type}</span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Selected node details */}
        {showDetails && interactive && (
          <div className="p-3">
            <AnimatePresence>
              {selectedNodeData && (
                <NodeDetailsPanel node={selectedNodeData} onClose={() => setSelectedNode(null)} />
              )}
            </AnimatePresence>

            {!selectedNodeData && (
              <p className="text-sm text-muted-foreground text-center py-2">
                {t('clickToExplore')}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default ConceptVisualizer;
