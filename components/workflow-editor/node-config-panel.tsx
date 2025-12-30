'use client';

/**
 * NodeConfigPanel - Configuration panel for selected nodes
 */

import { useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store';
import {
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  Settings,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { validateNode } from '@/lib/workflow-editor/validation';
import type { ValidationResult } from '@/lib/workflow-editor/validation';
import type {
  WorkflowNodeData,
  AINodeData,
  ToolNodeData,
  ConditionalNodeData,
  CodeNodeData,
  LoopNodeData,
  HumanNodeData,
  StartNodeData,
  EndNodeData,
  ParallelNodeData,
  DelayNodeData,
  SubworkflowNodeData,
  WebhookNodeData,
  TransformNodeData,
  MergeNodeData,
  GroupNodeData,
  AnnotationNodeData,
} from '@/types/workflow-editor';
import { NODE_TYPE_COLORS } from '@/types/workflow-editor';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-32 items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface NodeConfigPanelProps {
  nodeId: string;
  className?: string;
}

export function NodeConfigPanel({ nodeId, className }: NodeConfigPanelProps) {
  const t = useTranslations('workflowEditor');

  const {
    currentWorkflow,
    updateNode,
    deleteNode,
    activeConfigTab,
    setActiveConfigTab,
  } = useWorkflowEditorStore();

  const node = useMemo(() => {
    return currentWorkflow?.nodes.find((n) => n.id === nodeId);
  }, [currentWorkflow, nodeId]);

  // Real-time validation
  const validation = useMemo((): ValidationResult => {
    if (!node) {
      return { isValid: true, errors: [], warnings: [] };
    }
    return validateNode(node.data.nodeType, node.data);
  }, [node]);

  const handleUpdateData = useCallback(
    (updates: Partial<WorkflowNodeData>) => {
      updateNode(nodeId, updates);
    },
    [nodeId, updateNode]
  );

  const handleDelete = useCallback(() => {
    deleteNode(nodeId);
  }, [nodeId, deleteNode]);

  if (!node) {
    return (
      <div className={cn('flex flex-col h-full bg-background border-l', className)}>
        <div className="p-4 text-center text-muted-foreground">
          {t('selectNode')}
        </div>
      </div>
    );
  }

  const data = node.data;
  const nodeType = data.nodeType;
  const color = NODE_TYPE_COLORS[nodeType];

  return (
    <div className={cn('flex flex-col h-full min-h-0 bg-background border-l', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="p-1.5 rounded-md shadow-sm"
            style={{ backgroundColor: `${color}20` }}
          >
            <Settings className="h-4 w-4" style={{ color }} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate max-w-[150px]">{data.label}</h3>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                {nodeType}
              </Badge>
              {data.isConfigured && (
                <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                  Configured
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!validation.isValid && (
            <div className="flex items-center gap-1 text-destructive" title={`${validation.errors.length} error(s)`}>
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs">{validation.errors.length}</span>
            </div>
          )}
          {validation.warnings.length > 0 && (
            <div className="flex items-center gap-1 text-yellow-500" title={`${validation.warnings.length} warning(s)`}>
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs">{validation.warnings.length}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Validation Summary */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="px-3 py-2 border-b space-y-1 bg-muted/30 shrink-0">
          {validation.errors.map((error, i) => (
            <div key={`error-${i}`} className="flex items-start gap-1.5 text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
              <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{error.message}</span>
            </div>
          ))}
          {validation.warnings.map((warning, i) => (
            <div key={`warning-${i}`} className="flex items-start gap-1.5 text-xs text-yellow-600 dark:text-yellow-500 bg-yellow-500/10 rounded px-2 py-1">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{warning.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs
        value={activeConfigTab}
        onValueChange={setActiveConfigTab}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="grid w-full grid-cols-4 px-3 pt-2 shrink-0">
          <TabsTrigger value="properties" className="text-xs">
            {t('properties')}
          </TabsTrigger>
          <TabsTrigger value="inputs" className="text-xs">
            {t('inputs')}
          </TabsTrigger>
          <TabsTrigger value="outputs" className="text-xs">
            {t('outputs')}
          </TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs">
            Advanced
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 min-h-0">
          {/* Properties Tab */}
          <TabsContent value="properties" className="p-3 space-y-4 mt-0">
            {/* Common properties */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="label" className="text-xs flex items-center gap-1">
                  {t('name')}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="label"
                  value={data.label}
                  onChange={(e) => {
                    handleUpdateData({ label: e.target.value });
                    if (e.target.value.trim()) {
                      handleUpdateData({ isConfigured: true });
                    }
                  }}
                  className="h-8 text-sm"
                  placeholder="Enter node name"
                />
                {!data.label.trim() && (
                  <p className="text-xs text-destructive">Node name is required</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs">
                  {t('description')}
                </Label>
                <Textarea
                  id="description"
                  value={data.description || ''}
                  onChange={(e) => handleUpdateData({ description: e.target.value })}
                  className="text-sm min-h-[60px] resize-none"
                  rows={2}
                  placeholder="Describe what this node does..."
                />
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={() => handleUpdateData({ isConfigured: true })}
                  disabled={data.isConfigured}
                >
                  Mark as Configured
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={() => handleUpdateData({ executionStatus: 'idle' })}
                >
                  Reset Status
                </Button>
              </div>
            </div>

            {/* Type-specific properties */}
            {nodeType === 'ai' && (
              <AINodeConfig
                data={data as AINodeData}
                onUpdate={handleUpdateData}
              />
            )}

            {nodeType === 'tool' && (
              <ToolNodeConfig
                data={data as ToolNodeData}
                onUpdate={handleUpdateData}
              />
            )}

            {nodeType === 'conditional' && (
              <ConditionalNodeConfig
                data={data as ConditionalNodeData}
                onUpdate={handleUpdateData}
              />
            )}

            {nodeType === 'code' && (
              <CodeNodeConfig
                data={data as CodeNodeData}
                onUpdate={handleUpdateData}
              />
            )}

            {nodeType === 'loop' && (
              <LoopNodeConfig
                data={data as LoopNodeData}
                onUpdate={handleUpdateData}
              />
            )}

            {nodeType === 'human' && (
              <HumanNodeConfig
                data={data as HumanNodeData}
                onUpdate={handleUpdateData}
              />
            )}

            {nodeType === 'start' && (
              <StartNodeConfig
                data={data as StartNodeData}
                onUpdate={handleUpdateData}
              />
            )}

            {nodeType === 'end' && (
              <EndNodeConfig
                data={data as EndNodeData}
                onUpdate={handleUpdateData}
              />
            )}

            {nodeType === 'parallel' && (
              <ParallelNodeConfig
                data={data as ParallelNodeData}
                onUpdate={handleUpdateData}
              />
            )}

            {nodeType === 'delay' && (
              <DelayNodeConfig
                data={data as DelayNodeData}
                onUpdate={handleUpdateData}
              />
            )}

            {nodeType === 'subworkflow' && (
              <SubworkflowNodeConfig
                data={data as SubworkflowNodeData}
                onUpdate={handleUpdateData}
              />
            )}

            {nodeType === 'webhook' && (
              <WebhookNodeConfig
                data={data as WebhookNodeData}
                onUpdate={handleUpdateData}
              />
            )}

            {nodeType === 'transform' && (
              <TransformNodeConfig
                data={data as TransformNodeData}
                onUpdate={handleUpdateData}
              />
            )}

            {nodeType === 'merge' && (
              <MergeNodeConfig
                data={data as MergeNodeData}
                onUpdate={handleUpdateData}
              />
            )}

            {nodeType === 'group' && (
              <GroupNodeConfig
                data={data as GroupNodeData}
                onUpdate={handleUpdateData}
              />
            )}

            {nodeType === 'annotation' && (
              <AnnotationNodeConfig
                data={data as AnnotationNodeData}
                onUpdate={handleUpdateData}
              />
            )}
          </TabsContent>

          {/* Inputs Tab */}
          <TabsContent value="inputs" className="p-3 space-y-4 mt-0">
            <IOSchemaEditor
              schema={(data as AINodeData).inputs || {}}
              onChange={(inputs) => handleUpdateData({ inputs } as Partial<WorkflowNodeData>)}
              type="input"
            />
          </TabsContent>

          {/* Outputs Tab */}
          <TabsContent value="outputs" className="p-3 space-y-4 mt-0">
            <IOSchemaEditor
              schema={(data as AINodeData).outputs || {}}
              onChange={(outputs) => handleUpdateData({ outputs } as Partial<WorkflowNodeData>)}
              type="output"
            />
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="p-3 space-y-4 mt-0">
            <div className="space-y-4">
              {/* Execution Settings */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Execution Settings
                </h4>
                <div className="space-y-3 p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs">Skip on Error</Label>
                      <p className="text-xs text-muted-foreground">Continue workflow if this node fails</p>
                    </div>
                    <Switch
                      checked={Boolean((data as Record<string, unknown>).skipOnError)}
                      onCheckedChange={(skipOnError) => handleUpdateData({ skipOnError } as Partial<WorkflowNodeData>)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs">Cache Results</Label>
                      <p className="text-xs text-muted-foreground">Reuse output for identical inputs</p>
                    </div>
                    <Switch
                      checked={Boolean((data as Record<string, unknown>).cacheResults)}
                      onCheckedChange={(cacheResults) => handleUpdateData({ cacheResults } as Partial<WorkflowNodeData>)}
                    />
                  </div>
                </div>
              </div>

              {/* Retry Settings */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Retry Configuration
                </h4>
                <div className="space-y-3 p-3 border rounded-lg">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Max Retries</Label>
                    <Input
                      type="number"
                      value={(data as Record<string, unknown>).maxRetries as number || 0}
                      onChange={(e) => handleUpdateData({ maxRetries: parseInt(e.target.value) || 0 } as Partial<WorkflowNodeData>)}
                      placeholder="0"
                      className="h-8 text-sm"
                      min={0}
                      max={10}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Retry Delay (ms)</Label>
                    <Input
                      type="number"
                      value={(data as Record<string, unknown>).retryDelay as number || 1000}
                      onChange={(e) => handleUpdateData({ retryDelay: parseInt(e.target.value) || 1000 } as Partial<WorkflowNodeData>)}
                      placeholder="1000"
                      className="h-8 text-sm"
                      min={0}
                    />
                  </div>
                </div>
              </div>

              {/* Timeout Settings */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Timeout
                </h4>
                <div className="space-y-1.5 p-3 border rounded-lg">
                  <Label className="text-xs">Execution Timeout (ms)</Label>
                  <Input
                    type="number"
                    value={(data as Record<string, unknown>).timeout as number || ''}
                    onChange={(e) => handleUpdateData({ timeout: parseInt(e.target.value) || undefined } as Partial<WorkflowNodeData>)}
                    placeholder="No timeout"
                    className="h-8 text-sm"
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum time allowed for this node to complete
                  </p>
                </div>
              </div>

              {/* Node Metadata */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Metadata
                </h4>
                <div className="space-y-3 p-3 border rounded-lg">
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Node ID</span>
                      <span className="font-mono">{nodeId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-mono">{nodeType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant="outline" className="text-xs">{data.executionStatus}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

// AI Node Configuration
interface AINodeConfigProps {
  data: AINodeData;
  onUpdate: (updates: Partial<AINodeData>) => void;
}

function AINodeConfig({ data, onUpdate }: AINodeConfigProps) {
  const t = useTranslations('workflowEditor');

  return (
    <Accordion type="multiple" defaultValue={['prompt', 'model']} className="space-y-2">
      <AccordionItem value="prompt" className="border rounded-lg px-3">
        <AccordionTrigger className="py-2 text-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {t('aiPrompt')}
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('systemPrompt')}</Label>
              <Textarea
                value={data.systemPrompt || ''}
                onChange={(e) => onUpdate({ systemPrompt: e.target.value })}
                placeholder={t('systemPromptPlaceholder')}
                className="text-sm min-h-[60px]"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('userPrompt')}</Label>
              <Textarea
                value={data.aiPrompt}
                onChange={(e) => onUpdate({ aiPrompt: e.target.value })}
                placeholder={t('userPromptPlaceholder')}
                className="text-sm min-h-[100px] font-mono"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                {t('promptVariablesHint')}
              </p>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="model" className="border rounded-lg px-3">
        <AccordionTrigger className="py-2 text-sm">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t('modelSettings')}
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('model')}</Label>
              <Select
                value={data.model || ''}
                onValueChange={(value) => onUpdate({ model: value })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={t('selectModel')} />
                </SelectTrigger>
                <SelectContent>
                  {/* OpenAI Models */}
                  <SelectItem value="gpt-4o">GPT-4o (OpenAI)</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini (OpenAI)</SelectItem>
                  <SelectItem value="o1">o1 (OpenAI)</SelectItem>
                  <SelectItem value="o1-mini">o1 Mini (OpenAI)</SelectItem>
                  {/* Anthropic Models */}
                  <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4 (Anthropic)</SelectItem>
                  <SelectItem value="claude-opus-4-20250514">Claude Opus 4 (Anthropic)</SelectItem>
                  <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Anthropic)</SelectItem>
                  {/* Google Models */}
                  <SelectItem value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Google)</SelectItem>
                  <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro (Google)</SelectItem>
                  <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash (Google)</SelectItem>
                  {/* DeepSeek Models */}
                  <SelectItem value="deepseek-chat">DeepSeek Chat</SelectItem>
                  <SelectItem value="deepseek-reasoner">DeepSeek Reasoner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t('temperature')}</Label>
                <span className="text-xs text-muted-foreground">
                  {data.temperature ?? 0.7}
                </span>
              </div>
              <Slider
                value={[data.temperature ?? 0.7]}
                onValueChange={([value]) => onUpdate({ temperature: value })}
                min={0}
                max={2}
                step={0.1}
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('maxTokens')}</Label>
              <Input
                type="number"
                value={data.maxTokens || ''}
                onChange={(e) => onUpdate({ maxTokens: parseInt(e.target.value) || undefined })}
                placeholder="4096"
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('responseFormat')}</Label>
              <Select
                value={data.responseFormat || 'text'}
                onValueChange={(value) => onUpdate({ responseFormat: value as AINodeData['responseFormat'] })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="markdown">Markdown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

// Available tools from registry - grouped by category
const AVAILABLE_TOOLS = [
  // Search tools
  { name: 'web_search', label: 'Web Search', category: 'search', description: 'Search the web for information' },
  { name: 'rag_search', label: 'RAG Search', category: 'search', description: 'Search knowledge base' },
  // System tools
  { name: 'calculator', label: 'Calculator', category: 'system', description: 'Perform calculations' },
  // Document tools
  { name: 'document_summarize', label: 'Document Summarize', category: 'file', description: 'Summarize documents' },
  { name: 'document_chunk', label: 'Document Chunk', category: 'file', description: 'Split documents into chunks' },
  { name: 'document_analyze', label: 'Document Analyze', category: 'file', description: 'Analyze document structure' },
  // File tools
  { name: 'file_read', label: 'File Read', category: 'file', description: 'Read file contents' },
  { name: 'file_write', label: 'File Write', category: 'file', description: 'Write to file' },
  { name: 'file_list', label: 'File List', category: 'file', description: 'List directory contents' },
  { name: 'file_exists', label: 'File Exists', category: 'file', description: 'Check if file exists' },
  { name: 'file_delete', label: 'File Delete', category: 'file', description: 'Delete file' },
  { name: 'file_copy', label: 'File Copy', category: 'file', description: 'Copy file' },
  { name: 'file_rename', label: 'File Rename', category: 'file', description: 'Rename/move file' },
  { name: 'file_info', label: 'File Info', category: 'file', description: 'Get file information' },
  { name: 'file_search', label: 'File Search', category: 'file', description: 'Search for files' },
  { name: 'file_append', label: 'File Append', category: 'file', description: 'Append to file' },
  { name: 'directory_create', label: 'Directory Create', category: 'file', description: 'Create directory' },
];

// Tool Node Configuration
interface ToolNodeConfigProps {
  data: ToolNodeData;
  onUpdate: (updates: Partial<ToolNodeData>) => void;
}

function ToolNodeConfig({ data, onUpdate }: ToolNodeConfigProps) {
  const t = useTranslations('workflowEditor');
  
  const selectedTool = AVAILABLE_TOOLS.find(tool => tool.name === data.toolName);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('toolName')}</Label>
        <Select
          value={data.toolName}
          onValueChange={(value) => {
            const tool = AVAILABLE_TOOLS.find(t => t.name === value);
            onUpdate({ 
              toolName: value,
              toolCategory: tool?.category,
            });
          }}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder={t('selectTool')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="web_search">🔍 Web Search</SelectItem>
            <SelectItem value="rag_search">📚 RAG Search</SelectItem>
            <SelectItem value="calculator">🧮 Calculator</SelectItem>
            <SelectItem value="document_summarize">📄 Document Summarize</SelectItem>
            <SelectItem value="document_chunk">✂️ Document Chunk</SelectItem>
            <SelectItem value="document_analyze">🔬 Document Analyze</SelectItem>
            <SelectItem value="file_read">📖 File Read</SelectItem>
            <SelectItem value="file_write">✏️ File Write</SelectItem>
            <SelectItem value="file_list">📁 File List</SelectItem>
            <SelectItem value="file_exists">❓ File Exists</SelectItem>
            <SelectItem value="file_delete">🗑️ File Delete</SelectItem>
            <SelectItem value="file_copy">📋 File Copy</SelectItem>
            <SelectItem value="file_rename">📝 File Rename</SelectItem>
            <SelectItem value="file_info">ℹ️ File Info</SelectItem>
            <SelectItem value="file_search">🔎 File Search</SelectItem>
            <SelectItem value="file_append">➕ File Append</SelectItem>
            <SelectItem value="directory_create">📂 Directory Create</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedTool && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs font-medium">{selectedTool.label}</p>
          <p className="text-xs text-muted-foreground mt-1">{selectedTool.description}</p>
          <Badge variant="outline" className="text-xs mt-2">{selectedTool.category}</Badge>
        </div>
      )}
    </div>
  );
}

// Conditional Node Configuration
interface ConditionalNodeConfigProps {
  data: ConditionalNodeData;
  onUpdate: (updates: Partial<ConditionalNodeData>) => void;
}

function ConditionalNodeConfig({ data, onUpdate }: ConditionalNodeConfigProps) {
  const t = useTranslations('workflowEditor');

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('conditionType')}</Label>
        <Select
          value={data.conditionType}
          onValueChange={(value) => onUpdate({ conditionType: value as ConditionalNodeData['conditionType'] })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expression">Expression</SelectItem>
            <SelectItem value="comparison">Comparison</SelectItem>
            <SelectItem value="ai">AI Decision</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data.conditionType === 'expression' && (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('expression')}</Label>
          <Textarea
            value={data.condition}
            onChange={(e) => onUpdate({ condition: e.target.value })}
            placeholder="input.value > 10"
            className="text-sm font-mono min-h-[60px]"
            rows={2}
          />
        </div>
      )}

      {data.conditionType === 'comparison' && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('operator')}</Label>
            <Select
              value={data.comparisonOperator || '=='}
              onValueChange={(value) => onUpdate({ comparisonOperator: value as ConditionalNodeData['comparisonOperator'] })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="==">Equals (==)</SelectItem>
                <SelectItem value="!=">Not Equals (!=)</SelectItem>
                <SelectItem value=">">Greater Than (&gt;)</SelectItem>
                <SelectItem value="<">Less Than (&lt;)</SelectItem>
                <SelectItem value=">=">Greater or Equal (&gt;=)</SelectItem>
                <SelectItem value="<=">Less or Equal (&lt;=)</SelectItem>
                <SelectItem value="contains">Contains</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('compareValue')}</Label>
            <Input
              value={data.comparisonValue || ''}
              onChange={(e) => onUpdate({ comparisonValue: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
        </>
      )}
    </div>
  );
}

// Code Node Configuration
interface CodeNodeConfigProps {
  data: CodeNodeData;
  onUpdate: (updates: Partial<CodeNodeData>) => void;
}

function CodeNodeConfig({ data, onUpdate }: CodeNodeConfigProps) {
  const t = useTranslations('workflowEditor');

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('language')}</Label>
        <Select
          value={data.language}
          onValueChange={(value) => onUpdate({ language: value as CodeNodeData['language'] })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="javascript">JavaScript</SelectItem>
            <SelectItem value="typescript">TypeScript</SelectItem>
            <SelectItem value="python">Python</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('code')}</Label>
        <div className="border rounded-md overflow-hidden">
          <MonacoEditor
            height="200px"
            language={data.language}
            theme="vs-dark"
            value={data.code}
            onChange={(value) => onUpdate({ code: value || '' })}
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: 2,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Loop Node Configuration
interface LoopNodeConfigProps {
  data: LoopNodeData;
  onUpdate: (updates: Partial<LoopNodeData>) => void;
}

function LoopNodeConfig({ data, onUpdate }: LoopNodeConfigProps) {
  const t = useTranslations('workflowEditor');

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('loopType')}</Label>
        <Select
          value={data.loopType}
          onValueChange={(value) => onUpdate({ loopType: value as LoopNodeData['loopType'] })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="forEach">For Each</SelectItem>
            <SelectItem value="while">While</SelectItem>
            <SelectItem value="times">Times</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('iteratorVariable')}</Label>
        <Input
          value={data.iteratorVariable}
          onChange={(e) => onUpdate({ iteratorVariable: e.target.value })}
          placeholder="item"
          className="h-8 text-sm font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('maxIterations')}</Label>
        <Input
          type="number"
          value={data.maxIterations}
          onChange={(e) => onUpdate({ maxIterations: parseInt(e.target.value) || 100 })}
          className="h-8 text-sm"
        />
      </div>

      {data.loopType === 'forEach' && (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('collection')}</Label>
          <Input
            value={data.collection || ''}
            onChange={(e) => onUpdate({ collection: e.target.value })}
            placeholder="input.items"
            className="h-8 text-sm font-mono"
          />
        </div>
      )}

      {data.loopType === 'while' && (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('condition')}</Label>
          <Textarea
            value={data.condition || ''}
            onChange={(e) => onUpdate({ condition: e.target.value })}
            placeholder="index < 10"
            className="text-sm font-mono min-h-[60px]"
            rows={2}
          />
        </div>
      )}
    </div>
  );
}

// Human Node Configuration
interface HumanNodeConfigProps {
  data: HumanNodeData;
  onUpdate: (updates: Partial<HumanNodeData>) => void;
}

function HumanNodeConfig({ data, onUpdate }: HumanNodeConfigProps) {
  const t = useTranslations('workflowEditor');

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('approvalMessage')}</Label>
        <Textarea
          value={data.approvalMessage}
          onChange={(e) => onUpdate({ approvalMessage: e.target.value })}
          className="text-sm min-h-[60px]"
          rows={2}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('timeout')} (seconds)</Label>
        <Input
          type="number"
          value={data.timeout || ''}
          onChange={(e) => onUpdate({ timeout: parseInt(e.target.value) || undefined })}
          placeholder="3600"
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('assignee')}</Label>
        <Input
          value={data.assignee || ''}
          onChange={(e) => onUpdate({ assignee: e.target.value })}
          placeholder={t('assigneePlaceholder')}
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('defaultAction')}</Label>
        <Select
          value={data.defaultAction || 'timeout'}
          onValueChange={(value) => onUpdate({ defaultAction: value as HumanNodeData['defaultAction'] })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="approve">Approve</SelectItem>
            <SelectItem value="reject">Reject</SelectItem>
            <SelectItem value="timeout">Timeout</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Start Node Configuration
interface StartNodeConfigProps {
  data: StartNodeData;
  onUpdate: (updates: Partial<StartNodeData>) => void;
}

function StartNodeConfig({ data, onUpdate }: StartNodeConfigProps) {
  const t = useTranslations('workflowEditor');

  return (
    <div className="space-y-3">
      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          {t('startNodeDescription') || 'Configure the workflow inputs. These will be available to all subsequent nodes.'}
        </p>
      </div>
      <IOSchemaEditor
        schema={data.workflowInputs || {}}
        onChange={(workflowInputs) => onUpdate({ workflowInputs } as Partial<StartNodeData>)}
        type="input"
      />
    </div>
  );
}

// End Node Configuration
interface EndNodeConfigProps {
  data: EndNodeData;
  onUpdate: (updates: Partial<EndNodeData>) => void;
}

function EndNodeConfig({ data, onUpdate }: EndNodeConfigProps) {
  const t = useTranslations('workflowEditor');

  return (
    <div className="space-y-3">
      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          {t('endNodeDescription') || 'Configure the workflow outputs. Map values from previous nodes to the final output.'}
        </p>
      </div>
      <IOSchemaEditor
        schema={data.workflowOutputs || {}}
        onChange={(workflowOutputs) => onUpdate({ workflowOutputs })}
        type="output"
      />
    </div>
  );
}

// Parallel Node Configuration
interface ParallelNodeConfigProps {
  data: ParallelNodeData;
  onUpdate: (updates: Partial<ParallelNodeData>) => void;
}

function ParallelNodeConfig({ data, onUpdate }: ParallelNodeConfigProps) {
  const t = useTranslations('workflowEditor');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{t('waitForAll') || 'Wait for all branches'}</Label>
        <Switch
          checked={data.waitForAll}
          onCheckedChange={(waitForAll) => onUpdate({ waitForAll })}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('maxConcurrency') || 'Max Concurrency'}</Label>
        <Input
          type="number"
          value={data.maxConcurrency || ''}
          onChange={(e) => onUpdate({ maxConcurrency: parseInt(e.target.value) || undefined })}
          placeholder="Unlimited"
          className="h-8 text-sm"
          min={1}
        />
        <p className="text-xs text-muted-foreground">
          {t('maxConcurrencyHint') || 'Maximum number of branches to execute simultaneously'}
        </p>
      </div>

      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          {t('parallelNodeHint') || 'Connect multiple nodes to this parallel node to execute them concurrently.'}
        </p>
      </div>
    </div>
  );
}

// Delay Node Configuration
interface DelayNodeConfigProps {
  data: DelayNodeData;
  onUpdate: (updates: Partial<DelayNodeData>) => void;
}

function DelayNodeConfig({ data, onUpdate }: DelayNodeConfigProps) {
  const t = useTranslations('workflowEditor');

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('delayType') || 'Delay Type'}</Label>
        <Select
          value={data.delayType}
          onValueChange={(value) => onUpdate({ delayType: value as DelayNodeData['delayType'] })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixed Duration</SelectItem>
            <SelectItem value="until">Until Time</SelectItem>
            <SelectItem value="cron">Cron Schedule</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data.delayType === 'fixed' && (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('delayDuration') || 'Duration (ms)'}</Label>
          <Input
            type="number"
            value={data.delayMs || ''}
            onChange={(e) => onUpdate({ delayMs: parseInt(e.target.value) || undefined })}
            placeholder="1000"
            className="h-8 text-sm"
            min={0}
          />
          <p className="text-xs text-muted-foreground">
            {data.delayMs ? `${(data.delayMs / 1000).toFixed(1)} seconds` : 'Enter delay in milliseconds'}
          </p>
        </div>
      )}

      {data.delayType === 'until' && (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('untilTime') || 'Until Time'}</Label>
          <Input
            type="datetime-local"
            value={data.untilTime || ''}
            onChange={(e) => onUpdate({ untilTime: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
      )}

      {data.delayType === 'cron' && (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('cronExpression') || 'Cron Expression'}</Label>
          <Input
            value={data.cronExpression || ''}
            onChange={(e) => onUpdate({ cronExpression: e.target.value })}
            placeholder="0 * * * *"
            className="h-8 text-sm font-mono"
          />
          <p className="text-xs text-muted-foreground">
            {t('cronHint') || 'e.g., "0 * * * *" for every hour'}
          </p>
        </div>
      )}
    </div>
  );
}

// Subworkflow Node Configuration
interface SubworkflowNodeConfigProps {
  data: SubworkflowNodeData;
  onUpdate: (updates: Partial<SubworkflowNodeData>) => void;
}

function SubworkflowNodeConfig({ data, onUpdate }: SubworkflowNodeConfigProps) {
  const t = useTranslations('workflowEditor');

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('workflowId') || 'Workflow ID'}</Label>
        <Input
          value={data.workflowId}
          onChange={(e) => onUpdate({ workflowId: e.target.value })}
          placeholder="workflow-123"
          className="h-8 text-sm font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('workflowName') || 'Workflow Name'}</Label>
        <Input
          value={data.workflowName || ''}
          onChange={(e) => onUpdate({ workflowName: e.target.value })}
          placeholder="My Subworkflow"
          className="h-8 text-sm"
        />
      </div>

      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          {t('subworkflowHint') || 'Configure input and output mappings in the Inputs and Outputs tabs.'}
        </p>
      </div>
    </div>
  );
}

