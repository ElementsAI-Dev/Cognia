'use client';

/**
 * ChatDialogs — Extracted dialog/overlay instances from ChatContainer.
 *
 * This component renders all the dialog and overlay UI that appears in the chat view,
 * including prompt optimization, presets, context settings, AI settings, model picker,
 * tool approval, workflow selectors, PPT preview, learning mode, source verification,
 * clear context confirmation, mode switch confirmation, and arena dialogs.
 *
 * @module chat-dialogs
 */

import React from 'react';

import { useTranslations } from 'next-intl';
import { BookOpen } from 'lucide-react';

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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import {
  ContextSettingsDialog,
  ContextDebugDialog,
  AISettingsDialog,
  type AISettings,
  ModelPickerDialog,
  PresetManagerDialog,
  ModeSwitchConfirmDialog,
} from './index';
import { PromptOptimizerDialog, PromptOptimizationHub } from '@/components/prompt';
import { WorkflowPickerDialog } from '../workflow/workflow-picker-dialog';
import { ArenaDialog, ArenaBattleView } from '@/components/arena';
import {
  ToolTimeline,
  ToolApprovalDialog,
  WorkflowSelector,
  type ToolExecution,
  type ToolApprovalRequest,
} from '@/components/agent';
import { PPTPreview } from '@/components/ppt';
import { LearningModePanel, LearningStartDialog } from '@/components/learning';
import { SourceVerificationDialog } from '@/components/search/source-verification-dialog';
import { ModeSwitchSuggestion } from '../ui/mode-switch-suggestion';
import { FeatureNavigationDialog } from '../ui/feature-navigation-dialog';

import { usePresetStore, useSettingsStore } from '@/stores';
import type { ChatMode } from '@/types';
import type { FeatureRoute } from '@/lib/ai/routing';
import type { Preset } from '@/types/content/preset';
import type { ProviderName } from '@/lib/ai';
import type { PPTPresentation } from '@/types/workflow';
import type { IntentDetectionResult } from '@/lib/ai/tools/intent-detection';
import type { UseSourceVerificationReturn } from '@/hooks/search/use-source-verification';

// ─── Props ────────────────────────────────────────────────────────────────────
/** Props for the prompt optimizer group */
interface PromptOptimizerProps {

  showPromptOptimizer: boolean;
  setShowPromptOptimizer: (open: boolean) => void;
  showPromptOptimizationHub: boolean;
  setShowPromptOptimizationHub: (open: boolean) => void;
  inputValue: string;
  onApplyOptimizedPrompt: (prompt: string) => void;
  activePreset: { id: string; name: string; systemPrompt?: string } | null | undefined;
}
/** Props for the preset manager dialog */
interface PresetProps {
  showPresetManager: boolean;
  setShowPresetManager: (open: boolean) => void;
  editingPresetId: string | null;
  onPresetSelect: (preset: Preset) => void;
}

/** Props for the context settings group */
interface ContextProps {
  showContextSettings: boolean;
  setShowContextSettings: (open: boolean) => void;
  showContextDebug: boolean;
  setShowContextDebug: (open: boolean) => void;
  contextLimitPercent: number;
  setContextLimitPercent: (percent: number) => void;
  showMemoryActivation: boolean;
  setShowMemoryActivation: (show: boolean) => void;
  showTokenUsageMeter: boolean;
  setShowTokenUsageMeter: (show: boolean) => void;
  modelMaxTokens: number;
  estimatedTokens: {
    totalTokens: number;
    systemTokens: number;
    contextTokens: number;
  };
  messageCount: number;
  onOptimizeContext: () => void;
  setShowClearContextConfirm: (show: boolean) => void;
}

/** Props for the AI settings dialog */
interface AISettingsProps {
  showAISettings: boolean;
  setShowAISettings: (open: boolean) => void;
  currentAISettings: AISettings;
  onAISettingsChange: (settings: Partial<AISettings>) => void;
  globalDefaultAISettings: AISettings;
}

/** Props for the model picker dialog */
interface ModelPickerProps {
  showModelPicker: boolean;
  setShowModelPicker: (open: boolean) => void;
  currentProvider: string;
  currentModel: string;
  isAutoMode: boolean;
  sessionId: string | null;
  updateSession: (id: string, changes: Record<string, unknown>) => void;
}

