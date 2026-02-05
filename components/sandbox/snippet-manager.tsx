'use client';

/**
 * SnippetManager - Component for managing code snippets
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSnippets } from '@/hooks/sandbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit,
  Play,
  RefreshCw,
  Search,
  Tag,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Empty, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { LANGUAGE_INFO, type CodeSnippet } from '@/types/system/sandbox';

export interface SnippetManagerProps {
  className?: string;
  onSelectSnippet?: (code: string, language: string) => void;
  onExecuteSnippet?: (snippetId: string) => void;
}

interface SnippetFormData {
  title: string;
  description: string;
  language: string;
  code: string;
  tags: string;
  category: string;
  isTemplate: boolean;
}

const defaultFormData: SnippetFormData = {
  title: '',
  description: '',
  language: 'python',
  code: '',
  tags: '',
  category: '',
  isTemplate: false,
};

export function SnippetManager({
  className,
  onSelectSnippet,
  onExecuteSnippet,
}: SnippetManagerProps) {
  const t = useTranslations('sandbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<CodeSnippet | null>(null);
  const [formData, setFormData] = useState<SnippetFormData>(defaultFormData);

  const {
    snippets,
    loading,
    refresh,
    createSnippet,
    updateSnippet,
    deleteSnippet,
  } = useSnippets({
    filter: {
      language: languageFilter !== 'all' ? languageFilter : undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      search_query: searchQuery || undefined,
    },
  });

  const categories = [...new Set(snippets.map(s => s.category).filter(Boolean))] as string[];

  const handleCreate = useCallback(async () => {
    const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
    await createSnippet({
      title: formData.title,
      description: formData.description || undefined,
      language: formData.language,
      code: formData.code,
      tags,
      category: formData.category || undefined,
      is_template: formData.isTemplate,
    });
    setIsCreateDialogOpen(false);
    setFormData(defaultFormData);
  }, [formData, createSnippet]);

  const handleUpdate = useCallback(async () => {
    if (!editingSnippet) return;
    const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
    const updatedSnippet: CodeSnippet = {
      ...editingSnippet,
      title: formData.title,
      description: formData.description || null,
      language: formData.language,
      code: formData.code,
      tags,
      category: formData.category || null,
      is_template: formData.isTemplate,
      updated_at: new Date().toISOString(),
    };
    await updateSnippet(updatedSnippet);
    setEditingSnippet(null);
    setFormData(defaultFormData);
  }, [editingSnippet, formData, updateSnippet]);

  const handleEdit = useCallback((snippet: CodeSnippet) => {
    setEditingSnippet(snippet);
    setFormData({
      title: snippet.title,
      description: snippet.description || '',
      language: snippet.language,
      code: snippet.code,
      tags: snippet.tags.join(', '),
      category: snippet.category || '',
      isTemplate: snippet.is_template,
    });
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await deleteSnippet(id);
  }, [deleteSnippet]);

  const getLanguageInfo = (lang: string) => {
    return LANGUAGE_INFO[lang] || { name: lang, icon: '📄', color: '#666' };
  };

  const renderSnippetForm = (isEdit: boolean = false) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">{t('snippets.title')}</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder={t('snippets.titlePlaceholder')}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">{t('snippets.description')}</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder={t('snippets.descriptionPlaceholder')}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="language">{t('snippets.language')}</Label>
          <Select
            value={formData.language}
            onValueChange={(value) => setFormData({ ...formData, language: value })}
          >
            <SelectTrigger id="language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LANGUAGE_INFO).map(([key, info]) => (
                <SelectItem key={key} value={key}>
                  <span className="mr-2">{info.icon}</span>
                  {info.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">{t('snippets.category')}</Label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder={t('snippets.categoryPlaceholder')}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="code">{t('snippets.code')}</Label>
        <Textarea
          id="code"
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          placeholder={t('snippets.codePlaceholder')}
          className="font-mono min-h-[200px]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tags">{t('snippets.tags')}</Label>
        <Input
          id="tags"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder={t('snippets.tagsPlaceholder')}
        />
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="isTemplate"
          checked={formData.isTemplate}
          onCheckedChange={(checked) => setFormData({ ...formData, isTemplate: checked })}
        />
        <Label htmlFor="isTemplate">{t('snippets.markAsTemplate')}</Label>
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => {
            if (isEdit) {
              setEditingSnippet(null);
            } else {
              setIsCreateDialogOpen(false);
            }
            setFormData(defaultFormData);
          }}
        >
          {t('common.cancel')}
        </Button>
        <Button onClick={isEdit ? handleUpdate : handleCreate} disabled={!formData.title || !formData.code}>
          {isEdit ? t('common.save') : t('common.create')}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <CardTitle className="text-lg">{t('snippets.title')}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refresh()}
              disabled={loading}
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  {t('snippets.create')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t('snippets.createTitle')}</DialogTitle>
                  <DialogDescription>{t('snippets.createDescription')}</DialogDescription>
                </DialogHeader>
                {renderSnippetForm(false)}
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <CardDescription>{t('snippets.description')}</CardDescription>
      </CardHeader>

      <div className="px-6 pb-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('snippets.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={languageFilter} onValueChange={setLanguageFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('snippets.language')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('snippets.allLanguages')}</SelectItem>
              {Object.entries(LANGUAGE_INFO).map(([key, info]) => (
                <SelectItem key={key} value={key}>
                  <span className="mr-2">{info.icon}</span>
                  {info.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
              <FolderOpen className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t('snippets.category')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('snippets.allCategories')}</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[400px]">
          <div className="px-6 pb-6 space-y-2">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            ) : snippets.length === 0 ? (
              <Empty className="py-8 border-0">
                <EmptyMedia variant="icon">
                  <BookOpen className="h-6 w-6" />
                </EmptyMedia>
                <EmptyTitle>{t('snippets.empty')}</EmptyTitle>
              </Empty>
            ) : (
              snippets.map((snippet) => {
                const langInfo = getLanguageInfo(snippet.language);
                
                return (
                  <div
                    key={snippet.id}
                    className="group p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => onSelectSnippet?.(snippet.code, snippet.language)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{langInfo.icon}</span>
                          <span className="font-medium">{snippet.title}</span>
                          <Badge variant="outline" style={{ borderColor: langInfo.color }}>
                            {langInfo.name}
                          </Badge>
                          {snippet.is_template && (
                            <Badge variant="secondary">{t('snippets.template')}</Badge>
                          )}
                        </div>
                        {snippet.description && (
                          <p className="text-sm text-muted-foreground mb-1">
                            {snippet.description}
                          </p>
                        )}
                        <pre className="text-xs text-muted-foreground truncate font-mono">
                          {snippet.code.slice(0, 80)}
                          {snippet.code.length > 80 && '...'}
                        </pre>
                        <div className="flex items-center gap-2 mt-2">
                          {snippet.category && (
                            <Badge variant="outline" className="text-xs">
                              <FolderOpen className="h-3 w-3 mr-1" />
                              {snippet.category}
                            </Badge>
                          )}
                          {snippet.tags?.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                onExecuteSnippet?.(snippet.id);
                              }}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t('snippets.run')}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(snippet);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t('snippets.editSnippet')}</TooltipContent>
                        </Tooltip>
                        <AlertDialog>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>{t('snippets.deleteSnippet')}</TooltipContent>
                          </Tooltip>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('snippets.deleteConfirmTitle')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('snippets.deleteConfirmDescription')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(snippet.id)}>
                                {t('common.delete')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <Dialog open={!!editingSnippet} onOpenChange={(open) => !open && setEditingSnippet(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('snippets.editTitle')}</DialogTitle>
            <DialogDescription>{t('snippets.editDescription')}</DialogDescription>
          </DialogHeader>
          {renderSnippetForm(true)}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default SnippetManager;
