'use client';

/**
 * CanvasDocumentTabs - Tab bar for switching between multiple Canvas documents
 */

import { memo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  X,
  Plus,
  FileCode,
  FileText,
  MoreHorizontal,
  Copy,
  Trash2,
  Edit2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { CanvasDocument } from '@/types';

interface CanvasDocumentTabsProps {
  documents: CanvasDocument[];
  activeDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  onCloseDocument: (id: string) => void;
  onCreateDocument: () => void;
  onRenameDocument: (id: string, title: string) => void;
  onDuplicateDocument: (id: string) => void;
  onDeleteDocument: (id: string) => void;
  className?: string;
}

export const CanvasDocumentTabs = memo(function CanvasDocumentTabs({
  documents,
  activeDocumentId,
  onSelectDocument,
  onCloseDocument,
  onCreateDocument,
  onRenameDocument,
  onDuplicateDocument,
  onDeleteDocument,
  className,
}: CanvasDocumentTabsProps) {
  const t = useTranslations('canvas');
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameDocId, setRenameDocId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

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

  if (documents.length === 0) {
    return null;
  }

  // Show tabs only if there are multiple documents
  if (documents.length === 1) {
    return null;
  }

  return (
    <>
      <div className={cn('border-b bg-muted/30', className)}>
        <ScrollArea className="w-full">
          <div className="flex items-center gap-0.5 px-2 py-1">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={cn(
                  'group flex items-center gap-1.5 px-3 py-1.5 rounded-t-md cursor-pointer border-b-2 transition-colors',
                  doc.id === activeDocumentId
                    ? 'bg-background border-primary'
                    : 'border-transparent hover:bg-muted/50'
                )}
                onClick={() => onSelectDocument(doc.id)}
              >
                {doc.type === 'code' ? (
                  <FileCode className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="text-xs font-medium truncate max-w-[120px]">
                  {doc.title}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuItem onClick={() => handleStartRename(doc)}>
                      <Edit2 className="h-3.5 w-3.5 mr-2" />
                      {t('rename')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicateDocument(doc.id)}>
                      <Copy className="h-3.5 w-3.5 mr-2" />
                      {t('duplicate')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDeleteDocument(doc.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      {t('delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseDocument(doc.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={onCreateDocument}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('newDocument')}</TooltipContent>
            </Tooltip>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

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

export default CanvasDocumentTabs;