/** Props for the tool approval and timeline */
interface ToolApprovalProps {
  toolApprovalRequest: ToolApprovalRequest | null;
  showToolApproval: boolean;
  setShowToolApproval: (open: boolean) => void;
  onToolApproval: (toolCallId: string, alwaysAllow?: boolean) => void;
  onToolDeny: (toolCallId: string) => void;
  currentMode: ChatMode;
  toolTimelineExecutions: ToolExecution[];
}

/** Props for the mode switch suggestion */
interface ModeSwitchSuggestionProps {
  showSuggestion: boolean;
  detectionResult: IntentDetectionResult | null;
  currentMode: ChatMode;
  onAcceptSuggestion: () => void;
  onDismissSuggestion: () => void;
  onKeepCurrentMode: () => void;
}

/** Props for the feature navigation dialog */
interface FeatureNavigationProps {
  hasFeatureRoutingSuggestion: boolean;
  pendingFeature: FeatureRoute | null;
  featureDetectionResult: { confidence: number; matchedPatterns: string[] } | null;
  featureRoutingMessage: string | null;
  onConfirmFeatureNavigation: () => void;
  onContinueFeatureInChat: () => void;
  onDismissFeatureRouting: () => void;
  onSendMessage: (message: string) => void;
}

/** Props for the workflow group */
interface WorkflowProps {
  showWorkflowSelector: boolean;
  setShowWorkflowSelector: (open: boolean) => void;
  showWorkflowPicker: boolean;
  setShowWorkflowPicker: (open: boolean) => void;
  onWorkflowSelect: (
    workflow: { id: string; name: string; icon?: string },
    input: Record<string, unknown>
  ) => void;
  inputValue: string;
}

/** Props for the PPT preview */
interface PPTPreviewDialogProps {
  activePresentation: PPTPresentation | null;
  showPPTPreview: boolean;
  setShowPPTPreview: (open: boolean) => void;
}

/** Props for the learning mode group */
interface LearningProps {
  currentMode: ChatMode;
  showLearningPanel: boolean;
  setShowLearningPanel: (show: boolean) => void;
  learningPanelRef: React.RefObject<HTMLDivElement | null>;
  showLearningStartDialog: boolean;
  setShowLearningStartDialog: (open: boolean) => void;
}

/** Props for the source verification dialog */
interface SourceVerificationProps {
  sourceVerification: UseSourceVerificationReturn;
}

/** Props for the clear context confirmation dialog */
interface ClearContextConfirmProps {
  showClearContextConfirm: boolean;
  setShowClearContextConfirm: (open: boolean) => void;
  onClearMessages: () => void;
}

/** Props for the mode switch confirmation dialog */
interface ModeSwitchConfirmProps {
  showModeSwitchDialog: boolean;
  setShowModeSwitchDialog: (open: boolean) => void;
  currentMode: ChatMode;
  pendingTargetMode: ChatMode | null;
  messageCount: number;
  sessionTitle?: string;
  onModeSwitchConfirm: (options: { carryContext: boolean; summary?: string }) => void;
  onModeSwitchCancel: () => void;
  onGenerateSummaryForModeSwitch: () => Promise<string | null>;
}

/** Props for the arena group */
interface ArenaProps {
  showArenaDialog: boolean;
  setShowArenaDialog: (open: boolean) => void;
  inputValue: string;
  activeSessionId: string | null;
  activePresetSystemPrompt?: string;
  arenaBattleId: string | null;
  showArenaBattle: boolean;
  setShowArenaBattle: (open: boolean) => void;
  setArenaBattleId: (id: string | null) => void;
}

/**
 * Combined props for the ChatDialogs component.
 */