// Webhook Node Configuration
interface WebhookNodeConfigProps {
  data: WebhookNodeData;
  onUpdate: (updates: Partial<WebhookNodeData>) => void;
}

function WebhookNodeConfig({ data, onUpdate }: WebhookNodeConfigProps) {
  const t = useTranslations('workflowEditor');

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('webhookUrl') || 'Webhook URL'}</Label>
        <Input
          value={data.webhookUrl || ''}
          onChange={(e) => onUpdate({ webhookUrl: e.target.value })}
          placeholder="https://api.example.com/webhook"
          className="h-8 text-sm font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('httpMethod') || 'HTTP Method'}</Label>
        <Select
          value={data.method}
          onValueChange={(value) => onUpdate({ method: value as WebhookNodeData['method'] })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('requestBody') || 'Request Body'}</Label>
        <Textarea
          value={data.body || ''}
          onChange={(e) => onUpdate({ body: e.target.value })}
          placeholder='{"key": "value"}'
          className="text-sm font-mono min-h-[80px]"
          rows={3}
        />
      </div>

      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          {t('webhookHint') || 'Configure headers and authentication in the advanced settings.'}
        </p>
      </div>
    </div>
  );
}

// Transform Node Configuration
interface TransformNodeConfigProps {
  data: TransformNodeData;
  onUpdate: (updates: Partial<TransformNodeData>) => void;
}

