'use client';

/**
 * Textbook Library Component
 *
 * Manages textbook uploads, parsing, and organization.
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BookOpen,
  Upload,
  MoreVertical,
  Trash2,
  Edit,
  Play,
  FileText,
  Brain,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useSpeedPassStore } from '@/stores/learning/speedpass-store';
import { useTextbookProcessor } from '@/hooks/learning';
import type { Textbook } from '@/types/learning/speedpass';
import { nanoid } from 'nanoid';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

// ============================================================================
// Main Component
// ============================================================================

export function TextbookLibrary() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const store = useSpeedPassStore();
  const textbooks = Object.values(store.textbooks);
  const t = useTranslations('learningMode.speedpass.library');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('subtitle', { count: textbooks.length })}
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-textbook-button">
              <Upload className="mr-2 h-4 w-4" />
              {t('addTextbook')}
            </Button>
          </DialogTrigger>
          <AddTextbookDialog onClose={() => setIsAddDialogOpen(false)} />
        </Dialog>
      </div>

      {/* Textbook Grid */}
      {textbooks.length === 0 ? (
        <EmptyState onAdd={() => setIsAddDialogOpen(true)} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {textbooks.map((textbook) => (
            <TextbookCard key={textbook.id} textbook={textbook} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Textbook Card Skeleton (for loading state)
// ============================================================================

export function TextbookCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Empty State
// ============================================================================

interface EmptyStateProps {
  onAdd: () => void;
}

function EmptyState({ onAdd }: EmptyStateProps) {
  const t = useTranslations('learningMode.speedpass.library.emptyState');
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-medium">{t('title')}</h3>
        <p className="mt-2 text-center text-sm text-muted-foreground">{t('description')}</p>
        <Button className="mt-6" onClick={onAdd}>
          <Upload className="mr-2 h-4 w-4" />
          {t('action')}
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Add Textbook Dialog
// ============================================================================

interface AddTextbookDialogProps {
  onClose: () => void;
}

function AddTextbookDialog({ onClose }: AddTextbookDialogProps) {
  const t = useTranslations('learningMode.speedpass.library.dialog');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [edition, setEdition] = useState('');
  const [isbn, setIsbn] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const store = useSpeedPassStore();

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) return;

    setIsUploading(true);

    try {
      const newTextbook: Textbook = {
        id: nanoid(),
        name: title.trim(),
        author: author.trim() || '',
        publisher: '',
        edition: edition.trim() || undefined,
        isbn: isbn.trim() || undefined,
        coverUrl: '',
        totalPages: 0,
        parseStatus: 'pending',
        source: 'user_upload',
        isPublic: false,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.addTextbook(newTextbook);

      onClose();
    } finally {
      setIsUploading(false);
    }
  }, [title, author, edition, isbn, store, onClose]);

  return (
    <DialogContent className="sm:max-w-106.25">
      <DialogHeader>
        <DialogTitle>{t('title')}</DialogTitle>
        <DialogDescription>{t('description')}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="title">{t('nameLabel')}</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('namePlaceholder')}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="author">{t('authorLabel')}</Label>
          <Input
            id="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder={t('authorPlaceholder')}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="edition">{t('editionLabel')}</Label>
            <Input
              id="edition"
              value={edition}
              onChange={(e) => setEdition(e.target.value)}
              placeholder={t('editionPlaceholder')}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="isbn">{t('isbnLabel')}</Label>
            <Input
              id="isbn"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder={t('isbnPlaceholder')}
            />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button onClick={handleSubmit} disabled={!title.trim() || isUploading}>
          {isUploading ? t('uploading') : t('submit')}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ============================================================================
// Textbook Card
// ============================================================================

interface TextbookCardProps {
  textbook: Textbook;
}

function TextbookCard({ textbook }: TextbookCardProps) {
  const t = useTranslations('learningMode.speedpass.library.card');
  const tDelete = useTranslations('learningMode.speedpass.library.deleteConfirm');
  const store = useSpeedPassStore();
  const { processTextbook: _processTextbook, progress, isProcessing } = useTextbookProcessor();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const parseStatus = store.parseProgress?.textbookId === textbook.id ? store.parseProgress : null;
  const chapters = store.textbookChapters[textbook.id] || [];
  const knowledgePoints = store.textbookKnowledgePoints[textbook.id] || [];
  const questions = store.textbookQuestions[textbook.id] || [];

  const handleDelete = useCallback(() => {
    store.removeTextbook(textbook.id);
    setIsDeleteDialogOpen(false);
  }, [store, textbook.id]);

  const handleStartLearning = useCallback(() => {
    // Navigate to tutorial generation
  }, []);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{textbook.name}</CardTitle>
              <CardDescription className="truncate">
                {textbook.author || t('unknownAuthor')}
              </CardDescription>
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      data-testid="textbook-menu-trigger"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      {t('edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('moreActions')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{tDelete('title')}</AlertDialogTitle>
                <AlertDialogDescription>{tDelete('description')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{tDelete('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {tDelete('confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Parse Status */}
        {parseStatus && (
          <ParseStatusBadge status={parseStatus.status} progress={parseStatus.progress} />
        )}

        {/* Processing Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{progress.message}</span>
              <span>{progress.current}%</span>
            </div>
            <Progress value={progress.current} />
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted p-2">
            <p className="text-lg font-semibold">{chapters.length}</p>
            <p className="text-xs text-muted-foreground">{t('chapters')}</p>
          </div>
          <div className="rounded-lg bg-muted p-2">
            <p className="text-lg font-semibold">{knowledgePoints.length}</p>
            <p className="text-xs text-muted-foreground">{t('knowledgePoints')}</p>
          </div>
          <div className="rounded-lg bg-muted p-2">
            <p className="text-lg font-semibold">{questions.length}</p>
            <p className="text-xs text-muted-foreground">{t('questions')}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleStartLearning}>
            <Play className="mr-2 h-4 w-4" />
            {t('startLearning')}
          </Button>
          <Button variant="outline" size="sm">
            <Brain className="mr-2 h-4 w-4" />
            {t('practice')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Parse Status Badge
// ============================================================================

import type { TextbookParseStatus } from '@/types/learning/speedpass';

type ParseStatus = TextbookParseStatus;

interface ParseStatusBadgeProps {
  status: ParseStatus;
  progress: number;
}

function ParseStatusBadge({ status, progress }: ParseStatusBadgeProps) {
  const t = useTranslations('learningMode.speedpass.library.status');

  const config = {
    pending: {
      icon: Clock,
      label: t('pending'),
      variant: 'secondary' as const,
      color: 'text-muted-foreground',
    },
    uploading: {
      icon: Upload,
      label: t('uploading'),
      variant: 'secondary' as const,
      color: 'text-blue-500',
    },
    parsing: {
      icon: FileText,
      label: t('parsing', { progress }),
      variant: 'secondary' as const,
      color: 'text-orange-500',
    },
    extracting_chapters: {
      icon: Brain,
      label: t('extracting_chapters', { progress }),
      variant: 'secondary' as const,
      color: 'text-purple-500',
    },
    extracting_knowledge_points: {
      icon: Brain,
      label: t('extracting_knowledge_points', { progress }),
      variant: 'secondary' as const,
      color: 'text-purple-500',
    },
    extracting_questions: {
      icon: Brain,
      label: t('extracting_questions', { progress }),
      variant: 'secondary' as const,
      color: 'text-purple-500',
    },
    completed: {
      icon: CheckCircle,
      label: t('completed'),
      variant: 'default' as const,
      color: 'text-green-500',
    },
    failed: {
      icon: AlertCircle,
      label: t('failed'),
      variant: 'destructive' as const,
      color: 'text-destructive',
    },
  };

  const { icon: Icon, label, variant, color } = config[status];

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className={cn('h-3 w-3', color)} />
      {label}
    </Badge>
  );
}

export default TextbookLibrary;
