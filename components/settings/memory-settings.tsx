'use client';

/**
 * Memory Settings - manage AI memory preferences and stored memories
 */

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Brain, Plus, Trash2, Edit2, Check, X, Search, Download, Upload, Tag, Settings2, Pin, Star, Eye } from 'lucide-react';
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
import { EmptyState } from '@/components/ui/empty-state';
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
import type { Memory, MemoryType, CreateMemoryInput } from '@/types';

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
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New memory form state
  const [newMemory, setNewMemory] = useState<CreateMemoryInput>({
    type: 'preference',
    content: '',
    category: '',
    tags: [],
  });

  // Filter memories by search query and type, then sort (pinned first)
  const filteredMemories = memories
    .filter((m) => {
      // Type filter
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
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
              ? `Successfully imported ${importResult.imported} memories.`
              : `Import failed: ${importResult.errors[0]}`}
            {importResult.errors.length > 1 && ` (+${importResult.errors.length - 1} warnings)`}
          </AlertDescription>
        </Alert>
      )}

      {/* Settings Card - Compact with grid layout for toggles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4" />
            {t('title')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Core toggles */}
          <div className="grid gap-3 sm:grid-cols-3">
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
              <div className="grid grid-cols-5 gap-2 text-center">
                <div className="rounded-lg border p-2">
                  <div className="text-lg font-bold">{stats.total}</div>
                  <div className="text-[10px] text-muted-foreground">{t('total') || 'Total'}</div>
                </div>
                <div className="rounded-lg border p-2">
                  <div className="text-lg font-bold">{stats.enabled}</div>
                  <div className="text-[10px] text-muted-foreground">{t('active') || 'Active'}</div>
                </div>
                <div className="rounded-lg border p-2 border-primary/30">
                  <div className="text-lg font-bold text-primary">{stats.pinned}</div>
                  <div className="text-[10px] text-muted-foreground">{t('pinned') || 'Pinned'}</div>
                </div>
                <div className="rounded-lg border p-2">
                  <div className="text-lg font-bold">{stats.byType.preference + stats.byType.fact}</div>
                  <div className="text-[10px] text-muted-foreground">{t('factsPrefs') || 'Facts/Prefs'}</div>
                </div>
                <div className="rounded-lg border p-2">
                  <div className="text-lg font-bold">{allTags.length}</div>
                  <div className="text-[10px] text-muted-foreground">{t('tags') || 'Tags'}</div>
                </div>
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
              <SelectTrigger className="w-[130px]">
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
          </div>

          {/* Memory List - Grid layout */}
          <div className="grid gap-3 lg:grid-cols-2">
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