function TransformNodeConfig({ data, onUpdate }: TransformNodeConfigProps) {
  const t = useTranslations('workflowEditor');

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('transformType') || 'Transform Type'}</Label>
        <Select
          value={data.transformType}
          onValueChange={(value) => onUpdate({ transformType: value as TransformNodeData['transformType'] })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="map">Map</SelectItem>
            <SelectItem value="filter">Filter</SelectItem>
            <SelectItem value="reduce">Reduce</SelectItem>
            <SelectItem value="sort">Sort</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('transformExpression') || 'Expression'}</Label>
        <Textarea
          value={data.expression}
          onChange={(e) => onUpdate({ expression: e.target.value })}
          placeholder="item => item.value * 2"
          className="text-sm font-mono min-h-[80px]"
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          {t('transformExpressionHint') || 'Use JavaScript arrow function syntax'}
        </p>
      </div>
    </div>
  );
}

// Merge Node Configuration
interface MergeNodeConfigProps {
  data: MergeNodeData;
  onUpdate: (updates: Partial<MergeNodeData>) => void;
}

function MergeNodeConfig({ data, onUpdate }: MergeNodeConfigProps) {
  const t = useTranslations('workflowEditor');

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('mergeStrategy') || 'Merge Strategy'}</Label>
        <Select
          value={data.mergeStrategy}
          onValueChange={(value) => onUpdate({ mergeStrategy: value as MergeNodeData['mergeStrategy'] })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="concat">Concat (Array)</SelectItem>
            <SelectItem value="merge">Merge (Object)</SelectItem>
            <SelectItem value="first">First Value</SelectItem>
            <SelectItem value="last">Last Value</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          {t('mergeHint') || 'Connect multiple branches to this node to merge their outputs.'}
        </p>
      </div>
    </div>
  );
}

