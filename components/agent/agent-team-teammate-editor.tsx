'use client';

/**
 * AgentTeamTeammateEditor - Detail view and editor for a team teammate
 *
 * Shows:
 * - Teammate status, progress, token usage
 * - Editable name, description, specialization
 * - Provider/model override
 * - Execution logs
 * - Assigned tasks
 */

import { useState, useCallback, useMemo } from 'react';
import {
  User,
  Settings2,
  Activity,
  MessageSquare,
  Clock,
  Cpu,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  Edit,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAgentTeamStore } from '@/stores/agent/agent-team-store';
import {
  TEAMMATE_STATUS_CONFIG,
  TASK_STATUS_CONFIG,
} from '@/types/agent/agent-team';

// ============================================================================
// Types
// ============================================================================

export interface AgentTeamTeammateEditorProps {
  teammateId: string;
  onClose?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function AgentTeamTeammateEditor({
  teammateId,
  onClose,
}: AgentTeamTeammateEditorProps) {
  const t = useTranslations('agentTeam');

  // Store
  const teammate = useAgentTeamStore((s) => s.teammates[teammateId]);
  const updateTeammate = useAgentTeamStore((s) => s.updateTeammate);
  const tasks = useAgentTeamStore((s) => s.tasks);
  const messages = useAgentTeamStore((s) => s.messages);
  const getUnreadMessages = useAgentTeamStore((s) => s.getUnreadMessages);

  // Local state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSpec, setEditSpec] = useState('');
  const [showTasks, setShowTasks] = useState(true);
  const [showMessages, setShowMessages] = useState(false);

  // Derived
  const assignedTasks = useMemo(() => {
    if (!teammate) return [];
    return Object.values(tasks).filter(
      (task) => task.claimedBy === teammateId || task.assignedTo === teammateId
    );
  }, [tasks, teammate, teammateId]);

  const teammateMessages = useMemo(() => {
    if (!teammate) return [];
    return Object.values(messages).filter(
      (msg) => msg.senderId === teammateId || msg.recipientId === teammateId
    );
  }, [messages, teammate, teammateId]);

  const unreadCount = useMemo(() => {
    return getUnreadMessages(teammateId).length;
  }, [getUnreadMessages, teammateId]);

  const startEditing = useCallback(() => {
    if (!teammate) return;
    setEditName(teammate.name);
    setEditDesc(teammate.description);
    setEditSpec(teammate.config.specialization || '');
    setIsEditing(true);
  }, [teammate]);

  const saveEditing = useCallback(() => {
    if (!teammate) return;
    updateTeammate(teammateId, {
      name: editName.trim() || teammate.name,
      description: editDesc.trim(),
      config: {
        ...teammate.config,
        specialization: editSpec.trim() || undefined,
      },
    });
    setIsEditing(false);
  }, [teammate, teammateId, editName, editDesc, editSpec, updateTeammate]);

  if (!teammate) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        Teammate not found
      </div>
    );
  }

  const statusConfig = TEAMMATE_STATUS_CONFIG[teammate.status];
  const isActive = teammate.status === 'executing' || teammate.status === 'idle';

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="rounded-full p-2 bg-muted">
              <User className={cn('h-4 w-4', statusConfig.color)} />
            </div>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-7 text-sm font-semibold"
                  autoFocus
                />
              ) : (
                <CardTitle className="text-sm truncate">{teammate.name}</CardTitle>
              )}
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" className={cn('text-[10px]', statusConfig.color)}>
                  {statusConfig.label}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {teammate.role}
                </Badge>
                {teammate.config.specialization && (
                  <Badge variant="outline" className="text-[10px]">
                    {teammate.config.specialization}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={saveEditing}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={startEditing} disabled={!isActive}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
            )}
            {onClose && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Edit Mode Fields */}
        {isEditing && (
          <div className="space-y-2 rounded-md bg-muted/50 p-3">
            <div className="space-y-1">
              <Label className="text-xs">{t('teammate.description')}</Label>
              <Input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="h-7 text-sm"
                placeholder="Description..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('teammate.specialization')}</Label>
              <Input
                value={editSpec}
                onChange={(e) => setEditSpec(e.target.value)}
                className="h-7 text-sm"
                placeholder="e.g., security, performance"
              />
            </div>
          </div>
        )}

        {/* Progress */}
        {(teammate.status === 'executing' || teammate.progress > 0) && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-mono">{Math.round(teammate.progress)}%</span>
            </div>
            <Progress value={teammate.progress} className="h-1.5" />
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="rounded-md bg-muted/50 p-2">
                <Cpu className="h-3.5 w-3.5 mx-auto mb-0.5 text-muted-foreground" />
                <p className="text-xs font-mono">{teammate.tokenUsage.totalTokens.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">tokens</p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Prompt: {teammate.tokenUsage.promptTokens.toLocaleString()} / Completion: {teammate.tokenUsage.completionTokens.toLocaleString()}
            </TooltipContent>
          </Tooltip>

          <div className="rounded-md bg-muted/50 p-2">
            <Activity className="h-3.5 w-3.5 mx-auto mb-0.5 text-muted-foreground" />
            <p className="text-xs font-mono">{assignedTasks.length}</p>
            <p className="text-[10px] text-muted-foreground">tasks</p>
          </div>

          <div className="rounded-md bg-muted/50 p-2">
            <MessageSquare className="h-3.5 w-3.5 mx-auto mb-0.5 text-muted-foreground" />
            <p className="text-xs font-mono">
              {teammateMessages.length}
              {unreadCount > 0 && (
                <span className="text-primary ml-0.5">({unreadCount})</span>
              )}
            </p>
            <p className="text-[10px] text-muted-foreground">msgs</p>
          </div>
        </div>

        {/* Provider/Model Info */}
        {(teammate.config.provider || teammate.config.model) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Settings2 className="h-3 w-3" />
            {teammate.config.provider && <span>{teammate.config.provider}</span>}
            {teammate.config.model && (
              <>
                <span>/</span>
                <span className="font-mono">{teammate.config.model}</span>
              </>
            )}
          </div>
        )}

        {/* Timestamps */}
        {teammate.createdAt && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              Created: {new Date(teammate.createdAt).toLocaleTimeString()}
            </span>
            {teammate.lastActiveAt && (
              <span>
                — Last active: {new Date(teammate.lastActiveAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        )}

        <Separator />

        {/* Assigned Tasks */}
        <Collapsible open={showTasks} onOpenChange={setShowTasks}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-7">
              {showTasks ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              <span className="text-xs font-medium">
                Tasks ({assignedTasks.length})
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {assignedTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                No tasks assigned
              </p>
            ) : (
              <div className="space-y-1 mt-1">
                {assignedTasks.map((task) => {
                  const taskStatusConfig = TASK_STATUS_CONFIG[task.status];
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted/50"
                    >
                      <Badge variant="outline" className={cn('text-[9px] shrink-0', taskStatusConfig.color)}>
                        {taskStatusConfig.label}
                      </Badge>
                      <span className="truncate">{task.title}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Messages */}
        <Collapsible open={showMessages} onOpenChange={setShowMessages}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-7">
              {showMessages ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              <span className="text-xs font-medium">
                Messages ({teammateMessages.length})
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="text-[9px] ml-1 h-4 px-1">
                    {unreadCount}
                  </Badge>
                )}
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {teammateMessages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                No messages
              </p>
            ) : (
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-1.5 mt-1">
                  {teammateMessages.slice(-20).map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'rounded px-2 py-1.5 text-xs',
                        msg.senderId === teammateId ? 'bg-primary/10 ml-4' : 'bg-muted/50 mr-4',
                        !msg.read && 'ring-1 ring-primary/30'
                      )}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {msg.senderId === teammateId ? 'Sent' : 'Received'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="line-clamp-3">{msg.content}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Error */}
        {teammate.error && (
          <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            {teammate.error}
          </div>
        )}

        {/* Last Activity */}
        {teammate.lastActivity && (
          <div className="rounded-md bg-muted/50 p-2 text-xs">
            <p className="text-muted-foreground text-[10px] mb-0.5">Last Activity:</p>
            <p className="line-clamp-5">{teammate.lastActivity}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
