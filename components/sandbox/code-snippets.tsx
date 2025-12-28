'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  BookMarked,
  Copy,
  Edit2,
  FileCode,
  FolderOpen,
  MoreVertical,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSnippets, useTagsCategories } from '@/hooks/use-sandbox-db';
import type {
  CodeSnippet,
  CreateSnippetRequest,
  ExecutionResult,
  SnippetFilter,
} from '@/types/sandbox';
import { getLanguageInfo, LANGUAGE_INFO } from '@/types/sandbox';

interface CodeSnippetsProps {
  className?: string;
  onExecuteSnippet?: (result: ExecutionResult) => void;
  onInsertCode?: (code: string, language: string) => void;
}

interface SnippetFormData {
  title: string;
  description: string;
  language: string;
  code: string;
  tags: string[];
  category: string;
  is_template: boolean;
}

const EMPTY_FORM: SnippetFormData = {
  title: '',
  description: '',
  language: 'python',
  code: '',
  tags: [],
  category: '',
  is_template: false,
};

function SnippetCard({
  snippet,
  onEdit,
  onDelete,
  onExecute,
  onCopy,
}: {
  snippet: CodeSnippet;
  onEdit: () => void;
  onDelete: () => void;
  onExecute: () => void;
  onCopy: () => void;
}) {
  const langInfo = getLanguageInfo(snippet.language);

  return (
    <div className="group border rounded-lg p-3 hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{langInfo.icon}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">
                {snippet.title}
              </span>
              {snippet.is_template && (
                <Badge variant="outline" className="text-xs">
                  模板
                </Badge>
              )}
            </div>
            {snippet.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {snippet.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onExecute}
                >
                  <Play className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>运行</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onCopy}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>复制代码</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <pre className="text-xs bg-muted/50 rounded p-2 mt-2 overflow-hidden max-h-20 text-muted-foreground">
        {snippet.code.slice(0, 300)}
        {snippet.code.length > 300 && '...'}
      </pre>

      <div className="flex items-center justify-between mt-2">
        <div className="flex flex-wrap gap-1">
          {snippet.category && (
            <Badge variant="secondary" className="text-xs">
              <FolderOpen className="h-3 w-3 mr-1" />
              {snippet.category}
            </Badge>
          )}
          {snippet.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {snippet.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{snippet.tags.length - 3}
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          使用 {snippet.usage_count} 次
        </span>
      </div>
    </div>
  );
}

function SnippetForm({
  initialData,
  availableCategories,
  availableTags,
  onSubmit,
  onCancel,
  isEditing,
}: {
  initialData: SnippetFormData;
  availableCategories: string[];
  availableTags: string[];
  onSubmit: (data: SnippetFormData) => void;
  onCancel: () => void;
  isEditing: boolean;
}) {
  const [form, setForm] = useState<SnippetFormData>(initialData);
  const [newTag, setNewTag] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const handleSubmit = () => {
    if (form.title.trim() && form.code.trim()) {
      onSubmit(form);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !form.tags.includes(newTag.trim())) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">标题 *</Label>
        <Input
          id="title"
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="代码片段标题"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">描述</Label>
        <Input
          id="description"
          value={form.description}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="简短描述 (可选)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>语言</Label>
          <Select
            value={form.language}
            onValueChange={(v) => setForm((prev) => ({ ...prev, language: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LANGUAGE_INFO).map(([id, info]) => (
                <SelectItem key={id} value={id}>
                  <span className="flex items-center gap-2">
                    <span>{info.icon}</span>
                    <span>{info.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>分类</Label>
          <Select
            value={form.category || '__none__'}
            onValueChange={(v) => {
              if (v === '__new__') {
                setNewCategory('');
              } else if (v === '__none__') {
                setForm((prev) => ({ ...prev, category: '' }));
              } else {
                setForm((prev) => ({ ...prev, category: v }));
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">无分类</SelectItem>
              {availableCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
              <SelectItem value="__new__">+ 新建分类</SelectItem>
            </SelectContent>
          </Select>
          {form.category === '' && newCategory !== undefined && (
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onBlur={() => {
                if (newCategory.trim()) {
                  setForm((prev) => ({ ...prev, category: newCategory.trim() }));
                }
              }}
              placeholder="输入新分类名称"
              className="mt-2"
            />
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="code">代码 *</Label>
        <Textarea
          id="code"
          value={form.code}
          onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
          placeholder="在此输入代码..."
          className="font-mono text-sm min-h-[200px]"
        />
      </div>

      <div className="space-y-2">
        <Label>标签</Label>
        <div className="flex flex-wrap gap-1 mb-2">
          {form.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="cursor-pointer hover:bg-destructive/20"
              onClick={() => removeTag(tag)}
            >
              {tag} ×
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="添加标签"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addTag}>
            添加
          </Button>
        </div>
        {availableTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="text-xs text-muted-foreground mr-1">建议:</span>
            {availableTags
              .filter((t) => !form.tags.includes(t))
              .slice(0, 5)
              .map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-accent"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }))
                  }
                >
                  + {tag}
                </Badge>
              ))}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="template"
          checked={form.is_template}
          onCheckedChange={(checked) =>
            setForm((prev) => ({ ...prev, is_template: checked }))
          }
        />
        <Label htmlFor="template">标记为模板</Label>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button onClick={handleSubmit} disabled={!form.title.trim() || !form.code.trim()}>
          {isEditing ? '保存' : '创建'}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function CodeSnippets({
  className,
  onExecuteSnippet,
  onInsertCode,
}: CodeSnippetsProps) {
  const [filter, setFilter] = useState<SnippetFilter>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<CodeSnippet | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'templates'>('all');

  const { tags: availableTags, categories: availableCategories } =
    useTagsCategories();

  const appliedFilter = useMemo(
    () => ({
      ...filter,
      search_query: searchQuery || undefined,
      is_template: activeTab === 'templates' ? true : undefined,
    }),
    [filter, searchQuery, activeTab]
  );

  const {
    snippets,
    loading,
    error,
    refresh,
    createSnippet,
    updateSnippet,
    deleteSnippet,
    executeSnippet,
  } = useSnippets({ filter: appliedFilter });

  const handleCreate = useCallback(
    async (data: SnippetFormData) => {
      const request: CreateSnippetRequest = {
        title: data.title,
        description: data.description || undefined,
        language: data.language,
        code: data.code,
        tags: data.tags,
        category: data.category || undefined,
        is_template: data.is_template,
      };
      const snippet = await createSnippet(request);
      if (snippet) {
        setShowCreateDialog(false);
      }
    },
    [createSnippet]
  );

  const handleUpdate = useCallback(
    async (data: SnippetFormData) => {
      if (!editingSnippet) return;
      const updated: CodeSnippet = {
        ...editingSnippet,
        title: data.title,
        description: data.description || null,
        language: data.language,
        code: data.code,
        tags: data.tags,
        category: data.category || null,
        is_template: data.is_template,
        updated_at: new Date().toISOString(),
      };
      await updateSnippet(updated);
      setEditingSnippet(null);
    },
    [editingSnippet, updateSnippet]
  );

  const handleDelete = useCallback(async () => {
    if (deleteConfirmId) {
      await deleteSnippet(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, deleteSnippet]);

  const handleExecute = useCallback(
    async (id: string) => {
      const result = await executeSnippet(id);
      if (result && onExecuteSnippet) {
        onExecuteSnippet(result);
      }
    },
    [executeSnippet, onExecuteSnippet]
  );

  const handleCopy = useCallback(
    (snippet: CodeSnippet) => {
      if (onInsertCode) {
        onInsertCode(snippet.code, snippet.language);
      } else {
        navigator.clipboard.writeText(snippet.code);
      }
    },
    [onInsertCode]
  );

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex items-center justify-between gap-2 p-3 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <BookMarked className="h-4 w-4" />
          代码片段
        </h3>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => refresh()}
                >
                  <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>刷新</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            新建
          </Button>
        </div>
      </div>

      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索片段..."
            className="pl-8 h-9"
          />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'templates')}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              全部
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex-1">
              模板
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <Select
            value={filter.language || 'all'}
            onValueChange={(v) =>
              setFilter((prev) => ({
                ...prev,
                language: v === 'all' ? undefined : v,
              }))
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="语言" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有语言</SelectItem>
              {Object.entries(LANGUAGE_INFO).map(([id, info]) => (
                <SelectItem key={id} value={id}>
                  {info.icon} {info.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filter.category || 'all'}
            onValueChange={(v) =>
              setFilter((prev) => ({
                ...prev,
                category: v === 'all' ? undefined : v,
              }))
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有分类</SelectItem>
              {availableCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {loading && snippets.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              <p className="text-sm">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => refresh()}
              >
                重试
              </Button>
            </div>
          ) : snippets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">暂无代码片段</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setShowCreateDialog(true)}
              >
                创建第一个片段
              </Button>
            </div>
          ) : (
            snippets.map((snippet) => (
              <SnippetCard
                key={snippet.id}
                snippet={snippet}
                onEdit={() => setEditingSnippet(snippet)}
                onDelete={() => setDeleteConfirmId(snippet.id)}
                onExecute={() => handleExecute(snippet.id)}
                onCopy={() => handleCopy(snippet)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新建代码片段</DialogTitle>
            <DialogDescription>
              创建一个新的代码片段，可以随时重复使用。
            </DialogDescription>
          </DialogHeader>
          <SnippetForm
            initialData={EMPTY_FORM}
            availableCategories={availableCategories}
            availableTags={availableTags}
            onSubmit={handleCreate}
            onCancel={() => setShowCreateDialog(false)}
            isEditing={false}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingSnippet}
        onOpenChange={() => setEditingSnippet(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑代码片段</DialogTitle>
          </DialogHeader>
          {editingSnippet && (
            <SnippetForm
              initialData={{
                title: editingSnippet.title,
                description: editingSnippet.description || '',
                language: editingSnippet.language,
                code: editingSnippet.code,
                tags: editingSnippet.tags,
                category: editingSnippet.category || '',
                is_template: editingSnippet.is_template,
              }}
              availableCategories={availableCategories}
              availableTags={availableTags}
              onSubmit={handleUpdate}
              onCancel={() => setEditingSnippet(null)}
              isEditing={true}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这个代码片段吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CodeSnippets;
