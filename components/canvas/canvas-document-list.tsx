'use client';

/**
 * CanvasDocumentList - Full document management panel for Canvas
 */

import { memo, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  FileCode,
  FileText,
  Search,
  Plus,
  MoreVertical,
  Trash2,
  Copy,
  Edit2,
  Clock,
  FolderOpen,
  SortAsc,
  SortDesc,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
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
import { cn } from '@/lib/utils';
import type { CanvasDocument, ArtifactLanguage } from '@/types';

interface CanvasDocumentListProps {
  documents: CanvasDocument[];
  activeDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  onCreateDocument: (options: {
    title: string;
    content: string;
    language: ArtifactLanguage;
    type: 'code' | 'text';
  }) => void;
  onRenameDocument: (id: string, title: string) => void;
  onDuplicateDocument: (id: string) => void;
  onDeleteDocument: (id: string) => void;
  className?: string;
}

type SortField = 'title' | 'updatedAt' | 'language';
type SortOrder = 'asc' | 'desc';

const LANGUAGE_OPTIONS: { value: ArtifactLanguage; label: string }[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'jsx', label: 'JSX' },
  { value: 'tsx', label: 'TSX' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'yaml', label: 'YAML' },
];

export const CanvasDocumentList = memo(function CanvasDocumentList({
  documents,
  activeDocumentId,
  onSelectDocument,
  onCreateDocument,
  onRenameDocument,
  onDuplicateDocument,
  onDeleteDocument,
  className,
}: CanvasDocumentListProps) {
  const t = useTranslations('canvas');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameDocId, setRenameDocId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // New document form state
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocLanguage, setNewDocLanguage] = useState<ArtifactLanguage>('javascript');
  const [newDocType, setNewDocType] = useState<'code' | 'text'>('code');

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    let result = [...documents];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (doc) =>
          doc.title.toLowerCase().includes(query) ||
          doc.content.toLowerCase().includes(query)
      );
    }

    // Apply language filter
    if (filterLanguage !== 'all') {
      result = result.filter((doc) => doc.language === filterLanguage);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'language':
          comparison = a.language.localeCompare(b.language);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [documents, searchQuery, sortField, sortOrder, filterLanguage]);

  const handleStartRename = (doc: CanvasDocument) => {
    setRenameDocId(doc.id);
    setRenameValue(doc.title);
    setRenameDialogOpen(true);
  };

  const handleConfirmRename = () => {
    if (renameDocId && renameValue.trim()) {
      onRenameDocument(renameDocId, renameValue.trim());
    }
    setRenameDialogOpen(false);
    setRenameDocId(null);
    setRenameValue('');
  };

  const handleCreateDocument = () => {
    if (newDocTitle.trim()) {
      onCreateDocument({
        title: newDocTitle.trim(),
        content: '',
        language: newDocLanguage,
        type: newDocType,
      });
      setNewDocTitle('');
      setNewDocLanguage('javascript');
      setNewDocType('code');
      setCreateDialogOpen(false);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('justNow');
    if (diffMins < 60) return t('minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('daysAgo', { count: diffDays });
    return d.toLocaleDateString();
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  return (
    <>
      <div className={cn('flex flex-col h-full', className)}>
        {/* Header with search and actions */}
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchDocuments')}
                className="pl-9 h-8"
              />
            </div>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t('new')}
            </Button>
          </div>

          {/* Filters and sort */}
          <div className="flex items-center gap-2 text-xs">
            <Select value={filterLanguage} onValueChange={setFilterLanguage}>
              <SelectTrigger className="h-7 w-[100px]">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allLanguages')}</SelectItem>
                {LANGUAGE_OPTIONS.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger className="h-7 w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updatedAt">{t('sortByDate')}</SelectItem>
                <SelectItem value="title">{t('sortByName')}</SelectItem>
                <SelectItem value="language">{t('sortByLanguage')}</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleSortOrder}>
              {sortOrder === 'asc' ? (
                <SortAsc className="h-3.5 w-3.5" />
              ) : (
                <SortDesc className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Document list */}
        <ScrollArea className="flex-1">
          {filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <FolderOpen className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                {searchQuery ? t('noDocumentsFound') : t('noDocuments')}
              </p>
              {!searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('createFirst')}
                </Button>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors group',
                    doc.id === activeDocumentId
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-muted/50'
                  )}
                  onClick={() => onSelectDocument(doc.id)}
                >
                  {doc.type === 'code' ? (
                    <FileCode className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{doc.title}</span>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {doc.language}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(doc.updatedAt)}</span>
                      <span className="mx-1">•</span>
                      <span>{doc.content.split('\n').length} {t('lines')}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleStartRename(doc)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        {t('rename')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicateDocument(doc.id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        {t('duplicate')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDeleteDocument(doc.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer stats */}
        <div className="p-2 border-t text-xs text-muted-foreground text-center">
          {filteredDocuments.length} {t('documents')}
          {searchQuery && ` (${t('filtered')})`}
        </div>
      </div>

      {/* Create Document Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t('createDocument')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('documentTitle')}</label>
              <Input
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder={t('enterTitle')}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('language')}</label>
                <Select value={newDocLanguage} onValueChange={(v) => setNewDocLanguage(v as ArtifactLanguage)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('type')}</label>
                <Select value={newDocType} onValueChange={(v) => setNewDocType(v as 'code' | 'text')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="code">{t('codeType')}</SelectItem>
                    <SelectItem value="text">{t('textType')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleCreateDocument} disabled={!newDocTitle.trim()}>
              {t('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t('renameDocument')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder={t('documentTitle')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleConfirmRename();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleConfirmRename} disabled={!renameValue.trim()}>
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

export default CanvasDocumentList;
