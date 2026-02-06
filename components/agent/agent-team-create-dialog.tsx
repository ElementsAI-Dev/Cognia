'use client';

/**
 * AgentTeamCreateDialog - Dialog for creating a new agent team
 *
 * Supports:
 * - Custom team creation with name, description, task
 * - Template-based creation
 * - Adding initial teammates with specializations
 * - Execution mode selection
 */

import { useState, useCallback } from 'react';
import {
  Users,
  Plus,
  X,
  GitBranch,
  Zap,
  UserPlus,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type {
  TeamExecutionMode,
  CreateTeamInput,
  AddTeammateInput,
} from '@/types/agent/agent-team';

// ============================================================================
// Types
// ============================================================================

interface TeammateFormEntry {
  name: string;
  description: string;
  specialization: string;
}

export interface AgentTeamCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTeam: (
    input: CreateTeamInput,
    teammates: Omit<AddTeammateInput, 'teamId'>[]
  ) => void;
  defaultTask?: string;
}

// ============================================================================
// Component
// ============================================================================

export function AgentTeamCreateDialog({
  open,
  onOpenChange,
  onCreateTeam,
  defaultTask = '',
}: AgentTeamCreateDialogProps) {
  const t = useTranslations('agentTeam');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [task, setTask] = useState(defaultTask);
  const [executionMode, setExecutionMode] = useState('coordinated' as TeamExecutionMode);
  const [teammates, setTeammates] = useState<TeammateFormEntry[]>([]);

  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setTask(defaultTask);
    setExecutionMode('coordinated' as TeamExecutionMode);
    setTeammates([]);
  }, [defaultTask]);

  const addTeammate = useCallback(() => {
    setTeammates((prev) => [
      ...prev,
      { name: '', description: '', specialization: '' },
    ]);
  }, []);

  const removeTeammate = useCallback((index: number) => {
    setTeammates((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateTeammate = useCallback(
    (index: number, field: keyof TeammateFormEntry, value: string) => {
      setTeammates((prev) =>
        prev.map((tm, i) => (i === index ? { ...tm, [field]: value } : tm))
      );
    },
    []
  );

  const isValid = name.trim().length > 0 && task.trim().length > 0;

  const handleCreate = useCallback(() => {
    if (!isValid) return;

    const input: CreateTeamInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      task: task.trim(),
      config: {
        executionMode,
      },
    };

    const teammateInputs: Omit<AddTeammateInput, 'teamId'>[] = teammates
      .filter((tm) => tm.name.trim().length > 0)
      .map((tm) => ({
        name: tm.name.trim(),
        description: tm.description.trim() || undefined,
        config: tm.specialization.trim()
          ? { specialization: tm.specialization.trim() }
          : undefined,
      }));

    onCreateTeam(input, teammateInputs);
    resetForm();
    onOpenChange(false);
  }, [isValid, name, description, task, executionMode, teammates, onCreateTeam, resetForm, onOpenChange]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t('createTeam')}
          </DialogTitle>
          <DialogDescription>
            {t('taskDescription')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-4 py-2">
            {/* Team Name */}
            <div className="space-y-2">
              <Label htmlFor="team-name">{t('teamName')}</Label>
              <Input
                id="team-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Code Review Team"
                autoFocus
              />
            </div>

            {/* Team Description */}
            <div className="space-y-2">
              <Label htmlFor="team-desc">{t('teamDescription')}</Label>
              <Input
                id="team-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
              />
            </div>

            {/* Task */}
            <div className="space-y-2">
              <Label htmlFor="team-task">{t('taskDescription')}</Label>
              <Textarea
                id="team-task"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Describe the task for the team to work on..."
                rows={3}
              />
            </div>

            {/* Execution Mode */}
            <div className="space-y-2">
              <Label>{t('template.title')}</Label>
              <Select
                value={executionMode}
                onValueChange={(v) => setExecutionMode(v as TeamExecutionMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="coordinated">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      <span>Coordinated — Lead coordinates all work</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="autonomous">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5" />
                      <span>Autonomous — Teammates self-claim tasks</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="delegate">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-3.5 w-3.5" />
                      <span>Delegate — Lead assigns to specialists</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Teammates */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  {t('teammate.title')}
                  <Badge variant="secondary" className="text-[10px]">
                    {teammates.length + 1}
                  </Badge>
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={addTeammate}
                >
                  <Plus className="h-3 w-3" />
                  {t('teammate.add')}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                A Team Lead is automatically created. Add additional teammates below.
              </p>

              {teammates.map((tm, index) => (
                <div
                  key={index}
                  className="rounded-md border p-3 space-y-2 relative"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => removeTeammate(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">{t('teammate.name')}</Label>
                      <Input
                        value={tm.name}
                        onChange={(e) => updateTeammate(index, 'name', e.target.value)}
                        placeholder="e.g., Security Reviewer"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t('teammate.specialization')}</Label>
                      <Input
                        value={tm.specialization}
                        onChange={(e) => updateTeammate(index, 'specialization', e.target.value)}
                        placeholder="e.g., security"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('teammate.description')}</Label>
                    <Input
                      value={tm.description}
                      onChange={(e) => updateTeammate(index, 'description', e.target.value)}
                      placeholder="What this teammate focuses on..."
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!isValid} className="gap-1.5">
            <Users className="h-4 w-4" />
            {t('createTeam')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
