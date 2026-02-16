'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Paperclip, Mic, Wand2, Zap, FileText, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RecentFilesPopover, ToolHistoryPanel } from '../popovers';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/ai/media/speech-api';
import { getLanguageFlag } from '@/types/media/speech';
import type { SpeechLanguageCode } from '@/types/media/speech';
import { nanoid } from 'nanoid';
import type { Attachment } from './types';
import type { RecentFile } from '@/stores/system';

export interface InputToolbarProps {
  // State flags
  isProcessing: boolean;
  disabled: boolean;
  isSimplifiedMode: boolean;
  hideAttachmentButton?: boolean;
  hideAdvancedInputControls?: boolean;
  // Attachment
  attachmentsCount: number;
  maxFiles: number;
  openFileDialog: () => void;
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  // Recent files
  showRecentFiles: boolean;
  recentFiles: RecentFile[];
  // Voice
  speechSupported: boolean;
  isListening: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  recordingDuration: number;
  speechLanguage: string;
  toggleVoice: () => void;
  // Template
  onOpenTemplateSelector: () => void;
  // Optimizer
  onOptimizePrompt?: () => void;
  hasInput: boolean;
  // MCP
  isMcpAvailable: boolean;
  onMcpToolsClick: () => void;
  // Tool history
  value: string;
  onChange: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function InputToolbar({
  isProcessing,
  disabled,
  isSimplifiedMode,
  hideAttachmentButton,
  hideAdvancedInputControls,
  attachmentsCount,
  maxFiles,
  openFileDialog,
  setAttachments,
  showRecentFiles,
  recentFiles,
  speechSupported,
  isListening,
  isRecording,
  isTranscribing,
  recordingDuration,
  speechLanguage,
  toggleVoice,
  onOpenTemplateSelector,
  onOptimizePrompt,
  hasInput,
  isMcpAvailable,
  onMcpToolsClick,
  value,
  onChange,
  textareaRef,
}: InputToolbarProps) {
  const t = useTranslations('chatInput');

  const handleInsertPrompt = useCallback(
    (prompt: string) => {
      onChange(value ? `${value}\n${prompt}` : prompt);
      textareaRef.current?.focus();
    },
    [value, onChange, textareaRef]
  );

  const handleSelectTool = useCallback(
    (toolId: string, prompt: string) => {
      const toolParts = toolId.split(':');
      const mention =
        toolParts.length >= 3 ? `@${toolParts[1]}:${toolParts[2]}` : `@${toolId}`;
      onChange(value ? `${value}\n${mention} ${prompt}` : `${mention} ${prompt}`);
      textareaRef.current?.focus();
    },
    [value, onChange, textareaRef]
  );

  return (
    <>
      {/* Attachment button */}
      {!(isSimplifiedMode && hideAttachmentButton) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              disabled={isProcessing || disabled}
              onClick={openFileDialog}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {t('attachFile', { current: attachmentsCount, max: maxFiles })}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Recent files button */}
      {showRecentFiles &&
        recentFiles.length > 0 &&
        !(isSimplifiedMode && hideAttachmentButton) && (
          <RecentFilesPopover
            onSelectFile={(file: RecentFile) => {
              const attachment: Attachment = {
                id: nanoid(),
                name: file.name,
                type:
                  file.type === 'image' ? 'image' : file.type === 'document' ? 'file' : 'file',
                url: file.url || '',
                size: file.size,
                mimeType: file.mimeType,
              };
              setAttachments((prev) => [...prev, attachment]);
            }}
            disabled={isProcessing || disabled}
          />
        )}

      {/* Voice input button */}
      {speechSupported && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8 shrink-0 transition-colors relative',
                (isListening || isRecording) && 'bg-red-500/20 text-red-500 animate-pulse',
                isTranscribing && 'bg-blue-500/20 text-blue-500'
              )}
              disabled={isProcessing || disabled || isTranscribing}
              onClick={toggleVoice}
            >
              <Mic className="h-4 w-4" />
              {isRecording && recordingDuration > 0 && (
                <span className="absolute -top-1 -right-1 text-[10px] bg-red-500 text-white rounded-full px-1 min-w-5 text-center">
                  {formatDuration(recordingDuration)}
                </span>
              )}
              {(isListening || isRecording) && (
                <span className="absolute -bottom-1 -right-1 text-[10px]">
                  {getLanguageFlag(speechLanguage as SpeechLanguageCode)}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isTranscribing
              ? t('processing')
              : isListening || isRecording
                ? t('stopListening')
                : t('voiceInput')}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Prompt template picker */}
      {!(isSimplifiedMode && hideAdvancedInputControls) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              disabled={isProcessing || disabled}
              onClick={onOpenTemplateSelector}
            >
              <FileText className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('insertTemplate')}</TooltipContent>
        </Tooltip>
      )}

      {/* Prompt optimizer button */}
      {onOptimizePrompt &&
        hasInput &&
        !(isSimplifiedMode && hideAdvancedInputControls) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                disabled={isProcessing || disabled}
                onClick={onOptimizePrompt}
              >
                <Wand2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('optimizePrompt')}</TooltipContent>
          </Tooltip>
        )}

      {/* MCP Tools button */}
      {isMcpAvailable &&
        !(isSimplifiedMode && hideAdvancedInputControls) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-primary"
                disabled={isProcessing || disabled}
                onClick={onMcpToolsClick}
              >
                <Zap className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('useMcpTools')}</TooltipContent>
          </Tooltip>
        )}

      {/* Tool History button */}
      {isMcpAvailable &&
        !(isSimplifiedMode && hideAdvancedInputControls) && (
          <ToolHistoryPanel
            asPopover
            trigger={
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    disabled={isProcessing || disabled}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('toolHistory')}</TooltipContent>
              </Tooltip>
            }
            onInsertPrompt={handleInsertPrompt}
            onSelectTool={handleSelectTool}
          />
        )}
    </>
  );
}