// Group Node Configuration
interface GroupNodeConfigProps {
  data: GroupNodeData;
  onUpdate: (updates: Partial<GroupNodeData>) => void;
}

const GROUP_COLORS = [
  { name: 'Gray', value: '#6b7280' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Yellow', value: '#eab308' },
];

function GroupNodeConfig({ data, onUpdate }: GroupNodeConfigProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Group Color</Label>
        <div className="grid grid-cols-4 gap-2">
          {GROUP_COLORS.map((color) => (
            <button
              key={color.value}
              className={cn(
                'h-8 rounded-md border-2 transition-all hover:scale-105',
                data.color === color.value ? 'border-foreground ring-2 ring-offset-2' : 'border-transparent'
              )}
              style={{ backgroundColor: color.value }}
              onClick={() => onUpdate({ color: color.value })}
              title={color.name}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Size</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Min Width</Label>
            <Input
              type="number"
              value={data.minWidth || 200}
              onChange={(e) => onUpdate({ minWidth: parseInt(e.target.value) || 200 })}
              className="h-8 text-sm"
              min={100}
              max={800}
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Min Height</Label>
            <Input
              type="number"
              value={data.minHeight || 150}
              onChange={(e) => onUpdate({ minHeight: parseInt(e.target.value) || 150 })}
              className="h-8 text-sm"
              min={80}
              max={600}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs">Collapsed</Label>
          <p className="text-xs text-muted-foreground">Minimize the group</p>
        </div>
        <Switch
          checked={data.isCollapsed}
          onCheckedChange={(isCollapsed) => onUpdate({ isCollapsed })}
        />
      </div>

      {data.childNodeIds && data.childNodeIds.length > 0 && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs font-medium mb-1">Grouped Nodes</p>
          <p className="text-xs text-muted-foreground">
            {data.childNodeIds.length} node(s) in this group
          </p>
        </div>
      )}
    </div>
  );
}

// Annotation Node Configuration
interface AnnotationNodeConfigProps {
  data: AnnotationNodeData;
  onUpdate: (updates: Partial<AnnotationNodeData>) => void;
}

const ANNOTATION_COLORS = [
  { name: 'Yellow', value: '#fef08a' },
  { name: 'Blue', value: '#bfdbfe' },
  { name: 'Green', value: '#bbf7d0' },
  { name: 'Pink', value: '#fbcfe8' },
  { name: 'Purple', value: '#ddd6fe' },
  { name: 'Orange', value: '#fed7aa' },
  { name: 'Gray', value: '#e5e7eb' },
  { name: 'White', value: '#ffffff' },
];

function AnnotationNodeConfig({ data, onUpdate }: AnnotationNodeConfigProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Content</Label>
        <Textarea
          value={data.content || ''}
          onChange={(e) => onUpdate({ content: e.target.value })}
          placeholder="Enter your note..."
          className="text-sm min-h-[100px]"
          rows={4}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Background Color</Label>
        <div className="grid grid-cols-4 gap-2">
          {ANNOTATION_COLORS.map((color) => (
            <button
              key={color.value}
              className={cn(
                'h-8 rounded-md border-2 transition-all hover:scale-105',
                data.color === color.value ? 'border-foreground ring-2 ring-offset-2' : 'border-muted'
              )}
              style={{ backgroundColor: color.value }}
              onClick={() => onUpdate({ color: color.value })}
              title={color.name}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Font Size</Label>
        <Select
          value={data.fontSize || 'medium'}
          onValueChange={(value) => onUpdate({ fontSize: value as AnnotationNodeData['fontSize'] })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">Small</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="large">Large</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs">Show Border</Label>
          <p className="text-xs text-muted-foreground">Display a border around the note</p>
        </div>
        <Switch
          checked={data.showBorder}
          onCheckedChange={(showBorder) => onUpdate({ showBorder })}
        />
      </div>
    </div>
  );
}

// IO Schema Editor
type IOSchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array';

interface IOSchemaValue {
  type: IOSchemaType;
  description: string;
  required?: boolean;
}

interface IOSchemaEditorProps {
  schema: Record<string, IOSchemaValue>;
  onChange: (schema: Record<string, IOSchemaValue>) => void;
  type: 'input' | 'output';
}

function IOSchemaEditor({ schema, onChange, type }: IOSchemaEditorProps) {
  const t = useTranslations('workflowEditor');
  const entries = Object.entries(schema);

  const handleAdd = () => {
    const newKey = `${type}_${Date.now()}`;
    onChange({
      ...schema,
      [newKey]: { type: 'string', description: '', required: false },
    });
  };

  const handleRemove = (key: string) => {
    const { [key]: _, ...rest } = schema;
    onChange(rest);
  };

  const handleUpdate = (key: string, updates: Partial<IOSchemaValue>) => {
    onChange({
      ...schema,
      [key]: { ...schema[key], ...updates },
    });
  };

  const handleRename = (oldKey: string, newKey: string) => {
    if (oldKey === newKey || !newKey) return;
    const { [oldKey]: value, ...rest } = schema;
    onChange({ ...rest, [newKey]: value });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">
          {type === 'input' ? t('inputParameters') : t('outputParameters')}
        </Label>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={handleAdd}
        >
          <Plus className="h-3 w-3 mr-1" />
          {t('add')}
        </Button>
      </div>

      {entries.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          {t('noParameters')}
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, value]) => (
            <div key={key} className="border rounded-lg p-2 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={key}
                  onChange={(e) => handleRename(key, e.target.value)}
                  className="h-7 text-xs font-mono flex-1"
                  placeholder={t('parameterName')}
                />
                <Select
                  value={value.type}
                  onValueChange={(type) => handleUpdate(key, { type: type as IOSchemaType })}
                >
                  <SelectTrigger className="h-7 text-xs w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="object">Object</SelectItem>
                    <SelectItem value="array">Array</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => handleRemove(key)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <Input
                value={value.description}
                onChange={(e) => handleUpdate(key, { description: e.target.value })}
                className="h-7 text-xs"
                placeholder={t('parameterDescription')}
              />
              <div className="flex items-center gap-2">
                <Switch
                  id={`required-${key}`}
                  checked={value.required}
                  onCheckedChange={(required) => handleUpdate(key, { required })}
                />
                <Label htmlFor={`required-${key}`} className="text-xs">
                  {t('required')}
                </Label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NodeConfigPanel;
