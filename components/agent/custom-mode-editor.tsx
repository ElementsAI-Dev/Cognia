'use client';

/**
 * CustomModeEditor - Comprehensive editor for creating and editing custom agent modes
 * Features: icon selection, tool selection, A2UI template integration, and more
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import * as Icons from 'lucide-react';
import {
  Bot,
  ChevronDown,
  ChevronRight,
  Plus,
  Wand2,
  Check,
  X,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useCustomModeStore,
  type CustomModeConfig,
  type CustomModeCategory,
  type McpToolReference,
  type ModeTemplate,
  TOOL_CATEGORIES,
  AVAILABLE_MODE_ICONS,
  MODE_TEMPLATES,
  PROMPT_TEMPLATE_VARIABLES,
  checkToolAvailability,
} from '@/stores/agent/custom-mode-store';
import { useMcpStore } from '@/stores/mcp/mcp-store';
import { useSettingsStore } from '@/stores/settings/settings-store';
import { AlertTriangle } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface CustomModeEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: CustomModeConfig;
  onSave?: (mode: CustomModeConfig) => void;
}

interface IconSelectorProps {
  value: string;
  onChange: (icon: string) => void;
}

interface ToolSelectorProps {
  value: string[];
  onChange: (tools: string[]) => void;
}

interface McpToolSelectorProps {
  value: McpToolReference[];
  onChange: (tools: McpToolReference[]) => void;
}

interface TemplateSelectorProps {
  onSelect: (template: ModeTemplate) => void;
}

// =============================================================================
// Template Selector Component
// =============================================================================

function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const t = useTranslations('customMode');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{t('templates') || 'Quick Start Templates'}</Label>
        <Badge variant="outline">{MODE_TEMPLATES.length} {t('available') || 'available'}</Badge>
      </div>
      <ScrollArea className="h-[180px]">
        <div className="grid grid-cols-2 gap-2 pr-4">
          {MODE_TEMPLATES.map((template) => {
            const Icon = (Icons[template.icon as keyof typeof Icons] as Icons.LucideIcon) || Bot;
            return (
              <Card
                key={template.id}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => onSelect(template)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{template.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// =============================================================================
// Icon Selector Component
// =============================================================================

function IconSelector({ value, onChange }: IconSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const t = useTranslations('customMode');

  const filteredIcons = useMemo(() => {
    if (!search) return AVAILABLE_MODE_ICONS;
    const lowerSearch = search.toLowerCase();
    return AVAILABLE_MODE_ICONS.filter((icon) =>
      icon.toLowerCase().includes(lowerSearch)
    );
  }, [search]);

  const CurrentIcon = (Icons[value as keyof typeof Icons] as Icons.LucideIcon) || Bot;

  return (
    <div className="space-y-2">
      <Label>{t('icon')}</Label>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <div className="flex items-center gap-2">
              <CurrentIcon className="h-4 w-4" />
              <span>{value}</span>
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="space-y-2">
            <Input
              placeholder={t('searchIcons')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <ScrollArea className="h-[200px] border rounded-md p-2">
              <div className="grid grid-cols-8 gap-1">
                {filteredIcons.map((iconName) => {
                  const Icon = (Icons[iconName as keyof typeof Icons] as Icons.LucideIcon) || Bot;
                  const isSelected = value === iconName;
                  return (
                    <Tooltip key={iconName}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={isSelected ? 'default' : 'ghost'}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            onChange(iconName);
                            setIsOpen(false);
                          }}
                        >
                          <Icon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>{iconName}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// =============================================================================
// Tool Selector Component
// =============================================================================

function ToolSelector({ value, onChange }: ToolSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const t = useTranslations('customMode');

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleTool = (tool: string) => {
    if (value.includes(tool)) {
      onChange(value.filter((t) => t !== tool));
    } else {
      onChange([...value, tool]);
    }
  };

  const toggleAllInCategory = (tools: readonly string[]) => {
    const allSelected = tools.every((t) => value.includes(t));
    if (allSelected) {
      onChange(value.filter((t) => !tools.includes(t)));
    } else {
      const newTools = new Set([...value, ...tools]);
      onChange(Array.from(newTools));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t('tools')}</Label>
        <Badge variant="secondary">{value.length} {t('selected')}</Badge>
      </div>
      <ScrollArea className="h-[300px] border rounded-md">
        <div className="p-2 space-y-1">
          {Object.entries(TOOL_CATEGORIES).map(([key, category]) => {
            const isExpanded = expandedCategories.has(key);
            const selectedCount = category.tools.filter((t) => value.includes(t)).length;
            const Icon = (Icons[category.icon as keyof typeof Icons] as Icons.LucideIcon) || Settings;

            return (
              <Collapsible
                key={key}
                open={isExpanded}
                onOpenChange={() => toggleCategory(key)}
              >
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <Icon className="h-4 w-4" />
                      <span className="flex-1 text-left">{category.name}</span>
                      <Badge variant="outline" className="ml-2">
                        {selectedCount}/{category.tools.length}
                      </Badge>
                    </Button>
                  </CollapsibleTrigger>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleAllInCategory(category.tools)}
                  >
                    {selectedCount === category.tools.length ? (
                      <X className="h-4 w-4" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <CollapsibleContent>
                  <div className="ml-6 mt-1 space-y-1">
                    {category.tools.map((tool) => {
                      const isSelected = value.includes(tool);
                      return (
                        <Button
                          key={tool}
                          variant={isSelected ? 'secondary' : 'ghost'}
                          size="sm"
                          className="w-full justify-start text-xs"
                          onClick={() => toggleTool(tool)}
                        >
                          {isSelected && <Check className="h-3 w-3 mr-2" />}
                          {tool}
                        </Button>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// =============================================================================
// MCP Tool Selector Component
// =============================================================================

function McpToolSelector({ value, onChange }: McpToolSelectorProps) {
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());
  const t = useTranslations('customMode');
  const mcpServers = useMcpStore((state) => state.servers);

  const connectedServers = useMemo(() => 
    mcpServers.filter(s => s.status.type === 'connected'),
    [mcpServers]
  );

  const toggleServer = (serverId: string) => {
    const newExpanded = new Set(expandedServers);
    if (newExpanded.has(serverId)) {
      newExpanded.delete(serverId);
    } else {
      newExpanded.add(serverId);
    }
    setExpandedServers(newExpanded);
  };

  const isToolSelected = (serverId: string, toolName: string) => {
    return value.some(t => t.serverId === serverId && t.toolName === toolName);
  };

  const toggleTool = (serverId: string, toolName: string, displayName?: string) => {
    if (isToolSelected(serverId, toolName)) {
      onChange(value.filter(t => !(t.serverId === serverId && t.toolName === toolName)));
    } else {
      onChange([...value, { serverId, toolName, displayName }]);
    }
  };

  const toggleAllInServer = (serverId: string, tools: Array<{ name: string }>) => {
    const serverToolNames = tools.map(t => t.name);
    const allSelected = serverToolNames.every(name => isToolSelected(serverId, name));
    
    if (allSelected) {
      onChange(value.filter(t => t.serverId !== serverId));
    } else {
      const newTools = [...value.filter(t => t.serverId !== serverId)];
      for (const tool of tools) {
        newTools.push({ serverId, toolName: tool.name, displayName: tool.name });
      }
      onChange(newTools);
    }
  };

  if (connectedServers.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t('mcpTools') || 'MCP Tools'}</Label>
        </div>
        <div className="flex items-center justify-center h-[100px] border rounded-md text-muted-foreground text-sm">
          {t('noMcpServers') || 'No MCP servers connected'}
        </div>
      </div>
    );
  }

  const selectedCount = value.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t('mcpTools') || 'MCP Tools'}</Label>
        <Badge variant="secondary">{selectedCount} {t('selected')}</Badge>
      </div>
      <ScrollArea className="h-[200px] border rounded-md">
        <div className="p-2 space-y-1">
          {connectedServers.map((server) => {
            const isExpanded = expandedServers.has(server.id);
            const serverTools = server.tools || [];
            const selectedInServer = serverTools.filter(t => isToolSelected(server.id, t.name)).length;

            return (
              <Collapsible
                key={server.id}
                open={isExpanded}
                onOpenChange={() => toggleServer(server.id)}
              >
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <Settings className="h-4 w-4" />
                      <span className="flex-1 text-left truncate">{server.name}</span>
                      <Badge variant="outline" className="ml-2">
                        {selectedInServer}/{serverTools.length}
                      </Badge>
                    </Button>
                  </CollapsibleTrigger>
                  {serverTools.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAllInServer(server.id, serverTools)}
                    >
                      {selectedInServer === serverTools.length ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                <CollapsibleContent>
                  <div className="ml-6 mt-1 space-y-1">
                    {serverTools.map((tool) => {
                      const isSelected = isToolSelected(server.id, tool.name);
                      return (
                        <Tooltip key={tool.name}>
                          <TooltipTrigger asChild>
                            <Button
                              variant={isSelected ? 'secondary' : 'ghost'}
                              size="sm"
                              className="w-full justify-start text-xs"
                              onClick={() => toggleTool(server.id, tool.name, tool.name)}
                            >
                              {isSelected && <Check className="h-3 w-3 mr-2" />}
                              <span className="truncate">{tool.name}</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[300px]">
                            <p className="text-xs">{tool.description || 'No description'}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// =============================================================================
// Main Editor Component
// =============================================================================

export function CustomModeEditor({
  open,
  onOpenChange,
  mode,
  onSave,
}: CustomModeEditorProps) {
  const t = useTranslations('customMode');
  const tCommon = useTranslations('common');
  const { createMode, updateMode, generateModeFromDescription, isGenerating } = useCustomModeStore();

  const isEditing = !!mode;

  // Get provider settings for tool availability check
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const availableApiKeys = useMemo(() => ({
    tavily: !!providerSettings?.tavily?.apiKey,
    openai: !!providerSettings?.openai?.apiKey,
  }), [providerSettings]);

  // Form state
  const [name, setName] = useState(mode?.name || '');
  const [description, setDescription] = useState(mode?.description || '');
  const [icon, setIcon] = useState(mode?.icon || 'Bot');
  const [systemPrompt, setSystemPrompt] = useState(mode?.systemPrompt || '');
  const [tools, setTools] = useState<string[]>(mode?.tools || []);
  const [outputFormat, setOutputFormat] = useState<'text' | 'code' | 'html' | 'react' | 'markdown'>(
    mode?.outputFormat || 'text'
  );
  const [previewEnabled, setPreviewEnabled] = useState(mode?.previewEnabled || false);
  const [category, setCategory] = useState<CustomModeCategory>(mode?.category || 'other');
  const [tags, setTags] = useState<string[]>(mode?.tags || []);
  const [tagInput, setTagInput] = useState('');

  // Advanced settings
  const [modelOverride, setModelOverride] = useState(mode?.modelOverride || '');
  const [temperatureOverride, setTemperatureOverride] = useState(mode?.temperatureOverride);
  const [maxTokensOverride, setMaxTokensOverride] = useState(mode?.maxTokensOverride);
  const [a2uiEnabled, setA2UIEnabled] = useState(mode?.a2uiEnabled || false);

  // MCP Tools state
  const [mcpTools, setMcpTools] = useState<McpToolReference[]>(mode?.mcpTools || []);

  // Generation state
  const [generationPrompt, setGenerationPrompt] = useState('');

  // Reset form when mode changes
  const resetForm = useCallback(() => {
    setName(mode?.name || '');
    setDescription(mode?.description || '');
    setIcon(mode?.icon || 'Bot');
    setSystemPrompt(mode?.systemPrompt || '');
    setTools(mode?.tools || []);
    setOutputFormat(mode?.outputFormat || 'text');
    setPreviewEnabled(mode?.previewEnabled || false);
    setCategory(mode?.category || 'other');
    setTags(mode?.tags || []);
    setModelOverride(mode?.modelOverride || '');
    setTemperatureOverride(mode?.temperatureOverride);
    setMaxTokensOverride(mode?.maxTokensOverride);
    setA2UIEnabled(mode?.a2uiEnabled || false);
    setMcpTools(mode?.mcpTools || []);
  }, [mode]);

  // Handle tag input
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  // Handle AI generation
  const handleGenerate = async () => {
    if (!generationPrompt.trim()) return;

    try {
      const result = await generateModeFromDescription({
        description: generationPrompt,
        includeA2UI: a2uiEnabled,
      });

      // Apply generated values
      if (result.mode.name) setName(result.mode.name);
      if (result.mode.description) setDescription(result.mode.description);
      if (result.mode.icon) setIcon(result.mode.icon);
      if (result.mode.systemPrompt) setSystemPrompt(result.mode.systemPrompt);
      if (result.mode.tools) setTools(result.mode.tools);
      if (result.mode.outputFormat) setOutputFormat(result.mode.outputFormat);
      if (result.mode.category) setCategory(result.mode.category);
      if (result.mode.previewEnabled !== undefined) setPreviewEnabled(result.mode.previewEnabled);
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };

  // Handle template selection
  const handleTemplateSelect = useCallback((template: ModeTemplate) => {
    setName(template.name);
    setDescription(template.description);
    setIcon(template.icon);
    setSystemPrompt(template.systemPrompt);
    setTools(template.tools);
    setOutputFormat(template.outputFormat);
    setCategory(template.category);
    setTags(template.tags);
    setPreviewEnabled(template.previewEnabled || false);
  }, []);

  // Handle save
  const handleSave = () => {
    const modeData: Partial<CustomModeConfig> = {
      name: name.trim() || 'Unnamed Mode',
      description: description.trim(),
      icon,
      systemPrompt: systemPrompt.trim(),
      tools,
      outputFormat,
      previewEnabled,
      category,
      tags,
      modelOverride: modelOverride || undefined,
      temperatureOverride,
      maxTokensOverride,
      a2uiEnabled,
      mcpTools,
    };

    let savedMode: CustomModeConfig;
    if (isEditing && mode) {
      updateMode(mode.id, modeData);
      savedMode = { ...mode, ...modeData } as CustomModeConfig;
    } else {
      savedMode = createMode(modeData);
    }

    onSave?.(savedMode);
    onOpenChange(false);
  };

  // Validate form
  const isValid = name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('editMode') : t('createMode')}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t('editModeDesc') : t('createModeDesc')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">{t('basic')}</TabsTrigger>
            <TabsTrigger value="tools">{t('tools')}</TabsTrigger>
            <TabsTrigger value="advanced">{t('advanced')}</TabsTrigger>
            <TabsTrigger value="generate">{t('aiGenerate')}</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            {/* Basic Settings */}
            <TabsContent value="basic" className="space-y-4 pr-4">
              {/* Template Selector - only show when creating new mode */}
              {!isEditing && (
                <TemplateSelector onSelect={handleTemplateSelect} />
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('name')} *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('namePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">{t('category')}</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as CustomModeCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="productivity">{t('categoryProductivity')}</SelectItem>
                      <SelectItem value="creative">{t('categoryCreative')}</SelectItem>
                      <SelectItem value="technical">{t('categoryTechnical')}</SelectItem>
                      <SelectItem value="research">{t('categoryResearch')}</SelectItem>
                      <SelectItem value="education">{t('categoryEducation')}</SelectItem>
                      <SelectItem value="business">{t('categoryBusiness')}</SelectItem>
                      <SelectItem value="personal">{t('categoryPersonal')}</SelectItem>
                      <SelectItem value="other">{t('categoryOther')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('description')}</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('descriptionPlaceholder')}
                />
              </div>

              <IconSelector value={icon} onChange={setIcon} />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prompt">{t('systemPrompt')}</Label>
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
                        <Wand2 className="h-3 w-3" />
                        {t('templateVars') || 'Variables'}
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="absolute z-10 mt-1 p-2 bg-popover border rounded-md shadow-md w-[280px]">
                      <p className="text-xs text-muted-foreground mb-2">
                        {t('templateVarsHint') || 'Click to insert. Variables are replaced at runtime.'}
                      </p>
                      <div className="space-y-1">
                        {Object.entries(PROMPT_TEMPLATE_VARIABLES).map(([variable, description]) => (
                          <Button
                            key={variable}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs h-auto py-1"
                            onClick={() => setSystemPrompt(prev => prev + variable)}
                          >
                            <code className="text-primary mr-2">{variable}</code>
                            <span className="text-muted-foreground truncate">{description}</span>
                          </Button>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
                <Textarea
                  id="prompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder={t('systemPromptPlaceholder')}
                  className="min-h-[150px] font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('tags')}</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder={t('addTag')}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button variant="outline" size="icon" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button onClick={() => removeTag(tag)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tools Selection */}
            <TabsContent value="tools" className="space-y-4 pr-4">
              {/* Tool availability warnings */}
              {tools.length > 0 && (() => {
                const { unavailable } = checkToolAvailability(tools, availableApiKeys);
                if (unavailable.length > 0) {
                  return (
                    <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                          {t('toolsUnavailable') || 'Some tools require configuration'}
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {unavailable.map(({ tool, reason }) => (
                            <li key={tool}>• <code className="text-yellow-600 dark:text-yellow-400">{tool}</code>: {reason}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              <ToolSelector value={tools} onChange={setTools} />
              <McpToolSelector value={mcpTools} onChange={setMcpTools} />
            </TabsContent>

            {/* Advanced Settings */}
            <TabsContent value="advanced" className="space-y-4 pr-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{t('outputSettings')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('outputFormat')}</Label>
                    <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as typeof outputFormat)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">{t('formatText')}</SelectItem>
                        <SelectItem value="markdown">{t('formatMarkdown')}</SelectItem>
                        <SelectItem value="code">{t('formatCode')}</SelectItem>
                        <SelectItem value="html">{t('formatHTML')}</SelectItem>
                        <SelectItem value="react">{t('formatReact')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('livePreview')}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t('livePreviewDesc')}
                      </p>
                    </div>
                    <Switch
                      checked={previewEnabled}
                      onCheckedChange={setPreviewEnabled}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{t('modelSettings')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('modelOverride')}</Label>
                    <Input
                      value={modelOverride}
                      onChange={(e) => setModelOverride(e.target.value)}
                      placeholder={t('modelOverridePlaceholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>{t('temperature')}</Label>
                      <span className="text-sm text-muted-foreground">
                        {temperatureOverride !== undefined ? temperatureOverride.toFixed(1) : t('default')}
                      </span>
                    </div>
                    <Slider
                      value={[temperatureOverride ?? 0.7]}
                      onValueChange={([v]) => setTemperatureOverride(v)}
                      min={0}
                      max={2}
                      step={0.1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('maxTokens')}</Label>
                    <Input
                      type="number"
                      value={maxTokensOverride || ''}
                      onChange={(e) => setMaxTokensOverride(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder={t('maxTokensPlaceholder')}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{t('a2uiSettings')}</CardTitle>
                  <CardDescription>{t('a2uiSettingsDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('enableA2UI')}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t('enableA2UIDesc')}
                      </p>
                    </div>
                    <Switch
                      checked={a2uiEnabled}
                      onCheckedChange={setA2UIEnabled}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Mode Preview Summary */}
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    {t('modePreview') || 'Mode Preview'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const IconComp = (Icons[icon as keyof typeof Icons] as Icons.LucideIcon) || Bot;
                      return (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <IconComp className="h-5 w-5 text-primary" />
                        </div>
                      );
                    })()}
                    <div>
                      <p className="font-medium">{name || 'Unnamed Mode'}</p>
                      <p className="text-xs text-muted-foreground">{description || 'No description'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-muted rounded">
                      <span className="text-muted-foreground">Category:</span>{' '}
                      <span className="font-medium">{category}</span>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <span className="text-muted-foreground">Output:</span>{' '}
                      <span className="font-medium">{outputFormat}</span>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <span className="text-muted-foreground">Tools:</span>{' '}
                      <span className="font-medium">{tools.length + mcpTools.length}</span>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <span className="text-muted-foreground">Preview:</span>{' '}
                      <span className="font-medium">{previewEnabled ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Generation */}
            <TabsContent value="generate" className="space-y-4 pr-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5" />
                    {t('generateFromDescription')}
                  </CardTitle>
                  <CardDescription>
                    {t('generateFromDescriptionDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={generationPrompt}
                    onChange={(e) => setGenerationPrompt(e.target.value)}
                    placeholder={t('generationPromptPlaceholder')}
                    className="min-h-[100px]"
                  />
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="include-a2ui"
                        checked={a2uiEnabled}
                        onCheckedChange={setA2UIEnabled}
                      />
                      <Label htmlFor="include-a2ui">{t('includeA2UITemplate')}</Label>
                    </div>
                    <Button
                      onClick={handleGenerate}
                      disabled={!generationPrompt.trim() || isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <Icons.Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t('generating')}
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 mr-2" />
                          {t('generate')}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{t('examples')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      t('exampleCoding'),
                      t('exampleResearch'),
                      t('exampleWriting'),
                      t('exampleData'),
                    ].map((example, i) => (
                      <Button
                        key={i}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs h-auto py-2 whitespace-normal text-left"
                        onClick={() => setGenerationPrompt(example)}
                      >
                        {example}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {isEditing ? tCommon('save') : t('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CustomModeEditor;
