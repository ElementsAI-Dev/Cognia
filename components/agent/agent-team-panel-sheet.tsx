'use client';

/**
 * AgentTeamPanelSheet - Sheet wrapper for AgentTeamPanel
 *
 * Wraps the AgentTeamPanel in a Sheet component, controlled by the
 * agent team store's isPanelOpen state. Wires up the useAgentTeam hook
 * for team execution/control actions.
 *
 * Follows the same pattern as BackgroundAgentPanel (Sheet-based).
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAgentTeamStore } from '@/stores/agent/agent-team-store';
import { useAgentTeam } from '@/hooks/agent/use-agent-team';
import { AgentTeamPanel } from './agent-team-panel';
import { AgentTeamCreateDialog } from './agent-team-create-dialog';
import { AgentTeamTemplateSelector } from './agent-team-template-selector';
import { AgentTeamTeammateEditor } from './agent-team-teammate-editor';
import type {
  AgentTeamTemplate,
  CreateTeamInput,
  AddTeammateInput,
} from '@/types/agent/agent-team';
import { toast } from '@/components/ui/sonner';
import { useChatStore } from '@/stores/chat';
import { nanoid } from 'nanoid';

export function AgentTeamPanelSheet() {
  const t = useTranslations('agentTeam');

  // Store state
  const isPanelOpen = useAgentTeamStore((s) => s.isPanelOpen);
  const setIsPanelOpen = useAgentTeamStore((s) => s.setIsPanelOpen);
  const selectedTeammateId = useAgentTeamStore((s) => s.selectedTeammateId);
  const setSelectedTeammate = useAgentTeamStore((s) => s.setSelectedTeammate);

  // Hook for actions
  const {
    createTeam,
    createTeamFromTemplate,
    executeTeam,
    cancelTeam,
    pauseTeam,
    resumeTeam,
    deleteTeam,
    addTeammate,
  } = useAgentTeam();

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [createFlow, setCreateFlow] = useState<'custom' | 'template' | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTeamTemplate | null>(null);

  // Handle create team button
  const handleCreateTeam = useCallback(() => {
    setTemplateSelectorOpen(true);
  }, []);

  // Handle template selection
  const handleSelectTemplate = useCallback(
    (template: AgentTeamTemplate) => {
      setTemplateSelectorOpen(false);

      if (template.id === 'custom') {
        // Start from scratch → open create dialog
        setCreateFlow('custom');
        setCreateDialogOpen(true);
      } else {
        // Template selected → open create dialog with template context
        setSelectedTemplate(template);
        setCreateFlow('template');
        setCreateDialogOpen(true);
      }
    },
    []
  );

  // Handle team creation from dialog
  const handleTeamCreated = useCallback(
    (input: CreateTeamInput, teammates: Omit<AddTeammateInput, 'teamId'>[]) => {
      if (createFlow === 'template' && selectedTemplate && selectedTemplate.id !== 'custom') {
        // Create from template
        const team = createTeamFromTemplate(selectedTemplate, input.task, input.config);
        toast.success(t('createTeam') + ': ' + team.name);
      } else {
        // Create custom team
        const team = createTeam(input);

        // Add extra teammates
        for (const tm of teammates) {
          addTeammate({ ...tm, teamId: team.id });
        }
        toast.success(t('createTeam') + ': ' + team.name);
      }

      setSelectedTemplate(null);
      setCreateFlow(null);
    },
    [createFlow, selectedTemplate, createTeam, createTeamFromTemplate, addTeammate, t]
  );

  // Handle execute — posts result to chat when done
  const handleExecuteTeam = useCallback(
    async (teamId: string) => {
      try {
        await executeTeam(teamId);
        toast.success(t('execution.teamCompleted'));

        // Post team result summary to chat
        const team = useAgentTeamStore.getState().teams[teamId];
        if (team?.finalResult) {
          const teammates = team.teammateIds
            .map((id) => useAgentTeamStore.getState().teammates[id])
            .filter(Boolean);
          const tasks = team.taskIds
            .map((id) => useAgentTeamStore.getState().tasks[id])
            .filter(Boolean);
          const completedTasks = tasks.filter((t) => t.status === 'completed').length;

          const summary = [
            `**🤖 Agent Team "${team.name}" completed**`,
            '',
            `> ${team.task}`,
            '',
            `**Results:** ${completedTasks}/${tasks.length} tasks completed by ${teammates.length} teammates`,
            team.totalTokenUsage?.totalTokens
              ? `**Tokens:** ${team.totalTokenUsage.totalTokens.toLocaleString()}`
              : '',
            '',
            team.finalResult,
          ]
            .filter(Boolean)
            .join('\n');

          useChatStore.getState().appendMessage({
            id: nanoid(),
            role: 'assistant',
            content: summary,
            createdAt: new Date(),
            model: 'agent-team',
            provider: 'system',
          });
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Execution failed';
        toast.error(msg);
      }
    },
    [executeTeam, t]
  );

  // Handle cancel
  const handleCancelTeam = useCallback(
    (teamId: string) => {
      cancelTeam(teamId);
      toast.info(t('cancelTeam'));
    },
    [cancelTeam, t]
  );

  // Handle pause
  const handlePauseTeam = useCallback(
    (teamId: string) => {
      pauseTeam(teamId);
      toast.info(t('pauseTeam'));
    },
    [pauseTeam, t]
  );

  // Handle resume
  const handleResumeTeam = useCallback(
    (teamId: string) => {
      resumeTeam(teamId);
      toast.info(t('resumeTeam'));
    },
    [resumeTeam, t]
  );

  // Handle delete
  const handleDeleteTeam = useCallback(
    (teamId: string) => {
      deleteTeam(teamId);
      toast.success(t('deleteTeam'));
    },
    [deleteTeam, t]
  );

  return (
    <>
      <Sheet open={isPanelOpen} onOpenChange={setIsPanelOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[480px] p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              {t('title')}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Main panel */}
            <div className="flex-1 overflow-hidden">
              <AgentTeamPanel
                onCreateTeam={handleCreateTeam}
                onExecuteTeam={handleExecuteTeam}
                onCancelTeam={handleCancelTeam}
                onPauseTeam={handlePauseTeam}
                onResumeTeam={handleResumeTeam}
                onDeleteTeam={handleDeleteTeam}
              />
            </div>

            {/* Teammate detail editor (bottom section) */}
            {selectedTeammateId && (
              <div className="border-t max-h-[40%] overflow-y-auto">
                <AgentTeamTeammateEditor
                  teammateId={selectedTeammateId}
                  onClose={() => setSelectedTeammate(null)}
                />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Template selector dialog */}
      <AgentTeamTemplateSelector
        open={templateSelectorOpen}
        onOpenChange={setTemplateSelectorOpen}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Create team dialog */}
      <AgentTeamCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateTeam={handleTeamCreated}
        defaultTask=""
      />
    </>
  );
}
