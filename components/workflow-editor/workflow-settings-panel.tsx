'use client';

/**
 * WorkflowSettingsPanel - Comprehensive workflow configuration panel
 */

import { useState, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useWorkflowEditorStore } from '@/stores/workflow';
import {
  Settings,
  Save,
  RotateCcw,
  Workflow,
  Grid3X3,
  Map,
  Clock,
  RefreshCw,
  Bug,
  Zap,
  Tag,
  Sparkles,
} from 'lucide-react';
import type { WorkflowSettings } from '@/types/workflow/workflow-editor';

const WORKFLOW_ICONS = [
  'Workflow', 'Sparkles', 'Zap', 'Globe', 'FileText', 'Settings', 'Code', 'Database'
];

const WORKFLOW_CATEGORIES = [
  'custom', 'automation', 'data-processing', 'ai-workflow', 'integration', 'utility'
];

interface WorkflowSettingsPanelProps {
  className?: string;
}

export function WorkflowSettingsPanel({ className }: WorkflowSettingsPanelProps) {
  const {
    currentWorkflow,
    updateWorkflowMeta,
    updateWorkflowSettings,
  } = useWorkflowEditorStore();

  const [tags, setTags] = useState<string[]>(currentWorkflow?.tags || []);
  const [newTag, setNewTag] = useState('');

  const settings = currentWorkflow?.settings;

  const handleSettingChange = useCallback(<K extends keyof WorkflowSettings>(
    key: K,
    value: WorkflowSettings[K]
  ) => {
    updateWorkflowSettings({ [key]: value });
  }, [updateWorkflowSettings]);

  const handleMetaChange = useCallback((updates: Partial<{ name: string; description: string; icon: string; category: string }>) => {
    updateWorkflowMeta(updates);
  }, [updateWorkflowMeta]);

  const handleAddTag = useCallback(() => {
    if (!newTag.trim()) return;
    const updatedTags = [...tags, newTag.trim()];
    setTags(updatedTags);
    updateWorkflowMeta({ tags: updatedTags });
    setNewTag('');
  }, [newTag, tags, updateWorkflowMeta]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    const updatedTags = tags.filter(t => t !== tagToRemove);
    setTags(updatedTags);
    updateWorkflowMeta({ tags: updatedTags });
  }, [tags, updateWorkflowMeta]);

  const handleResetSettings = useCallback(() => {
    updateWorkflowSettings({
      autoSave: true,
      autoLayout: false,
      showMinimap: true,
      showGrid: true,
      snapToGrid: true,
      gridSize: 20,
      retryOnFailure: true,
      maxRetries: 3,
      logLevel: 'info',
    });
  }, [updateWorkflowSettings]);

  if (!currentWorkflow || !settings) {
    return null;
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className={className}>
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Workflow Settings</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[450px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Workflow Settings
          </SheetTitle>
          <SheetDescription>
            Configure workflow properties and behavior
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)] mt-4 pr-4">
          <Accordion type="multiple" defaultValue={['general', 'editor', 'execution']} className="space-y-2">
            {/* General Settings */}
            <AccordionItem value="general" className="border rounded-lg px-3">
              <AccordionTrigger className="py-3 text-sm">
                <div className="flex items-center gap-2">
                  <Workflow className="h-4 w-4" />
                  General
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label>Workflow Name</Label>
                  <Input
                    value={currentWorkflow.name}
                    onChange={(e) => handleMetaChange({ name: e.target.value })}
                    placeholder="My Workflow"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={currentWorkflow.description}
                    onChange={(e) => handleMetaChange({ description: e.target.value })}
                    placeholder="Describe what this workflow does..."
                    rows={3}
                  />
                </div>

                {/* Icon & Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Icon</Label>
                    <Select
                      value={currentWorkflow.icon}
                      onValueChange={(value) => handleMetaChange({ icon: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WORKFLOW_ICONS.map(icon => (
                          <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={currentWorkflow.category}
                      onValueChange={(value) => handleMetaChange({ category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WORKFLOW_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {cat.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" />
                    Tags
                  </Label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {tags.map(tag => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive/20"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tag..."
                      className="h-8"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    />
                    <Button size="sm" onClick={handleAddTag}>Add</Button>
                  </div>
                </div>

                {/* Metadata display */}
                <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID</span>
                    <span className="font-mono">{currentWorkflow.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version</span>
                    <span>{currentWorkflow.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{new Date(currentWorkflow.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Modified</span>
                    <span>{new Date(currentWorkflow.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Editor Settings */}
            <AccordionItem value="editor" className="border rounded-lg px-3">
              <AccordionTrigger className="py-3 text-sm">
                <div className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  Editor
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-4">
                {/* Auto Save */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-1">
                      <Save className="h-3.5 w-3.5" />
                      Auto Save
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically save changes
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoSave}
                    onCheckedChange={(checked) => handleSettingChange('autoSave', checked)}
                  />
                </div>

                <Separator />

                {/* Show Grid */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-1">
                      <Grid3X3 className="h-3.5 w-3.5" />
                      Show Grid
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Display background grid
                    </p>
                  </div>
                  <Switch
                    checked={settings.showGrid}
                    onCheckedChange={(checked) => handleSettingChange('showGrid', checked)}
                  />
                </div>

                {/* Snap to Grid */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Snap to Grid</Label>
                    <p className="text-xs text-muted-foreground">
                      Align nodes to grid
                    </p>
                  </div>
                  <Switch
                    checked={settings.snapToGrid}
                    onCheckedChange={(checked) => handleSettingChange('snapToGrid', checked)}
                  />
                </div>

                {/* Grid Size */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Grid Size</Label>
                    <span className="text-sm text-muted-foreground">{settings.gridSize}px</span>
                  </div>
                  <Slider
                    value={[settings.gridSize]}
                    onValueChange={([value]) => handleSettingChange('gridSize', value)}
                    min={10}
                    max={50}
                    step={5}
                  />
                </div>

                <Separator />

                {/* Show Minimap */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-1">
                      <Map className="h-3.5 w-3.5" />
                      Show Minimap
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Display navigation minimap
                    </p>
                  </div>
                  <Switch
                    checked={settings.showMinimap}
                    onCheckedChange={(checked) => handleSettingChange('showMinimap', checked)}
                  />
                </div>

                {/* Auto Layout */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Layout</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically arrange new nodes
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoLayout}
                    onCheckedChange={(checked) => handleSettingChange('autoLayout', checked)}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Execution Settings */}
            <AccordionItem value="execution" className="border rounded-lg px-3">
              <AccordionTrigger className="py-3 text-sm">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Execution
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-4">
                {/* Default Model */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    Default AI Model
                  </Label>
                  <Select
                    value={settings.defaultModel || ''}
                    onValueChange={(value) => handleSettingChange('defaultModel', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                      <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4</SelectItem>
                      <SelectItem value="gemini-2.0-flash-exp">Gemini 2.0 Flash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Default Temperature */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Default Temperature</Label>
                    <span className="text-sm text-muted-foreground">
                      {settings.defaultTemperature ?? 0.7}
                    </span>
                  </div>
                  <Slider
                    value={[settings.defaultTemperature ?? 0.7]}
                    onValueChange={([value]) => handleSettingChange('defaultTemperature', value)}
                    min={0}
                    max={2}
                    step={0.1}
                  />
                </div>

                <Separator />

                {/* Retry on Failure */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-1">
                      <RefreshCw className="h-3.5 w-3.5" />
                      Retry on Failure
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically retry failed nodes
                    </p>
                  </div>
                  <Switch
                    checked={settings.retryOnFailure}
                    onCheckedChange={(checked) => handleSettingChange('retryOnFailure', checked)}
                  />
                </div>

                {/* Max Retries */}
                {settings.retryOnFailure && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Max Retries</Label>
                      <span className="text-sm text-muted-foreground">{settings.maxRetries}</span>
                    </div>
                    <Slider
                      value={[settings.maxRetries]}
                      onValueChange={([value]) => handleSettingChange('maxRetries', value)}
                      min={1}
                      max={10}
                      step={1}
                    />
                  </div>
                )}

                {/* Max Execution Time */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Max Execution Time (ms)
                  </Label>
                  <Input
                    type="number"
                    value={settings.maxExecutionTime || ''}
                    onChange={(e) => handleSettingChange('maxExecutionTime', parseInt(e.target.value) || undefined)}
                    placeholder="No limit"
                  />
                </div>

                <Separator />

                {/* Log Level */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Bug className="h-3.5 w-3.5" />
                    Log Level
                  </Label>
                  <Select
                    value={settings.logLevel}
                    onValueChange={(value) => handleSettingChange('logLevel', value as WorkflowSettings['logLevel'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debug">Debug (Verbose)</SelectItem>
                      <SelectItem value="info">Info (Default)</SelectItem>
                      <SelectItem value="warn">Warning</SelectItem>
                      <SelectItem value="error">Error Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Reset button */}
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResetSettings}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export default WorkflowSettingsPanel;
