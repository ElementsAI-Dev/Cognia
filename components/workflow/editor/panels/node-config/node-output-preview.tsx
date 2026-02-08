'use client';

/**
 * NodeOutputPreview - Node output preview & pin data (n8n-inspired)
 * Shows execution output and allows pinning data for testing
 */

import { useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  Pin,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Eye,
  Database,
} from 'lucide-react';
import type { NodePinnedData } from '@/types/workflow/workflow-editor';

interface NodeOutputPreviewProps {
  executionOutput?: unknown;
  pinnedData?: NodePinnedData;
  onPinnedDataChange: (pinnedData: NodePinnedData) => void;
  className?: string;
}

export function NodeOutputPreview({
  executionOutput,
  pinnedData,
  onPinnedDataChange,
  className,
}: NodeOutputPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingPinData, setEditingPinData] = useState(false);
  const [pinDataText, setPinDataText] = useState(
    pinnedData?.data ? JSON.stringify(pinnedData.data, null, 2) : ''
  );
  const [copied, setCopied] = useState(false);

  const isPinned = pinnedData?.isPinned || false;
  const hasOutput = executionOutput !== undefined && executionOutput !== null;
  const displayData = isPinned && pinnedData?.data ? pinnedData.data : executionOutput;

  const handleTogglePin = useCallback(() => {
    if (isPinned) {
      onPinnedDataChange({ isPinned: false });
    } else {
      const dataToPin = executionOutput as Record<string, unknown> | undefined;
      onPinnedDataChange({
        isPinned: true,
        data: dataToPin || {},
        pinnedAt: new Date(),
      });
      setPinDataText(JSON.stringify(dataToPin || {}, null, 2));
    }
  }, [isPinned, executionOutput, onPinnedDataChange]);

  const handleSavePinData = useCallback(() => {
    try {
      const parsed = JSON.parse(pinDataText);
      onPinnedDataChange({
        isPinned: true,
        data: parsed,
        pinnedAt: new Date(),
      });
      setEditingPinData(false);
    } catch {
      // Invalid JSON - don't save
    }
  }, [pinDataText, onPinnedDataChange]);

  const handleCopy = useCallback(() => {
    const text = JSON.stringify(displayData, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [displayData]);

  const formatOutput = (data: unknown): string => {
    if (data === null || data === undefined) return 'null';
    if (typeof data === 'string') return data;
    return JSON.stringify(data, null, 2);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent text-sm">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <Eye className="h-4 w-4 text-blue-500" />
          <span className="font-medium">Output Preview</span>
          <div className="ml-auto flex items-center gap-1">
            {isPinned && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                <Pin className="h-2.5 w-2.5 mr-0.5" />
                Pinned
              </Badge>
            )}
            {hasOutput && !isPinned && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                Live
              </Badge>
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-2 pb-2">
          <div className="space-y-2">
            {/* Pin controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="pin-data"
                  checked={isPinned}
                  onCheckedChange={handleTogglePin}
                />
                <Label htmlFor="pin-data" className="text-xs">
                  {isPinned ? 'Data Pinned' : 'Pin Data'}
                </Label>
              </div>
              <div className="flex items-center gap-1">
                {isPinned && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => setEditingPinData(!editingPinData)}
                  >
                    <Database className="h-3 w-3 mr-1" />
                    {editingPinData ? 'Preview' : 'Edit'}
                  </Button>
                )}
                {displayData !== undefined && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Pin data description */}
            {isPinned && (
              <p className="text-[10px] text-muted-foreground bg-amber-500/10 rounded px-2 py-1">
                When pinned, this node will use the pinned data instead of
                executing. Useful for testing downstream nodes.
              </p>
            )}

            {/* Edit mode for pinned data */}
            {isPinned && editingPinData && (
              <div className="space-y-1.5">
                <Textarea
                  value={pinDataText}
                  onChange={(e) => setPinDataText(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="text-xs font-mono min-h-[120px]"
                  rows={6}
                />
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={handleSavePinData}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setEditingPinData(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Output display */}
            {!editingPinData && (
              <div className="space-y-1">
                {displayData !== undefined ? (
                  <pre className="text-xs font-mono bg-muted/50 rounded p-2 overflow-auto max-h-[200px] whitespace-pre-wrap break-all">
                    {formatOutput(displayData)}
                  </pre>
                ) : (
                  <div className="text-xs text-muted-foreground text-center py-4 bg-muted/30 rounded">
                    No output data available. Run the workflow to see results.
                  </div>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default NodeOutputPreview;
