'use client';

/**
 * Memory Settings - manage AI memory preferences and stored memories
 */

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Brain, Plus, Trash2, Edit2, Check, X, Search, Download, Upload, Tag, Settings2, Pin, Star, Eye, Clock, Zap, Globe, RefreshCw, CheckSquare, Square, Cloud, HardDrive, Key, Workflow } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { EmptyState } from '@/components/layout/feedback/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useMemoryStore } from '@/stores';
import type { Memory, MemoryType, MemoryScope, CreateMemoryInput } from '@/types';

const MEMORY_TYPE_COLORS: Record<MemoryType, string> = {
  preference: 'bg-blue-500',
  fact: 'bg-green-500',
  instruction: 'bg-purple-500',
  context: 'bg-orange-500',
};

export function MemorySettings() {
  const t = useTranslations('memory');
  const tCommon = useTranslations('common');
  const {
    memories,
    settings,
    updateSettings,
    createMemory,
    updateMemory,
    deleteMemory,
    clearAllMemories,
    exportMemories,
    importMemories,
    getMemoryStats,
    getAllTags,
    togglePin,
    findSimilarMemories,
    getMemoriesForPrompt,
  } = useMemoryStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; imported: number; errors: string[] } | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [similarWarning, setSimilarWarning] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<MemoryType | 'all'>('all');
  const [scopeFilter, setScopeFilter] = useState<MemoryScope | 'all'>('all');
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [selectedMemories, setSelectedMemories] = useState<Set<string>>(new Set());
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get batch operations from store
  const batchDelete = useMemoryStore((state) => state.batchDelete);
  const batchSetEnabled = useMemoryStore((state) => state.batchSetEnabled);
  const cleanupExpired = useMemoryStore((state) => state.cleanupExpired);
  const cleanupOldUnused = useMemoryStore((state) => state.cleanupOldUnused);

  // New memory form state
  const [newMemory, setNewMemory] = useState<CreateMemoryInput>({
    type: 'preference',
    content: '',
    category: '',
    tags: [],
  });

  // Filter memories by search query, type, and scope, then sort (pinned first)
  const filteredMemories = memories
    .filter((m) => {
      // Type filter
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
      // Scope filter
      if (scopeFilter !== 'all' && (m.scope || 'global') !== scopeFilter) return false;
      // Search query filter
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        return (
          m.content.toLowerCase().includes(lowerQuery) ||
          m.category?.toLowerCase().includes(lowerQuery) ||
          m.tags?.some((t) => t.toLowerCase().includes(lowerQuery))
        );
      }
      return true;
    })
    .sort((a, b) => {
      // Pinned first
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      // Then by priority (default 5)
      const priorityA = a.priority ?? 5;
      const priorityB = b.priority ?? 5;
      if (priorityA !== priorityB) return priorityB - priorityA;
      // Then by most recently used
      return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
    });

  // Handle batch selection (used by MemoryItem checkbox if needed)
  const _toggleMemorySelection = (id: string) => {
    setSelectedMemories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };
  void _toggleMemorySelection; // Silence lint - available for future use

  const selectAllFiltered = () => {
    setSelectedMemories(new Set(filteredMemories.map((m) => m.id)));
  };

  const clearSelection = () => {
    setSelectedMemories(new Set());
  };

  const handleBatchDelete = () => {
    batchDelete(Array.from(selectedMemories));
    clearSelection();
  };

  const handleBatchEnable = (enabled: boolean) => {
    batchSetEnabled(Array.from(selectedMemories), enabled);
    clearSelection();
  };

  const handleCleanup = () => {
    cleanupExpired();
    cleanupOldUnused(settings.cleanupDays || 60);
    setShowCleanupDialog(false);
  };

  // Check for similar memories when content changes
  const checkSimilarity = (content: string) => {
    if (content.length > 10) {
      const similar = findSimilarMemories(content);
      setSimilarWarning(similar.slice(0, 3).map((m) => m.content.substring(0, 50) + '...'));
    } else {
      setSimilarWarning([]);
    }
  };

  const stats = getMemoryStats();
  const allTags = getAllTags();

  // Export memories to file
  const handleExport = () => {
    const data = exportMemories();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cognia-memories-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import memories from file
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = importMemories(e.target?.result as string);
      setImportResult(result);
      setTimeout(() => setImportResult(null), 5000);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Add tag to new memory
  const handleAddTag = () => {
    if (tagInput.trim() && !newMemory.tags?.includes(tagInput.trim())) {
      setNewMemory((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  // Remove tag from new memory
  const handleRemoveTag = (tag: string) => {
    setNewMemory((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag) || [],
    }));
  };

  const handleCreateMemory = () => {
    if (!newMemory.content.trim()) return;

    createMemory({
      ...newMemory,
      tags: newMemory.tags?.filter(Boolean),
    });

    setNewMemory({
      type: 'preference',
      content: '',
      category: '',
      tags: [],
    });
    setIsAddDialogOpen(false);
  };

  const handleUpdateMemory = (memory: Memory) => {
    if (!memory.content.trim()) return;

    updateMemory(memory.id, {
      content: memory.content,
      type: memory.type,
      category: memory.category,
      tags: memory.tags,
    });

    setEditingMemory(null);
  };

  return (
    <TooltipProvider>
    <div className="space-y-4">
      {/* Import Result Alert */}
      {importResult && (
        <Alert className={importResult.success ? 'border-green-500' : 'border-destructive'}>
          <AlertDescription className="text-xs">
            {importResult.success
              ? t('importSuccess', { count: importResult.imported })
              : t('importFailed', { error: importResult.errors[0] })}
            {importResult.errors.length > 1 && ` ${t('moreWarnings', { count: importResult.errors.length - 1 })}`}
          </AlertDescription>
        </Alert>
      )}

      {/* Settings Card - Compact with grid layout for toggles */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-muted-foreground" />
            {t('title')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Core toggles */}
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5 min-w-0 flex-1 mr-2">
                <Label htmlFor="memory-enabled" className="text-sm">{t('enableMemory')}</Label>
                <p className="text-[10px] text-muted-foreground line-clamp-2">
                  {t('enableMemoryDesc')}
                </p>
              </div>
              <Switch
                id="memory-enabled"
                checked={settings.enabled}
                onCheckedChange={(enabled) => updateSettings({ enabled })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5 min-w-0 flex-1 mr-2">
                <Label htmlFor="auto-infer" className="text-sm">{t('autoDetect')}</Label>
                <p className="text-[10px] text-muted-foreground line-clamp-2">
                  {t('autoDetectDesc')}
                </p>
              </div>
              <Switch
                id="auto-infer"
                checked={settings.autoInfer}
                onCheckedChange={(autoInfer) => updateSettings({ autoInfer })}
                disabled={!settings.enabled}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5 min-w-0 flex-1 mr-2">
                <Label htmlFor="inject-prompt" className="text-sm">{t('injectPrompt')}</Label>
                <p className="text-[10px] text-muted-foreground line-clamp-2">
                  {t('injectPromptDesc')}
                </p>
              </div>
              <Switch
                id="inject-prompt"
                checked={settings.injectInSystemPrompt}
                onCheckedChange={(injectInSystemPrompt) =>
                  updateSettings({ injectInSystemPrompt })
                }
                disabled={!settings.enabled}
              />
            </div>
          </div>

          {/* Advanced Settings */}
          <Collapsible open={showAdvancedSettings} onOpenChange={setShowAdvancedSettings}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Settings2 className="h-3.5 w-3.5" />
                  {t('advancedSettings') || 'Advanced Settings'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {showAdvancedSettings ? '−' : '+'}
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              {/* Max Memories Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('maxMemories') || 'Max Memories'}</Label>
                  <span className="text-xs text-muted-foreground">{settings.maxMemories}</span>
                </div>
                <Slider
                  value={[settings.maxMemories]}
                  onValueChange={([value]) => updateSettings({ maxMemories: value })}
                  min={10}
                  max={500}
                  step={10}
                  disabled={!settings.enabled}
                />
                <p className="text-[10px] text-muted-foreground">
                  {t('maxMemoriesDesc') || 'Maximum number of memories to store. Oldest will be removed when limit is reached.'}
                </p>
              </div>

              {/* Memory Stats */}
              <div className="grid grid-cols-3 gap-1.5 text-center sm:grid-cols-5">
                <div className="rounded-lg border p-2 bg-muted/30">
                  <div className="text-base font-bold">{stats.total}</div>
                  <div className="text-[9px] text-muted-foreground">{t('total') || 'Total'}</div>
                </div>
                <div className="rounded-lg border p-2 bg-muted/30">
                  <div className="text-base font-bold">{stats.enabled}</div>
                  <div className="text-[9px] text-muted-foreground">{t('active') || 'Active'}</div>
                </div>
                <div className="rounded-lg border p-2 border-primary/30 bg-primary/5">
                  <div className="text-base font-bold text-primary">{stats.pinned}</div>
                  <div className="text-[9px] text-muted-foreground">{t('pinned') || 'Pinned'}</div>
                </div>
                <div className="rounded-lg border p-2 bg-muted/30">
                  <div className="text-base font-bold">{stats.byType.preference + stats.byType.fact}</div>
                  <div className="text-[9px] text-muted-foreground">{t('factsPrefs') || 'Facts/Prefs'}</div>
                </div>
                <div className="rounded-lg border p-2 bg-muted/30">
                  <div className="text-base font-bold">{allTags.length}</div>
                  <div className="text-[9px] text-muted-foreground">{t('tags') || 'Tags'}</div>
                </div>
              </div>

              {/* Provider Selection */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-1.5">
                  <Cloud className="h-3.5 w-3.5" />
                  {t('memoryProvider') || 'Memory Provider'}
                </Label>
                <Select
                  value={settings.provider}
                  onValueChange={(provider: 'local' | 'mem0') => updateSettings({ provider })}
                  disabled={!settings.enabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">
                      <span className="flex items-center gap-2">
                        <HardDrive className="h-3.5 w-3.5" />
                        {t('localProvider') || 'Local Storage'}
                      </span>
                    </SelectItem>
                    <SelectItem value="mem0">
                      <span className="flex items-center gap-2">
                        <Cloud className="h-3.5 w-3.5" />
                        {t('mem0Provider') || 'Mem0 (Cloud)'}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  {settings.provider === 'mem0' 
                    ? (t('mem0ProviderDesc') || 'Use Mem0 cloud service for advanced memory management with 26% higher accuracy')
                    : (t('localProviderDesc') || 'Store memories locally in your browser')
                  }
                </p>
              </div>

              {/* Mem0 Configuration (only show when mem0 selected) */}
              {settings.provider === 'mem0' && (
                <div className="space-y-3 pl-4 border-l-2 border-primary/30 bg-primary/5 p-3 rounded-r-lg">
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5" />
                      {t('mem0ApiKey') || 'Mem0 API Key'}
                    </Label>
                    <Input
                      type="password"
                      placeholder="m0-..."
                      value={settings.mem0ApiKey || ''}
                      onChange={(e) => updateSettings({ mem0ApiKey: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">{t('mem0UserId') || 'User ID'}</Label>
                    <Input
                      placeholder={t('mem0UserIdPlaceholder') || 'your-unique-id'}
                      value={settings.mem0UserId || ''}
                      onChange={(e) => updateSettings({ mem0UserId: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="mem0-graph" className="text-sm">
                      {t('mem0EnableGraph') || 'Enable Graph Memory'}
                    </Label>
                    <Switch
                      id="mem0-graph"
                      checked={settings.mem0EnableGraph || false}
                      onCheckedChange={(mem0EnableGraph) => updateSettings({ mem0EnableGraph })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="mem0-mcp" className="text-sm">
                      {t('mem0UseMcp') || 'Use MCP Server'}
                    </Label>
                    <Switch
                      id="mem0-mcp"
                      checked={settings.mem0UseMcp || false}
                      onCheckedChange={(mem0UseMcp) => updateSettings({ mem0UseMcp })}
                    />
                  </div>
                  {settings.mem0UseMcp && (
                    <div className="space-y-2">
                      <Label className="text-sm">{t('mem0McpServerId') || 'MCP Server ID'}</Label>
                      <Input
                        placeholder="mem0"
                        value={settings.mem0McpServerId || ''}
                        onChange={(e) => updateSettings({ mem0McpServerId: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Pipeline Settings */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5 min-w-0 flex-1 mr-2">
                  <Label htmlFor="enable-pipeline" className="text-sm flex items-center gap-1.5">
                    <Workflow className="h-3.5 w-3.5" />
                    {t('enablePipeline') || 'Smart Extraction'}
                  </Label>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">
                    {t('enablePipelineDesc') || 'Use two-phase pipeline for intelligent memory extraction (26% more accurate)'}
                  </p>
                </div>
                <Switch
                  id="enable-pipeline"
                  checked={settings.enablePipeline}
                  onCheckedChange={(enablePipeline) => updateSettings({ enablePipeline })}
                  disabled={!settings.enabled}
                />
              </div>

              {/* Semantic Search Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5 min-w-0 flex-1 mr-2">
                  <Label htmlFor="semantic-search" className="text-sm flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" />
                    {t('semanticSearch') || 'Semantic Search'}
                  </Label>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">
                    {t('semanticSearchDesc') || 'Use AI embeddings for smarter memory retrieval'}
                  </p>
                </div>
                <Switch
                  id="semantic-search"
                  checked={settings.enableSemanticSearch}
                  onCheckedChange={(enableSemanticSearch) => updateSettings({ enableSemanticSearch })}
                  disabled={!settings.enabled}
                />
              </div>

              {/* Auto Decay Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5 min-w-0 flex-1 mr-2">
                  <Label htmlFor="auto-decay" className="text-sm flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {t('autoDecay') || 'Memory Decay'}
                  </Label>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">
                    {t('autoDecayDesc') || 'Reduce relevance of unused memories over time'}
                  </p>
                </div>
                <Switch
                  id="auto-decay"
                  checked={settings.autoDecay}
                  onCheckedChange={(autoDecay) => updateSettings({ autoDecay })}
                  disabled={!settings.enabled}
                />
              </div>

              {/* Decay Days Slider (only show if auto decay enabled) */}
              {settings.autoDecay && (
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{t('decayDays') || 'Decay Period'}</Label>
                    <span className="text-xs text-muted-foreground">{settings.decayDays} {t('days') || 'days'}</span>
                  </div>
                  <Slider
                    value={[settings.decayDays]}
                    onValueChange={([value]) => updateSettings({ decayDays: value })}
                    min={7}
                    max={90}
                    step={7}
                    disabled={!settings.enabled}
                  />
                </div>
              )}

              {/* Auto Cleanup Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5 min-w-0 flex-1 mr-2">
                  <Label htmlFor="auto-cleanup" className="text-sm flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t('autoCleanup') || 'Auto Cleanup'}
                  </Label>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">
                    {t('autoCleanupDesc') || 'Automatically remove expired and unused memories'}
                  </p>
                </div>
                <Switch
                  id="auto-cleanup"
                  checked={settings.autoCleanup}
                  onCheckedChange={(autoCleanup) => updateSettings({ autoCleanup })}
                  disabled={!settings.enabled}
                />
              </div>

              {/* Default Scope */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  {t('defaultScope') || 'Default Scope'}
                </Label>
                <Select
                  value={settings.defaultScope}
                  onValueChange={(defaultScope: 'global' | 'session') => updateSettings({ defaultScope })}
                  disabled={!settings.enabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">{t('global') || 'Global'}</SelectItem>
                    <SelectItem value="session">{t('session') || 'Session'}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  {t('defaultScopeDesc') || 'New memories will use this scope by default'}
                </p>
              </div>

              {/* Import/Export */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExport} disabled={memories.length === 0}>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  {t('export') || 'Export'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {t('import') || 'Import'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </div>

              {/* Manual Cleanup Button */}
              <AlertDialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full" disabled={memories.length === 0}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    {t('cleanupNow') || 'Cleanup Old Memories'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('cleanupTitle') || 'Cleanup Memories'}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('cleanupDesc') || 'This will remove expired memories and memories that have not been used in a long time (except pinned ones).'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCleanup}>
                      {t('cleanup') || 'Cleanup'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Prompt Preview Card */}
      {settings.enabled && memories.filter((m) => m.enabled).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="h-4 w-4" />
                {t('promptPreview') || 'Prompt Preview'}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPromptPreview(!showPromptPreview)}
              >
                {showPromptPreview ? t('hide') || 'Hide' : t('show') || 'Show'}
              </Button>
            </div>
            <CardDescription className="text-xs">
              {t('promptPreviewDesc') || 'Preview how memories are injected into AI prompts'}
            </CardDescription>
          </CardHeader>
          {showPromptPreview && (
            <CardContent className="pt-0">
              <pre className="whitespace-pre-wrap text-xs bg-muted p-3 rounded-lg max-h-48 overflow-auto font-mono">
                {getMemoriesForPrompt() || t('noMemoriesInjected') || 'No memories will be injected (check settings)'}
              </pre>
            </CardContent>
          )}
        </Card>
      )}

      {/* Memories List Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{t('storedMemories')}</CardTitle>
              <CardDescription className="text-xs">
                {t('memoriesCount', { count: memories.length })}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    {t('addMemory')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('addMemory')}</DialogTitle>
                    <DialogDescription>
                      {t('addMemoryHint')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>{t('type')}</Label>
                      <Select
                        value={newMemory.type}
                        onValueChange={(type: MemoryType) =>
                          setNewMemory((prev) => ({ ...prev, type }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(['preference', 'fact', 'instruction', 'context'] as MemoryType[]).map((value) => (
                            <SelectItem key={value} value={value}>
                              {t(value)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('content')}</Label>
                      <Textarea
                        placeholder={t('contentPlaceholder')}
                        value={newMemory.content}
                        onChange={(e) => {
                          setNewMemory((prev) => ({ ...prev, content: e.target.value }));
                          checkSimilarity(e.target.value);
                        }}
                        rows={3}
                      />
                      {similarWarning.length > 0 && (
                        <Alert className="border-yellow-500/50 bg-yellow-500/10">
                          <AlertDescription className="text-xs">
                            <strong>{t('similarMemoriesFound') || 'Similar memories found:'}</strong>
                            <ul className="mt-1 list-disc list-inside">
                              {similarWarning.map((s, i) => (
                                <li key={i} className="truncate">{s}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>{t('category')}</Label>
                      <Input
                        placeholder={t('categoryPlaceholder')}
                        value={newMemory.category || ''}
                        onChange={(e) =>
                          setNewMemory((prev) => ({ ...prev, category: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5" />
                        {t('tags') || 'Tags'}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder={t('addTag') || 'Add tag...'}
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                          className="flex-1"
                        />
                        <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {newMemory.tags && newMemory.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {newMemory.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      {tCommon('cancel')}
                    </Button>
                    <Button onClick={handleCreateMemory} disabled={!newMemory.content.trim()}>
                      {tCommon('save')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {memories.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive">
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t('clearAll')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('clearAll')}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('clearConfirm')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={clearAllMemories}>
                        {t('clearAll')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Batch Operations Toolbar */}
          {selectedMemories.size > 0 && (
            <div className="flex items-center gap-2 mb-4 p-2 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">
                {selectedMemories.size} {t('selected') || 'selected'}
              </span>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => handleBatchEnable(true)}>
                {t('enableSelected') || 'Enable'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBatchEnable(false)}>
                {t('disableSelected') || 'Disable'}
              </Button>
              <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                {t('deleteSelected') || 'Delete'}
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Search and Filter */}
          <div className="flex gap-2 mb-4">
            <InputGroup className="flex-1">
              <InputGroupAddon align="inline-start">
                <Search className="h-4 w-4" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder={t('searchMemories')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as MemoryType | 'all')}>
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder={t('allTypes') || 'All Types'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allTypes') || 'All Types'}</SelectItem>
                {(['preference', 'fact', 'instruction', 'context'] as MemoryType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={scopeFilter} onValueChange={(v) => setScopeFilter(v as MemoryScope | 'all')}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder={t('allScopes') || 'All Scopes'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allScopes') || 'All Scopes'}</SelectItem>
                <SelectItem value="global">{t('global') || 'Global'}</SelectItem>
                <SelectItem value="session">{t('session') || 'Session'}</SelectItem>
              </SelectContent>
            </Select>
            {filteredMemories.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={selectedMemories.size === filteredMemories.length ? clearSelection : selectAllFiltered}
                className="px-2"
              >
                {selectedMemories.size === filteredMemories.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          {/* Memory List - Grid layout */}
          <div className="grid gap-2 sm:grid-cols-2">
            {filteredMemories.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  icon={Brain}
                  title={t('noMemories')}
                  description={searchQuery ? t('noMatchingMemories') || 'No memories match your search' : t('addMemoryHint')}
                  compact
                />
              </div>
            ) : (
              filteredMemories.map((memory) => (
                <MemoryItem
                  key={memory.id}
                  memory={memory}
                  isEditing={editingMemory?.id === memory.id}
                  editingMemory={editingMemory}
                  onEdit={() => setEditingMemory({ ...memory })}
                  onCancelEdit={() => setEditingMemory(null)}
                  onSaveEdit={() => editingMemory && handleUpdateMemory(editingMemory)}
                  onUpdateEditing={setEditingMemory}
                  onToggle={(enabled) => updateMemory(memory.id, { enabled })}
                  onTogglePin={() => togglePin(memory.id)}
                  onDelete={() => deleteMemory(memory.id)}
                  t={t}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}

interface MemoryItemProps {
  memory: Memory;
  isEditing: boolean;
  editingMemory: Memory | null;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onUpdateEditing: (memory: Memory | null) => void;
  onToggle: (enabled: boolean) => void;
  onTogglePin: () => void;
  onDelete: () => void;
  t: (key: string, values?: Record<string, string | number | Date>) => string;
}

function MemoryItem({
  memory,
  isEditing,
  editingMemory,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onUpdateEditing,
  onToggle,
  onTogglePin,
  onDelete,
  t,
}: MemoryItemProps) {
  if (isEditing && editingMemory) {
    return (
      <div className="p-3 border rounded-lg space-y-3">
        <Select
          value={editingMemory.type}
          onValueChange={(type: MemoryType) =>
            onUpdateEditing({ ...editingMemory, type })
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(['preference', 'fact', 'instruction', 'context'] as MemoryType[]).map((value) => (
              <SelectItem key={value} value={value}>
                {t(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          value={editingMemory.content}
          onChange={(e) =>
            onUpdateEditing({ ...editingMemory, content: e.target.value })
          }
          rows={2}
        />
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={onCancelEdit}>
            <X className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={onSaveEdit}>
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-3 border rounded-lg ${
        !memory.enabled ? 'opacity-50' : ''
      } ${memory.pinned ? 'border-primary/50 bg-primary/5' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {memory.pinned && (
              <Pin className="h-3 w-3 text-primary fill-primary" />
            )}
            <Badge
              variant="secondary"
              className={`${MEMORY_TYPE_COLORS[memory.type]} text-white text-xs`}
            >
              {t(memory.type)}
            </Badge>
            {memory.category && (
              <Badge variant="outline" className="text-xs">
                {memory.category}
              </Badge>
            )}
            {memory.priority !== undefined && memory.priority !== 5 && (
              <Badge variant="outline" className="text-xs">
                <Star className="h-2.5 w-2.5 mr-0.5" />
                {memory.priority}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {memory.source === 'inferred' ? t('autoDetected') : ''}
            </span>
          </div>
          <p className="text-sm">{memory.content}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('usedTimes', { count: memory.useCount })} • {t('created')}{' '}
            {memory.createdAt.toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className={`h-7 w-7 ${memory.pinned ? 'text-primary' : 'text-muted-foreground'}`}
            onClick={onTogglePin}
            title={memory.pinned ? t('unpin') || 'Unpin' : t('pin') || 'Pin'}
          >
            <Pin className={`h-3.5 w-3.5 ${memory.pinned ? 'fill-current' : ''}`} />
          </Button>
          <Switch
            checked={memory.enabled}
            onCheckedChange={onToggle}
            className="scale-75"
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MemorySettings;
