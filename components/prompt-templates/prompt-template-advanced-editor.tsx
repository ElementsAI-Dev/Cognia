'use client';

/**
 * PromptTemplateAdvancedEditor
 * Advanced editor with real-time preview, variable visualization, version history, and AI optimization
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Save,
  Eye,
  Code2,
  History,
  Variable,
  Play,
  Copy,
  Check,
  Wand2,
  RotateCcw,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/sonner';
import type {
  PromptTemplate,
  PromptTemplateVersion,
  TemplateVariable,
  CreatePromptTemplateInput,
} from '@/types/content/prompt-template';
import { usePromptTemplateStore } from '@/stores';
import { buildTemplateVariables } from '@/lib/prompts/template-utils';

interface PromptTemplateAdvancedEditorProps {
  template?: PromptTemplate;
  categories: string[];
  onSubmit: (input: CreatePromptTemplateInput) => void;
  onCancel: () => void;
  onRequestOptimization?: (content: string) => Promise<string>;
}

export function PromptTemplateAdvancedEditor({
  template,
  categories,
  onSubmit,
  onCancel,
  onRequestOptimization,
}: PromptTemplateAdvancedEditorProps) {
  // Form state
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [content, setContent] = useState(template?.content || '');
  const [category, setCategory] = useState(template?.category || 'custom');
  const [tags, setTags] = useState<string[]>(template?.tags || []);
  const [tagInput, setTagInput] = useState('');
  
  // Variable editing
  const [variables, setVariables] = useState<TemplateVariable[]>(template?.variables || []);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  
  // UI state
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'variables' | 'history'>('edit');
  const [copied, setCopied] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [_showVersionHistory, _setShowVersionHistory] = useState(false);
  
  // Store access
  const saveVersion = usePromptTemplateStore(state => state.saveVersion);
  const getVersionHistory = usePromptTemplateStore(state => state.getVersionHistory);
  
  // Version history
  const versionHistory = useMemo(() => {
    if (!template?.id) return [];
    return getVersionHistory(template.id);
  }, [template?.id, getVersionHistory]);
  
  // Auto-detect variables from content
  useEffect(() => {
    const detected = buildTemplateVariables(content);
    // Merge with existing variable metadata
    setVariables(prev => {
      const prevMap = new Map(prev.map(v => [v.name, v]));
      return detected.map(d => ({
        ...d,
        ...prevMap.get(d.name),
      }));
    });
  }, [content]);
  
  // Generate preview with variable substitution
  const preview = useMemo(() => {
    let result = content;
    variables.forEach(v => {
      const value = variableValues[v.name] || v.sampleValue || v.defaultValue || `[${v.name}]`;
      const regex = new RegExp(`\\{\\{\\s*${v.name}\\s*\\}\\}`, 'g');
      result = result.replace(regex, value);
    });
    return result;
  }, [content, variables, variableValues]);
  
  // Check for unsaved changes
  const hasChanges = useMemo(() => {
    if (!template) return name || description || content;
    return (
      name !== template.name ||
      description !== (template.description || '') ||
      content !== template.content ||
      category !== template.category ||
      JSON.stringify(tags) !== JSON.stringify(template.tags)
    );
  }, [template, name, description, content, category, tags]);
  
  // Validation
  const validation = useMemo(() => {
    const errors: string[] = [];
    if (!name.trim()) errors.push('Name is required');
    if (!content.trim()) errors.push('Content is required');
    if (content.length > 50000) errors.push('Content exceeds 50,000 characters');
    return { isValid: errors.length === 0, errors };
  }, [name, content]);
  
  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  }, [tagInput, tags]);
  
  const handleRemoveTag = useCallback((tag: string) => {
    setTags(tags.filter(t => t !== tag));
  }, [tags]);
  
  const handleVariableChange = useCallback((name: string, field: keyof TemplateVariable, value: unknown) => {
    setVariables(vars => vars.map(v =>
      v.name === name ? { ...v, [field]: value } : v
    ));
  }, []);
  
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(preview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  }, [preview]);
  
  const handleOptimize = useCallback(async () => {
    if (!onRequestOptimization) return;
    
    setIsOptimizing(true);
    try {
      const optimized = await onRequestOptimization(content);
      setContent(optimized);
      toast.success('Prompt optimized!');
    } catch (error) {
      toast.error('Failed to optimize prompt');
      console.error(error);
    } finally {
      setIsOptimizing(false);
    }
  }, [content, onRequestOptimization]);
  
  const handleSaveVersion = useCallback(() => {
    if (!template?.id) return;
    saveVersion(template.id, 'Manual save');
    toast.success('Version saved');
  }, [template?.id, saveVersion]);
  
  const handleRestoreVersion = useCallback((version: PromptTemplateVersion) => {
    setContent(version.content);
    setVariables(version.variables);
    toast.success(`Restored to version ${version.version}`);
  }, []);
  
  const handleSubmit = useCallback(() => {
    if (!validation.isValid) {
      toast.error(validation.errors[0]);
      return;
    }
    
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      content,
      category,
      tags,
      variables,
    });
  }, [name, description, content, category, tags, variables, validation, onSubmit]);
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className="flex flex-col h-full min-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <Code2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">
              {template ? 'Edit Template' : 'New Template'}
            </h3>
            {hasChanges && (
              <span className="text-xs text-amber-600">Unsaved changes</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onRequestOptimization && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOptimize}
                  disabled={isOptimizing || !content.trim()}
                >
                  {isOptimizing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>AI Optimize</TooltipContent>
            </Tooltip>
          )}
          
          {template?.id && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleSaveVersion}>
                  <History className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save Version</TooltipContent>
            </Tooltip>
          )}
          
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!validation.isValid}
            className="gap-1.5"
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel - Editor */}
        <ResizablePanel defaultSize={60} minSize={40}>
          <div className="flex flex-col h-full">
            {/* Metadata */}
            <div className="p-4 space-y-4 border-b">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Template name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this template"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 items-center">
                  {tags.map(tag => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Add tag..."
                    className="w-24 h-7 text-xs"
                  />
                </div>
              </div>
            </div>
            
            {/* Content Editor */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20">
                <Label className="text-sm font-medium">Content *</Label>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{content.length} chars</span>
                  <span>•</span>
                  <span>{variables.length} variables</span>
                </div>
              </div>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your prompt template...

Use {{variable_name}} for variables that can be filled in later."
                className="flex-1 min-h-[200px] rounded-none border-0 resize-none font-mono text-sm"
              />
            </div>
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        {/* Right Panel - Preview/Variables/History */}
        <ResizablePanel defaultSize={40} minSize={30}>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="h-full flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b px-2">
              <TabsTrigger value="preview" className="gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="variables" className="gap-1.5">
                <Variable className="h-3.5 w-3.5" />
                Variables
                {variables.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {variables.length}
                  </Badge>
                )}
              </TabsTrigger>
              {template?.id && versionHistory.length > 0 && (
                <TabsTrigger value="history" className="gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  History
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {/* Variable Quick Fill */}
                  {variables.length > 0 && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Play className="h-4 w-4" />
                          Test Variables
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {variables.map(v => (
                          <div key={v.name} className="space-y-1">
                            <Label className="text-xs">
                              {v.name}
                              {v.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            <Input
                              value={variableValues[v.name] || ''}
                              onChange={(e) => setVariableValues({
                                ...variableValues,
                                [v.name]: e.target.value,
                              })}
                              placeholder={v.placeholder || v.sampleValue || v.defaultValue || `Enter ${v.name}`}
                              className="h-8 text-sm"
                            />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Preview Output */}
                  <Card>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Preview Output</CardTitle>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
                          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <pre className="whitespace-pre-wrap text-sm bg-muted/50 p-3 rounded-lg">
                        {preview || <span className="text-muted-foreground italic">Enter content to see preview</span>}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="variables" className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-3">
                  {variables.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Variable className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No variables detected</p>
                      <p className="text-xs">Use {"{{variable_name}}"} in your content</p>
                    </div>
                  ) : (
                    variables.map(v => (
                      <Card key={v.name}>
                        <CardHeader className="py-3">
                          <div className="flex items-center justify-between">
                            <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                              {`{{${v.name}}}`}
                            </code>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs">Required</Label>
                              <Switch
                                checked={v.required || false}
                                onCheckedChange={(checked) => handleVariableChange(v.name, 'required', checked)}
                              />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Description</Label>
                            <Input
                              value={v.description || ''}
                              onChange={(e) => handleVariableChange(v.name, 'description', e.target.value)}
                              placeholder="Describe this variable"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Type</Label>
                              <Select
                                value={v.type || 'text'}
                                onValueChange={(val) => handleVariableChange(v.name, 'type', val)}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="multiline">Multiline</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="boolean">Boolean</SelectItem>
                                  <SelectItem value="select">Select</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Default Value</Label>
                              <Input
                                value={v.defaultValue || ''}
                                onChange={(e) => handleVariableChange(v.name, 'defaultValue', e.target.value)}
                                placeholder="Default"
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Sample Value</Label>
                            <Input
                              value={v.sampleValue || ''}
                              onChange={(e) => handleVariableChange(v.name, 'sampleValue', e.target.value)}
                              placeholder="Example value for preview"
                              className="h-8 text-sm"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="history" className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-2">
                  {versionHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No version history</p>
                    </div>
                  ) : (
                    versionHistory.slice().reverse().map((version) => (
                      <Card key={version.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  v{version.version}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(version.createdAt)}
                                </span>
                              </div>
                              {version.changelog && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {version.changelog}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestoreVersion(version)}
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />
                              Restore
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
      
      {/* Validation Errors */}
      {!validation.isValid && (
        <div className="px-4 py-2 border-t bg-red-50 dark:bg-red-950/20">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="h-4 w-4" />
            {validation.errors.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}

export default PromptTemplateAdvancedEditor;
