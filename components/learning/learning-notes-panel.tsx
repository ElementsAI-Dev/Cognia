'use client';

/**
 * Learning Notes Panel
 * 
 * Allows users to take and manage notes during learning sessions.
 */

import { memo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  StickyNote,
  Plus,
  Trash2,
  Star,
  StarOff,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useLearningStore } from '@/stores/learning';
import type { LearningNote } from '@/types/learning';

interface LearningNotesPanelProps {
  sessionId: string;
  notes: LearningNote[];
  className?: string;
}

export const LearningNotesPanel = memo(function LearningNotesPanel({
  sessionId,
  notes,
  className,
}: LearningNotesPanelProps) {
  const t = useTranslations('learningMode');
  const { addNote, updateNote, deleteNote, toggleNoteHighlight } = useLearningStore();
  
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleAddNote = useCallback(() => {
    if (!newNoteContent.trim()) return;
    addNote(sessionId, newNoteContent.trim());
    setNewNoteContent('');
    setIsAddingNote(false);
  }, [sessionId, newNoteContent, addNote]);

  const handleStartEdit = useCallback((note: LearningNote) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingNoteId || !editContent.trim()) return;
    updateNote(sessionId, editingNoteId, { content: editContent.trim() });
    setEditingNoteId(null);
    setEditContent('');
  }, [sessionId, editingNoteId, editContent, updateNote]);

  const handleCancelEdit = useCallback(() => {
    setEditingNoteId(null);
    setEditContent('');
  }, []);

  const handleDelete = useCallback((noteId: string) => {
    deleteNote(sessionId, noteId);
  }, [sessionId, deleteNote]);

  const handleToggleHighlight = useCallback((noteId: string) => {
    toggleNoteHighlight(sessionId, noteId);
  }, [sessionId, toggleNoteHighlight]);

  const highlightedNotes = notes.filter((n) => n.isHighlight);
  const regularNotes = notes.filter((n) => !n.isHighlight);

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            {t('notes.title')}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAddingNote(true)}
            disabled={isAddingNote}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full max-h-[400px]">
          <div className="space-y-3">
            {/* Add Note Form */}
            {isAddingNote && (
              <div className="space-y-2 p-2 border rounded-md bg-muted/30">
                <Textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder={t('notes.placeholder')}
                  className="min-h-[80px] text-sm"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAddingNote(false);
                      setNewNoteContent('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    disabled={!newNoteContent.trim()}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Highlighted Notes */}
            {highlightedNotes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Star className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('notes.highlighted')}
                  </span>
                </div>
                {highlightedNotes.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    isEditing={editingNoteId === note.id}
                    editContent={editContent}
                    onEditContentChange={setEditContent}
                    onStartEdit={() => handleStartEdit(note)}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onDelete={() => handleDelete(note.id)}
                    onToggleHighlight={() => handleToggleHighlight(note.id)}
                    t={t}
                  />
                ))}
              </div>
            )}

            {/* Regular Notes */}
            {regularNotes.length > 0 && (
              <div className="space-y-2">
                {highlightedNotes.length > 0 && (
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('notes.all')}
                  </span>
                )}
                {regularNotes.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    isEditing={editingNoteId === note.id}
                    editContent={editContent}
                    onEditContentChange={setEditContent}
                    onStartEdit={() => handleStartEdit(note)}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onDelete={() => handleDelete(note.id)}
                    onToggleHighlight={() => handleToggleHighlight(note.id)}
                    t={t}
                  />
                ))}
              </div>
            )}

            {/* Empty State */}
            {notes.length === 0 && !isAddingNote && (
              <div className="text-center py-6">
                <StickyNote className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {t('notes.empty')}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setIsAddingNote(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('notes.addFirst')}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});

interface NoteItemProps {
  note: LearningNote;
  isEditing: boolean;
  editContent: string;
  onEditContentChange: (content: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onToggleHighlight: () => void;
  t: ReturnType<typeof useTranslations>;
}

const NoteItem = memo(function NoteItem({
  note,
  isEditing,
  editContent,
  onEditContentChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onToggleHighlight,
  t,
}: NoteItemProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isEditing) {
    return (
      <div className="space-y-2 p-2 border rounded-md bg-muted/30">
        <Textarea
          value={editContent}
          onChange={(e) => onEditContentChange(e.target.value)}
          className="min-h-[80px] text-sm"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancelEdit}>
            <X className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={onSaveEdit} disabled={!editContent.trim()}>
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-2 rounded-md border group relative',
        note.isHighlight && 'border-yellow-500/50 bg-yellow-500/5'
      )}
    >
      <p className="text-sm whitespace-pre-wrap pr-16">{note.content}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted-foreground">
          {formatDate(note.createdAt)}
        </span>
        {note.conceptTags && note.conceptTags.length > 0 && (
          <div className="flex gap-1">
            {note.conceptTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onToggleHighlight}
              >
                {note.isHighlight ? (
                  <StarOff className="h-3 w-3 text-yellow-500" />
                ) : (
                  <Star className="h-3 w-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('notes.toggleHighlight')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onStartEdit}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('notes.edit')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('notes.delete')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
});

export default LearningNotesPanel;
