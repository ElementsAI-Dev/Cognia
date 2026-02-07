'use client';

/**
 * Sandbox Sessions Page - View and manage execution sessions
 * Lists all sessions with metadata, allows creating/deleting sessions
 * Click a session to see its execution history
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSessions } from '@/hooks/sandbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeft,
  Plus,
  Layers,
  RefreshCw,
  Trash2,
  Edit,
  Play,
  Calendar,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SandboxSessionsPage() {
  const t = useTranslations('sandboxPage');
  const router = useRouter();

  const {
    sessions,
    currentSessionId,
    loading,
    refresh,
    startSession,
    endSession,
    setCurrentSession,
    deleteSession,
    updateSession,
  } = useSessions();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionDesc, setNewSessionDesc] = useState('');
  const [editSessionId, setEditSessionId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const handleCreate = useCallback(async () => {
    if (!newSessionName.trim()) return;
    await startSession(newSessionName.trim(), newSessionDesc.trim() || undefined);
    setNewSessionName('');
    setNewSessionDesc('');
    setCreateDialogOpen(false);
  }, [newSessionName, newSessionDesc, startSession]);

  const handleEdit = useCallback(async () => {
    if (!editSessionId || !editName.trim()) return;
    await updateSession(editSessionId, editName.trim(), editDesc.trim() || undefined);
    setEditDialogOpen(false);
    setEditSessionId(null);
  }, [editSessionId, editName, editDesc, updateSession]);

  const openEdit = useCallback((session: { id: string; name: string; description?: string | null }) => {
    setEditSessionId(session.id);
    setEditName(session.name);
    setEditDesc(session.description || '');
    setEditDialogOpen(true);
  }, []);

  const handleActivate = useCallback(async (sessionId: string) => {
    await setCurrentSession(sessionId);
    router.push('/sandbox');
  }, [setCurrentSession, router]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex h-svh flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/sandbox">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{t('backToSandbox')}</TooltipContent>
          </Tooltip>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">{t('sessionsTitle')}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {sessions.length} {t('sessionsCount')}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => refresh()}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('newSession')}
          </Button>
        </div>
      </header>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
          {/* Current session banner */}
          {currentSessionId && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                    <Play className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {t('activeSession')}: {sessions.find((s) => s.id === currentSessionId)?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('activeSessionDesc')}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => endSession()}>
                  {t('endSession')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Loading skeleton */}
          {loading && sessions.length === 0 && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-60" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && sessions.length === 0 && (
            <Card className="py-12">
              <CardContent>
                <Empty className="border-0">
                  <EmptyMedia variant="icon">
                    <Layers className="h-8 w-8" />
                  </EmptyMedia>
                  <EmptyTitle>{t('noSessions')}</EmptyTitle>
                  <EmptyDescription>{t('noSessionsDesc')}</EmptyDescription>
                  <Button className="mt-4 gap-1.5" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                    {t('createFirstSession')}
                  </Button>
                </Empty>
              </CardContent>
            </Card>
          )}

          {/* Sessions list */}
          {sessions.map((session) => {
            const isActive = session.id === currentSessionId;
            const isEnded = !session.is_active;

            return (
              <Card
                key={session.id}
                className={cn(
                  'transition-colors hover:bg-accent/30 cursor-pointer',
                  isActive && 'border-primary/30 bg-primary/5'
                )}
                onClick={() => handleActivate(session.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={cn(
                          'flex items-center justify-center h-10 w-10 rounded-lg shrink-0',
                          isActive ? 'bg-primary/10' : 'bg-muted'
                        )}
                      >
                        <Terminal className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium truncate">{session.name}</h3>
                          {isActive && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">
                              {t('active')}
                            </Badge>
                          )}
                          {isEnded && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {t('ended')}
                            </Badge>
                          )}
                        </div>
                        {session.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {session.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(session.created_at)}
                          </span>
                          {session.execution_count > 0 && (
                            <span>{session.execution_count} {t('totalExecutions').toLowerCase()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(session)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('editSession')}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={`/sandbox/session/${session.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>{t('viewDetail')}</TooltipContent>
                      </Tooltip>
                      <AlertDialog>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent>{t('deleteSession')}</TooltipContent>
                        </Tooltip>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('deleteSessionConfirm')}</AlertDialogTitle>
                            <AlertDialogDescription>{t('deleteSessionConfirmDesc')}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteSession(session.id, true)}>
                              {t('delete')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Create Session Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('startSessionTitle')}</DialogTitle>
            <DialogDescription>{t('startSessionDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t('sessionName')}</Label>
              <Input
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder={t('sessionNamePlaceholder')}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('sessionDesc')}</Label>
              <Input
                value={newSessionDesc}
                onChange={(e) => setNewSessionDesc(e.target.value)}
                placeholder={t('sessionDescPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={!newSessionName.trim()}>
              {t('start')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Session Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('editSession')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t('sessionName')}</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('sessionDesc')}</Label>
              <Input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleEdit} disabled={!editName.trim()}>
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