export interface ChatDialogsProps
  extends PromptOptimizerProps,
    PresetProps,
    ContextProps,
    AISettingsProps,
    ModelPickerProps,
    ToolApprovalProps,
    ModeSwitchSuggestionProps,
    FeatureNavigationProps,
    WorkflowProps,
    PPTPreviewDialogProps,
    LearningProps,
    SourceVerificationProps,
    ClearContextConfirmProps,
    ModeSwitchConfirmProps,
    ArenaProps {}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatDialogs(props: ChatDialogsProps) {
  const t = useTranslations('chat');
  const tCommon = useTranslations('common');

  const {
    // Prompt optimizer
    showPromptOptimizer,
    setShowPromptOptimizer,
    showPromptOptimizationHub,
    setShowPromptOptimizationHub,
    inputValue,
    onApplyOptimizedPrompt,
    activePreset,

    // Preset manager
    showPresetManager,
    setShowPresetManager,
    editingPresetId,
    onPresetSelect,

    // Context settings
    showContextSettings,
    setShowContextSettings,
    showContextDebug,
    setShowContextDebug,
    contextLimitPercent,
    setContextLimitPercent,
    showMemoryActivation,
    setShowMemoryActivation,
    showTokenUsageMeter,
    setShowTokenUsageMeter,
    modelMaxTokens,
    estimatedTokens,
    messageCount,
    onOptimizeContext,
    setShowClearContextConfirm,

    // AI settings
    showAISettings,
    setShowAISettings,
    currentAISettings,
    onAISettingsChange,
    globalDefaultAISettings,

    // Model picker
    showModelPicker,
    setShowModelPicker,
    currentProvider,
    currentModel,
    isAutoMode,
    sessionId,
    updateSession,

    // Tool approval & timeline
    toolApprovalRequest,
    showToolApproval,
    setShowToolApproval,
    onToolApproval,
    onToolDeny,
    currentMode,
    toolTimelineExecutions,

    // Mode switch suggestion
    showSuggestion,
    detectionResult,
    onAcceptSuggestion,
    onDismissSuggestion,
    onKeepCurrentMode,

    // Feature navigation
    hasFeatureRoutingSuggestion,
    pendingFeature,
    featureDetectionResult,
    featureRoutingMessage,
    onConfirmFeatureNavigation,
    onContinueFeatureInChat,
    onDismissFeatureRouting,
    onSendMessage,

    // Workflow
    showWorkflowSelector,
    setShowWorkflowSelector,
    showWorkflowPicker,
    setShowWorkflowPicker,
    onWorkflowSelect,

    // PPT Preview
    activePresentation,
    showPPTPreview,
    setShowPPTPreview,

    // Learning
    showLearningPanel,
    setShowLearningPanel,
    learningPanelRef,
    showLearningStartDialog,
    setShowLearningStartDialog,

    // Source verification
    sourceVerification,

    // Clear context confirm
    showClearContextConfirm,
    onClearMessages,

    // Mode switch confirm
    showModeSwitchDialog,
    setShowModeSwitchDialog,
    pendingTargetMode,
    sessionTitle,
    onModeSwitchConfirm,
    onModeSwitchCancel,
    onGenerateSummaryForModeSwitch,

    // Arena
    showArenaDialog,
    setShowArenaDialog,
    activeSessionId,
    activePresetSystemPrompt,
    arenaBattleId,
    showArenaBattle,
    setShowArenaBattle,
    setArenaBattleId,
  } = props;

  return (
    <>
      {/* Prompt Optimizer Dialog */}
      <PromptOptimizerDialog
        open={showPromptOptimizer}
        onOpenChange={setShowPromptOptimizer}
        initialPrompt={inputValue}
        onApply={onApplyOptimizedPrompt}
      />

      {/* Prompt Optimization Hub - Advanced prompt optimization with analytics and A/B testing */}
      {activePreset && (
        <PromptOptimizationHub
          open={showPromptOptimizationHub}
          onOpenChange={setShowPromptOptimizationHub}
          template={{
            id: activePreset.id,
            name: activePreset.name,
            content: activePreset.systemPrompt || '',
            variables: [],
            tags: [],
            source: 'user' as const,
            usageCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          }}
          onTemplateUpdate={(content) => {
            if (activePreset) {
              usePresetStore.getState().updatePreset(activePreset.id, { systemPrompt: content });
            }
          }}
        />
      )}

      {/* Preset Manager Dialog */}
      <PresetManagerDialog
        open={showPresetManager}
        onOpenChange={setShowPresetManager}
        editPresetId={editingPresetId}
        onPresetSelect={onPresetSelect}
      />

      {/* Context Settings Dialog */}
      <ContextSettingsDialog
        open={showContextSettings}
        onOpenChange={setShowContextSettings}
        totalTokens={Math.round((contextLimitPercent / 100) * modelMaxTokens)}
        usedTokens={estimatedTokens.totalTokens}
        systemTokens={estimatedTokens.systemTokens}
        contextTokens={estimatedTokens.contextTokens}
        contextLimitPercent={contextLimitPercent}
        onContextLimitChange={setContextLimitPercent}
        showMemoryActivation={showMemoryActivation}
        onShowMemoryActivationChange={setShowMemoryActivation}
        showTokenUsageMeter={showTokenUsageMeter}
        onShowTokenUsageMeterChange={setShowTokenUsageMeter}
        modelMaxTokens={modelMaxTokens}
        messageCount={messageCount}
        onClearContext={() => setShowClearContextConfirm(true)}
        onOptimizeContext={onOptimizeContext}
        onOpenDebug={() => setShowContextDebug(true)}
      />

      {/* Context Debug Dialog */}
      <ContextDebugDialog
        open={showContextDebug}
        onOpenChange={setShowContextDebug}
      />

      {/* AI Settings Dialog */}
      <AISettingsDialog
        open={showAISettings}
        onOpenChange={setShowAISettings}
        settings={currentAISettings}
        onSettingsChange={onAISettingsChange}
        defaultSettings={globalDefaultAISettings}
      />

      {/* Model Picker Dialog */}
      <ModelPickerDialog
        open={showModelPicker}
        onOpenChange={setShowModelPicker}
        currentProvider={currentProvider}
        currentModel={currentModel}
        isAutoMode={isAutoMode}
        onModelSelect={(providerId, modelId) => {
          if (sessionId) {
            updateSession(sessionId, { provider: providerId as ProviderName, model: modelId });
          }
        }}
        onAutoModeToggle={() => {
          if (sessionId) {
            updateSession(sessionId, { provider: isAutoMode ? 'openai' : 'auto' });
          }
        }}
      />

      {/* Agent Tool Approval Dialog */}
      <ToolApprovalDialog
        request={toolApprovalRequest}
        open={showToolApproval}
        onOpenChange={setShowToolApproval}
        onApprove={onToolApproval}
        onDeny={onToolDeny}
      />

      {/* Agent Tool Timeline - shown when agent is executing */}
      {currentMode === 'agent' && toolTimelineExecutions.length > 0 && (
        <div className="fixed bottom-24 right-4 z-50 w-80">
          <ToolTimeline executions={toolTimelineExecutions} />
        </div>
      )}

      {/* Mode Switch Suggestion - shown when learning/research intent detected */}
      {showSuggestion && detectionResult && (
        <div className="fixed bottom-24 left-4 z-50 w-96">
          <ModeSwitchSuggestion
            result={detectionResult}
            currentMode={currentMode}
            onAccept={onAcceptSuggestion}
            onDismiss={onDismissSuggestion}
            onKeepCurrent={onKeepCurrentMode}
          />
        </div>
      )}

      {/* Feature Navigation Dialog - shown when feature intent is detected */}
      <FeatureNavigationDialog
        open={hasFeatureRoutingSuggestion}
        feature={pendingFeature}
        confidence={featureDetectionResult?.confidence || 0}
        originalMessage={featureRoutingMessage || ''}
        matchedPatterns={featureDetectionResult?.matchedPatterns || []}
        onNavigate={onConfirmFeatureNavigation}
        onContinue={() => {
          onContinueFeatureInChat();
          if (featureRoutingMessage) {
            onSendMessage(featureRoutingMessage);
          }
        }}
        onDismiss={onDismissFeatureRouting}
        onOpenChange={(open) => {
          if (!open) {
            onContinueFeatureInChat();
          }
        }}
      />

      {/* Workflow Selector Dialog */}
      <WorkflowSelector open={showWorkflowSelector} onOpenChange={setShowWorkflowSelector} />

      {/* Workflow Picker Dialog - for running visual workflows from chat */}
      <WorkflowPickerDialog
        open={showWorkflowPicker}
        onOpenChange={setShowWorkflowPicker}
        onSelectWorkflow={onWorkflowSelect}
        initialInput={inputValue}
      />

      {/* PPT Preview - shown when a presentation is generated */}
      <Dialog
        open={!!activePresentation && showPPTPreview}
        onOpenChange={(open) => setShowPPTPreview(open)}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Presentation Preview</DialogTitle>
            <DialogClose />
          </DialogHeader>
          {activePresentation && <PPTPreview presentation={activePresentation} />}
        </DialogContent>
      </Dialog>

      {/* Learning Mode Panel - shown when in learning mode */}
      {currentMode === 'learning' && showLearningPanel && (
        <div
          ref={learningPanelRef}
          className="fixed right-4 top-20 z-40 w-80 max-h-[calc(100vh-6rem)] overflow-auto"
        >
          <LearningModePanel onClose={() => setShowLearningPanel(false)} className="shadow-lg" />
        </div>
      )}

      {/* Learning Mode Start Dialog */}
      <LearningStartDialog
        open={showLearningStartDialog}
        onOpenChange={setShowLearningStartDialog}
        onStart={() => {
          setShowLearningPanel(true);
        }}
      />

      {/* Source Verification Dialog */}
      {sourceVerification.verifiedResponse && (
        <SourceVerificationDialog
          open={sourceVerification.shouldShowDialog}
          onOpenChange={(open) => {
            if (!open) {
              sourceVerification.skipVerification();
            }
          }}
          searchResponse={sourceVerification.verifiedResponse}
          onConfirm={(selectedResults) => {
            sourceVerification.setSelectedResults(selectedResults);
            sourceVerification.confirmSelection();
          }}
          onSkip={sourceVerification.skipVerification}
          onRememberChoice={(choice) => {
            const { setSourceVerificationMode } = useSettingsStore.getState();
            if (choice === 'always-use') {
              setSourceVerificationMode('auto');
            } else if (choice === 'always-skip') {
              setSourceVerificationMode('disabled');
            }
          }}
          onMarkTrusted={sourceVerification.markSourceTrusted}
          onMarkBlocked={sourceVerification.markSourceBlocked}
        />
      )}

      {/* Learning Mode Toggle Button - shown when in learning mode */}
      {currentMode === 'learning' && !showLearningPanel && (
        <Button
          onClick={() => setShowLearningPanel(true)}
          className="fixed right-4 top-20 z-40 rounded-full p-3 h-auto w-auto shadow-lg"
          title="Open Learning Panel"
          variant="default"
          size="icon"
        >
          <BookOpen className="h-5 w-5" />
        </Button>
      )}

      {/* Clear Context Confirmation Dialog */}
      <AlertDialog open={showClearContextConfirm} onOpenChange={setShowClearContextConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clearConversation')}</AlertDialogTitle>
            <AlertDialogDescription>{t('clearConversationConfirmation')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onClearMessages();
                setShowClearContextConfirm(false);
              }}
            >
              {tCommon('clear')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mode Switch Confirmation Dialog */}
      {pendingTargetMode && (
        <ModeSwitchConfirmDialog
          open={showModeSwitchDialog}
          onOpenChange={setShowModeSwitchDialog}
          currentMode={currentMode}
          targetMode={pendingTargetMode}
          messageCount={messageCount}
          sessionTitle={sessionTitle}
          onConfirm={onModeSwitchConfirm}
          onCancel={onModeSwitchCancel}
          onGenerateSummary={onGenerateSummaryForModeSwitch}
        />
      )}

      {/* Arena Dialog - for comparing multiple AI models */}
      <ArenaDialog
        open={showArenaDialog}
        onOpenChange={setShowArenaDialog}
        initialPrompt={inputValue}
        sessionId={activeSessionId || undefined}
        systemPrompt={activePresetSystemPrompt}
        onBattleStart={() => {
          // Could track arena battle start
        }}
        onBattleComplete={() => {
          // Arena battle completed
        }}
      />

      {/* Arena Battle View - shows ongoing battle comparison */}
      {arenaBattleId && (
        <ArenaBattleView
          battleId={arenaBattleId}
          open={showArenaBattle}
          onOpenChange={setShowArenaBattle}
          onClose={() => {
            setArenaBattleId(null);
            setShowArenaBattle(false);
          }}
        />
      )}
    </>
  );
}
