'use client';

/**
 * NodeQuickConfig - Quick configuration popover for workflow nodes
 * Allows fast editing of key node properties via right-click context menu
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useWorkflowEditorStore } from '@/stores/workflow';
import {
  Copy,
  Trash2,
  Settings,
  Sparkles,
  Wrench,
  Code,
  ExternalLink,
  Bookmark,
  RotateCcw,
  Link,
} from 'lucide-react';
import { SaveTemplateDialog } from './node-template-manager';
import type {
  WorkflowNodeData,
  AINodeData,
  ToolNodeData,
  CodeNodeData,
} from '@/types/workflow/workflow-editor';

interface NodeQuickConfigProps {
  nodeId: string;
  data: WorkflowNodeData;
  children: React.ReactNode;
  onOpenConfig?: () => void;
}

export function NodeQuickConfig({
  nodeId,
  data,
  children,
  onOpenConfig,
}: NodeQuickConfigProps) {
  const t = useTranslations('nodeQuickConfig');
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const { 
    updateNode, 
    duplicateNode, 
    deleteNode,
    currentWorkflow,
  } = useWorkflowEditorStore();

  const handleDelete = useCallback(() => {
    deleteNode(nodeId);
  }, [nodeId, deleteNode]);

  const handleDuplicate = useCallback(() => {
    duplicateNode(nodeId);
  }, [nodeId, duplicateNode]);

  const handleQuickUpdate = useCallback(
    (updates: Partial<WorkflowNodeData>) => {
      updateNode(nodeId, updates);
    },
    [nodeId, updateNode]
  );

  const renderQuickEditor = () => {
    switch (data.nodeType) {
      case 'ai': {
        const aiData = data as AINodeData;
        return (
          <div className="space-y-3 p-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span className="font-medium text-sm">{t('quickAIConfig')}</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('model')}</Label>
              <Select
                value={aiData.model || ''}
                onValueChange={(value) => handleQuickUpdate({ model: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={t('selectModel')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                  <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4</SelectItem>
                  <SelectItem value="gemini-2.0-flash-exp">Gemini 2.0 Flash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t('temperature')}</Label>
                <span className="text-xs text-muted-foreground">
                  {aiData.temperature ?? 0.7}
                </span>
              </div>
              <Slider
                value={[aiData.temperature ?? 0.7]}
                onValueChange={([value]) => handleQuickUpdate({ temperature: value })}
                min={0}
                max={2}
                step={0.1}
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('promptPreview')}</Label>
              <Textarea
                value={aiData.aiPrompt || ''}
                onChange={(e) => handleQuickUpdate({ aiPrompt: e.target.value })}
                placeholder={t('enterPrompt')}
                className="text-xs min-h-[60px] font-mono"
                rows={3}
              />
            </div>
          </div>
        );
      }

      case 'tool': {
        const toolData = data as ToolNodeData;
        return (
          <div className="space-y-3 p-1">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-sm">{t('quickToolConfig')}</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('tool')}</Label>
              <Select
                value={toolData.toolName || ''}
                onValueChange={(value) => handleQuickUpdate({ toolName: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={t('selectTool')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web_search">Web Search</SelectItem>
                  <SelectItem value="rag_search">RAG Search</SelectItem>
                  <SelectItem value="calculator">Calculator</SelectItem>
                  <SelectItem value="file_read">File Read</SelectItem>
                  <SelectItem value="file_write">File Write</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {toolData.toolName && (
              <Badge variant="secondary" className="text-xs">
                {toolData.toolCategory || 'general'}
              </Badge>
            )}
          </div>
        );
      }

      case 'code': {
        const codeData = data as CodeNodeData;
        return (
          <div className="space-y-3 p-1">
            <div className="flex items-center gap-2 mb-2">
              <Code className="h-4 w-4 text-green-500" />
              <span className="font-medium text-sm">{t('quickCodeConfig')}</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('language')}</Label>
              <Select
                value={codeData.language || 'javascript'}
                onValueChange={(value) =>
                  handleQuickUpdate({ language: value as CodeNodeData['language'] })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="p-2 text-center text-xs text-muted-foreground">
            {t('openFullConfigHint')}
          </div>
        );
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Popover open={quickEditOpen} onOpenChange={setQuickEditOpen}>
          <PopoverTrigger asChild>
            {children}
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="start"
            className="w-64 p-3"
            sideOffset={8}
          >
            {/* Node name editor */}
            <div className="space-y-1.5 mb-3">
              <Label className="text-xs">{t('name')}</Label>
              <Input
                value={data.label}
                onChange={(e) => handleQuickUpdate({ label: e.target.value })}
                className="h-8 text-sm"
              />
            </div>

            {/* Type-specific quick config */}
            {renderQuickEditor()}

            {/* Action buttons */}
            <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setQuickEditOpen(false)}
              >
                {t('close')}
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setQuickEditOpen(false);
                  onOpenConfig?.();
                }}
              >
                <Settings className="h-3 w-3 mr-1" />
                {t('fullConfig')}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={() => setQuickEditOpen(true)}>
          <Settings className="h-4 w-4 mr-2" />
          {t('quickEdit')}
        </ContextMenuItem>
        <ContextMenuItem onClick={onOpenConfig}>
          <ExternalLink className="h-4 w-4 mr-2" />
          {t('openFullConfig')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        
        {/* Execution actions */}
        {data.nodeType !== 'start' && data.nodeType !== 'end' && (
          <>
            <ContextMenuItem 
              onClick={() => {
                updateNode(nodeId, { executionStatus: 'idle' });
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('resetState') || 'Reset State'}
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        
        {/* Node operations */}
        <ContextMenuItem onClick={handleDuplicate}>
          <Copy className="h-4 w-4 mr-2" />
          {t('duplicate')}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => setSaveTemplateOpen(true)}>
          <Bookmark className="h-4 w-4 mr-2" />
          {t('saveAsTemplate')}
        </ContextMenuItem>
        
        {/* Connection info */}
        {currentWorkflow && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem disabled className="text-muted-foreground">
              <Link className="h-4 w-4 mr-2" />
              {currentWorkflow.edges.filter(e => e.source === nodeId || e.target === nodeId).length} {t('connections') || 'connections'}
            </ContextMenuItem>
          </>
        )}
        
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t('delete')}
        </ContextMenuItem>
      </ContextMenuContent>

      <SaveTemplateDialog
        nodeId={nodeId}
        open={saveTemplateOpen}
        onOpenChange={setSaveTemplateOpen}
      />
    </ContextMenu>
  );
}

export default NodeQuickConfig;
