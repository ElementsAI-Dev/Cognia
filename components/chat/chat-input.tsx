'use client';

/**
 * ChatInput - Enhanced message input with voice, attachments, drag-drop, and MCP tool mentions
 *
 * Features:
 * - @ mention support for MCP tools, resources, and prompts
 * - Voice input (speech recognition)
 * - File attachments with drag-drop and paste
 * - Recent files popover
 * - Prompt optimizer
 * - Keyboard navigation
 */

import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Send, Paperclip, Square, Loader2, Mic, Wand2, Zap, FileText, History } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSettingsStore, useRecentFilesStore, usePromptTemplateStore, useChatStore } from '@/stores';
import {
  RecentFilesPopover,
  MentionPopover,
  ToolHistoryPanel,
  SlashCommandPopover,
  EmojiPopover,
} from './popovers';
import type { SlashCommandDefinition } from '@/types/chat/slash-commands';
import type { EmojiData } from '@/types/chat/input-completion';
import type { RecentFile } from '@/stores/system';
import type { MentionItem, SelectedMention, ParsedToolCall } from '@/types/mcp';
import { useSpeech } from '@/hooks';
import { useInputCompletionUnified } from '@/hooks/chat/use-input-completion-unified';
import { cn } from '@/lib/utils';
import { transcribeViaApi, formatDuration } from '@/lib/ai/media/speech-api';
import { GhostTextOverlay } from '@/components/chat/ghost-text-overlay';
import { CompletionOverlay } from '@/components/input-completion/completion-overlay';
import { useCompletionSettingsStore } from '@/stores/settings/completion-settings-store';
import { getLanguageFlag } from '@/types/media/speech';
import { nanoid } from 'nanoid';
import { AttachmentsPreview } from './chat-input/attachments-preview';
import { UploadErrorAlert } from './chat-input/upload-error-alert';
import { DragOverlay } from './chat-input/drag-overlay';
import { PreviewDialog } from './chat-input/preview-dialog';
import { BottomToolbar } from './chat-input/bottom-toolbar';
import { formatFileSize, getFileType } from './chat-input/utils';
import { PromptTemplateSelector } from '@/components/prompt';

// Helper to get caret coordinates in textarea for mention popover positioning
function getCaretCoordinates(textarea: HTMLTextAreaElement): DOMRect | null {
  const { selectionStart } = textarea;
  if (selectionStart === null) return null;

  const mirror = document.createElement('div');
  const computed = window.getComputedStyle(textarea);

  const styles = [
    'fontFamily',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'letterSpacing',
    'textTransform',
    'wordSpacing',
    'textIndent',
    'whiteSpace',
    'wordWrap',
    'lineHeight',
    'padding',
    'border',
    'boxSizing',
  ] as const;

  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.overflow = 'hidden';
  mirror.style.width = computed.width;

  styles.forEach((style) => {
    (mirror.style as unknown as Record<string, string>)[style] = computed.getPropertyValue(
      style.replace(/([A-Z])/g, '-$1').toLowerCase()
    );
  });

  const textBeforeCursor = textarea.value.substring(0, selectionStart);
  mirror.textContent = textBeforeCursor;

  const marker = document.createElement('span');
  marker.textContent = '|';
  mirror.appendChild(marker);

  document.body.appendChild(mirror);

  const textareaRect = textarea.getBoundingClientRect();
  const markerRect = marker.getBoundingClientRect();

  document.body.removeChild(mirror);

  return new DOMRect(
    textareaRect.left + markerRect.left - mirror.getBoundingClientRect().left,
    textareaRect.top + markerRect.top - mirror.getBoundingClientRect().top,
    0,
    parseInt(computed.lineHeight) || parseInt(computed.fontSize) * 1.2
  );
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'audio' | 'video' | 'file' | 'archive';
  url: string;
  size: number;
  mimeType: string;
  file?: File;
}

export interface UploadSettings {
  maxFileSize: number; // in bytes
  maxFiles: number;
  allowedTypes: string[]; // MIME types or patterns like 'image/*'
}

const DEFAULT_UPLOAD_SETTINGS: UploadSettings = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxFiles: 10,
  allowedTypes: ['*/*'], // Allow all by default
};

// Speech Recognition types
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

type SpeechRecognitionResultList = {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionResult = {
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
};

type SpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
};

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition: { new (): SpeechRecognition };
    webkitSpeechRecognition: { new (): SpeechRecognition };
  }
}

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (content: string, attachments?: Attachment[], toolCalls?: ParsedToolCall[]) => void;
  isLoading?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  disabled?: boolean;
  uploadSettings?: UploadSettings;
  onOptimizePrompt?: () => void;
  showRecentFiles?: boolean;
  onMentionsChange?: (mentions: SelectedMention[]) => void;
  // Context and mode settings
  contextUsagePercent?: number;
  onOpenContextSettings?: () => void;
  onOpenAISettings?: () => void;
  webSearchEnabled?: boolean;
  thinkingEnabled?: boolean;
  streamingEnabled?: boolean;
  onWebSearchChange?: (enabled: boolean) => void;
  onThinkingChange?: (enabled: boolean) => void;
  onStreamingChange?: (enabled: boolean) => void;
  modelName?: string;
  providerId?: string;
  modeName?: string;
  // Model selection (controlled by parent)
  onModelClick?: () => void;
  onModeClick?: () => void;
  onWorkflowClick?: () => void;
  // Preset management
  onPresetChange?: (preset: import('@/types/content/preset').Preset) => void;
  onCreatePreset?: () => void;
  onManagePresets?: () => void;
  // Workflow and prompt optimization
  onOpenWorkflowPicker?: () => void;
  onOpenPromptOptimization?: () => void;
  onOpenArena?: () => void;
  hasActivePreset?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  isStreaming = false,
  onStop,
  disabled = false,
  uploadSettings = DEFAULT_UPLOAD_SETTINGS,
  onOptimizePrompt,
  showRecentFiles = true,
  onMentionsChange,
  contextUsagePercent = 0,
  onOpenContextSettings,
  onOpenAISettings,
  webSearchEnabled = false,
  thinkingEnabled = false,
  streamingEnabled,
  onWebSearchChange,
  onThinkingChange,
  onStreamingChange,
  modelName = 'GPT-4o',
  providerId,
  modeName: _modeName,
  onModelClick,
  onModeClick: _onModeClick,
  onPresetChange,
  onCreatePreset,
  onManagePresets,
  onOpenWorkflowPicker,
  onOpenPromptOptimization,
  onOpenArena,
  hasActivePreset,
}: ChatInputProps) {
  const t = useTranslations('chatInput');
  const tPlaceholders = useTranslations('placeholders');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const sendOnEnter = useSettingsStore((state) => state.sendOnEnter);
  const simplifiedModeSettings = useSettingsStore((state) => state.simplifiedModeSettings);
  const isSimplifiedMode = simplifiedModeSettings.enabled;
  const addRecentFile = useRecentFilesStore((state) => state.addFile);
  const allRecentFiles = useRecentFilesStore((state) => state.recentFiles);
  const initializePromptTemplates = usePromptTemplateStore((state) => state.initializeDefaults);
  const recordTemplateUsage = usePromptTemplateStore((state) => state.recordUsage);

  // Completion settings
  const ghostTextOpacity = useCompletionSettingsStore((s) => s.ghostTextOpacity);

  // Get recent messages for context-aware AI completion
  const chatMessages = useChatStore((s) => s.messages);
  const conversationContext = useMemo(() => {
    return chatMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-5)
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: typeof m.content === 'string' ? m.content : '',
      }));
  }, [chatMessages]);

  // Unified completion system (handles @mention, /slash, :emoji, AI ghost text)
  const {
    state: completionState,
    handleInputChange: handleCompletionChange,
    handleKeyDown: handleCompletionKeyDown,
    selectItem: selectCompletionItem,
    closeCompletion,
    acceptGhostText: acceptGhostTextFn,
    dismissGhostText: dismissGhostTextFn,
    mentionData: { mentionState, groupedMentions, isMcpAvailable },
    parseToolCalls,
  } = useInputCompletionUnified({
    onMentionsChange,
    onAiCompletionAccept: (text) => {
      // When ghost text is accepted, update the controlled value
      onChange(value + text);
    },
    conversationContext,
  });

  // Mention popover positioning
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  // Memoize recent files to avoid unnecessary re-renders
  const recentFiles = useMemo(
    () =>
      [...allRecentFiles]
        .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())
        .slice(0, 10),
    [allRecentFiles]
  );

  const [isTemplateSelectorOpen, setTemplateSelectorOpen] = useState(false);

  // Slash command state (derived from unified completion)
  const slashCommandState = useMemo(() => ({
    isOpen: completionState.isOpen && completionState.activeProvider === 'slash',
    query: completionState.activeProvider === 'slash' ? completionState.query : '',
    triggerPosition: completionState.triggerPosition,
  }), [completionState.isOpen, completionState.activeProvider, completionState.query, completionState.triggerPosition]);
  const [slashAnchorRect, setSlashAnchorRect] = useState<DOMRect | null>(null);

  // Emoji popover state (derived from unified completion)
  const emojiState = useMemo(() => ({
    isOpen: completionState.isOpen && completionState.activeProvider === 'emoji',
    query: completionState.activeProvider === 'emoji' ? completionState.query : '',
    selectedIndex: completionState.activeProvider === 'emoji' ? completionState.selectedIndex : 0,
  }), [completionState.isOpen, completionState.activeProvider, completionState.query, completionState.selectedIndex]);
  const _emojiAnchorRect = null; // EmojiPopover uses Radix positioning

  // Ghost text from unified completion
  const ghostText = completionState.ghostText;

  useEffect(() => {
    initializePromptTemplates();
  }, [initializePromptTemplates]);


  // Attachments state
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Voice input with enhanced speech hook
  const {
    isListening,
    isRecording,
    transcript: _speechTranscript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    sttSupported: speechSupported,
    currentProvider: speechProvider,
    currentLanguage: speechLanguage,
    error: speechError,
    audioBlob,
    recordingDuration,
  } = useSpeech({
    onResult: (text, isFinal) => {
      if (isFinal && text.trim()) {
        const currentValue = valueRef.current;
        onChangeRef.current(currentValue + (currentValue ? ' ' : '') + text);
      }
    },
    onAutoSend: (text) => {
      if (text.trim() && canSend) {
        onSubmit(
          text,
          attachments.length > 0 ? attachments : undefined,
          parseToolCalls(text).length > 0 ? parseToolCalls(text) : undefined
        );
        onChange('');
        setAttachments([]);
        resetTranscript();
      }
    },
  });

  // State for Whisper transcription loading
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Preview state
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

  const isProcessing = isLoading || isStreaming;
  const canSend = (value.trim().length > 0 || attachments.length > 0) && !isProcessing && !disabled;

  // Handle input change - delegates to unified completion system
  const handleInputChange = useCallback(
    (newValue: string) => {
      onChange(newValue);
      const textarea = textareaRef.current;
      if (textarea) {
        const pos = textarea.selectionStart || 0;
        handleCompletionChange(newValue, pos);

        // Update anchor rects for popovers based on active provider
        if (completionState.isOpen) {
          const rect = getCaretCoordinates(textarea);
          if (completionState.activeProvider === 'slash') {
            setSlashAnchorRect(rect);
          }
        }
      }
    },
    [onChange, handleCompletionChange, completionState.isOpen, completionState.activeProvider]
  );

  const handleTemplateSelect = useCallback(
    (template: import('@/types/content/prompt-template').PromptTemplate) => {
      const insertion = template.content;
      const nextValue = value ? `${value}\n\n${insertion}` : insertion;
      onChange(nextValue);
      recordTemplateUsage(template.id);
      setTemplateSelectorOpen(false);
      requestAnimationFrame(() => textareaRef.current?.focus());
    },
    [onChange, recordTemplateUsage, value]
  );

  // Handle cursor position changes for mention popover
  const handleSelectionChange = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      const pos = textarea.selectionStart || 0;
      handleCompletionChange(value, pos);

      if (mentionState.isOpen) {
        const rect = getCaretCoordinates(textarea);
        setAnchorRect(rect);
      }
    }
  }, [value, handleCompletionChange, mentionState.isOpen]);

  // Handle mention selection from popover
  const handleMentionSelect = useCallback(
    (item: MentionItem) => {
      // Find the mention completion item and select it through the unified system
      const mentionIdx = completionState.items.findIndex(
        (ci) => ci.type === 'mention' && ci.label === item.label
      );
      if (mentionIdx >= 0) {
        selectCompletionItem(mentionIdx);
      }
      // Also update controlled value directly for cursor positioning
      const textarea = textareaRef.current;
      if (textarea) {
        requestAnimationFrame(() => {
          textarea.focus();
        });
      }
    },
    [completionState.items, selectCompletionItem]
  );

  // Handle slash command selection from popover
  const handleSlashCommandSelect = useCallback(
    (command: SlashCommandDefinition) => {
      const { triggerPosition, query } = slashCommandState;
      const beforeTrigger = value.slice(0, triggerPosition);
      const afterQuery = value.slice(triggerPosition + query.length + 1);
      const commandText = `/${command.command} `;
      const newText = `${beforeTrigger}${commandText}${afterQuery}`;
      const newCursorPosition = beforeTrigger.length + commandText.length;

      onChange(newText);
      closeCompletion();

      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.setSelectionRange(newCursorPosition, newCursorPosition);
          textarea.focus();
        }
      });
    },
    [value, onChange, slashCommandState, closeCompletion]
  );

  // Handle emoji selection from popover
  const handleEmojiSelect = useCallback(
    (emoji: EmojiData) => {
      const { triggerPosition } = completionState;
      const query = completionState.query;
      const beforeTrigger = value.slice(0, triggerPosition);
      const afterQuery = value.slice(triggerPosition + 1 + query.length);
      const newText = `${beforeTrigger}${emoji.emoji}${afterQuery}`;
      const newCursorPosition = beforeTrigger.length + emoji.emoji.length;

      onChange(newText);
      closeCompletion();

      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.setSelectionRange(newCursorPosition, newCursorPosition);
          textarea.focus();
        }
      });
    },
    [value, onChange, completionState, closeCompletion]
  );

  // Close slash command popover
  const closeSlashCommand = useCallback(() => {
    closeCompletion();
  }, [closeCompletion]);

  // Close emoji popover
  const closeEmojiPopover = useCallback(() => {
    closeCompletion();
  }, [closeCompletion]);

  // Track selection changes for mention popover positioning
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('click', handleSelectionChange);
      textarea.addEventListener('keyup', handleSelectionChange);
      return () => {
        textarea.removeEventListener('click', handleSelectionChange);
        textarea.removeEventListener('keyup', handleSelectionChange);
      };
    }
  }, [handleSelectionChange]);

  // Store refs for speech recognition callbacks
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  // Keep refs updated
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  }, [value, onChange]);

  // Handle Whisper transcription when audio blob is available
  useEffect(() => {
    if (!audioBlob || speechProvider !== 'openai') return;

    const transcribe = async () => {
      setIsTranscribing(true);
      try {
        const result = await transcribeViaApi(audioBlob, {
          language: speechLanguage,
        });

        if (result.success && result.text) {
          const currentValue = valueRef.current;
          onChangeRef.current(currentValue + (currentValue ? ' ' : '') + result.text);
        } else if (result.error) {
          console.error('Transcription error:', result.error);
        }
      } catch (err) {
        console.error('Failed to transcribe:', err);
      } finally {
        setIsTranscribing(false);
        resetTranscript();
      }
    };

    transcribe();
  }, [audioBlob, speechProvider, speechLanguage, resetTranscript]);

  // Validate file
  const validateFile = useCallback(
    (file: File): string | null => {
      if (file.size > uploadSettings.maxFileSize) {
        return `File "${file.name}" exceeds maximum size of ${formatFileSize(uploadSettings.maxFileSize)}`;
      }
      if (!uploadSettings.allowedTypes.includes('*/*')) {
        const isAllowed = uploadSettings.allowedTypes.some((type) => {
          if (type.endsWith('/*')) {
            return file.type.startsWith(type.slice(0, -1));
          }
          return file.type === type;
        });
        if (!isAllowed) {
          return `File type "${file.type}" is not allowed`;
        }
      }
      return null;
    },
    [uploadSettings]
  );

  // Use ref for attachments length to avoid recreating addFiles on every change
  const attachmentsLengthRef = useRef(attachments.length);
  useEffect(() => {
    attachmentsLengthRef.current = attachments.length;
  }, [attachments.length]);

  // Add files - use ref for attachments.length to keep callback stable
  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const remainingSlots = uploadSettings.maxFiles - attachmentsLengthRef.current;

      if (fileArray.length > remainingSlots) {
        setUploadError(
          `Can only add ${remainingSlots} more files. Maximum is ${uploadSettings.maxFiles}.`
        );
        return;
      }

      const newAttachments: Attachment[] = [];
      for (const file of fileArray) {
        const error = validateFile(file);
        if (error) {
          setUploadError(error);
          continue;
        }

        const attachment: Attachment = {
          id: nanoid(),
          name: file.name,
          type: getFileType(file.type),
          url: URL.createObjectURL(file),
          size: file.size,
          mimeType: file.type,
          file,
        };
        newAttachments.push(attachment);

        // Track in recent files with proper type
        const fileType = getFileType(file.type);
        const recentFileType =
          fileType === 'image'
            ? 'image'
            : fileType === 'audio'
              ? 'audio'
              : fileType === 'video'
                ? 'video'
                : 'file';
        addRecentFile({
          name: file.name,
          path: file.name,
          type: recentFileType,
          mimeType: file.type,
          size: file.size,
          url: attachment.url,
        });
      }

      if (newAttachments.length > 0) {
        setAttachments((prev) => [...prev, ...newAttachments]);
        setUploadError(null);
      }
    },
    [uploadSettings.maxFiles, validateFile, addRecentFile]
  );

  // Cleanup URL objects on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Cleanup all attachment URLs when component unmounts
      attachments.forEach((attachment) => {
        if (attachment.url) {
          URL.revokeObjectURL(attachment.url);
        }
      });
    };
  }, [attachments]);

  // Remove attachment
  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id);
      if (attachment?.url) {
        URL.revokeObjectURL(attachment.url);
      }
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const { files } = e.dataTransfer;
      if (files?.length) {
        addFiles(files);
      }
    },
    [addFiles]
  );

  // Global drag-drop
  useEffect(() => {
    const handleGlobalDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
        setIsDragging(true);
      }
    };

    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer?.files?.length) {
        addFiles(e.dataTransfer.files);
      }
    };

    const handleGlobalDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) {
        setIsDragging(false);
      }
    };

    document.addEventListener('dragover', handleGlobalDragOver);
    document.addEventListener('drop', handleGlobalDrop);
    document.addEventListener('dragleave', handleGlobalDragLeave);

    return () => {
      document.removeEventListener('dragover', handleGlobalDragOver);
      document.removeEventListener('drop', handleGlobalDrop);
      document.removeEventListener('dragleave', handleGlobalDragLeave);
    };
  }, [addFiles]);

  // Handle paste
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        addFiles(files);
      }
    },
    [addFiles]
  );

  const handleSubmit = useCallback(() => {
    if (!canSend) return;
    // Parse tool calls from the message
    const toolCalls = parseToolCalls(value);
    onSubmit(
      value,
      attachments.length > 0 ? attachments : undefined,
      toolCalls.length > 0 ? toolCalls : undefined
    );
    onChange('');
    setAttachments([]);
    textareaRef.current?.focus();
  }, [canSend, value, attachments, onSubmit, onChange, parseToolCalls]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If mention popover is open, let it handle navigation keys
    if (mentionState.isOpen) {
      if (['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
        return;
      }
    }

    // Delegate to unified completion keyboard handler
    const handled = handleCompletionKeyDown(e.nativeEvent);
    if (handled) {
      // If ghost text was accepted, sync the value
      if (e.key === 'Tab' && ghostText) {
        onChange(value + ghostText);
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey && sendOnEnter && !mentionState.isOpen && !completionState.isOpen) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleStop = () => {
    onStop?.();
  };

  const toggleVoice = useCallback(() => {
    if (isListening || isRecording) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, isRecording, startListening, stopListening]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      attachments.forEach((a) => {
        if (a.url) URL.revokeObjectURL(a.url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup only on unmount
  }, []);

  return (
    <div
      ref={dropZoneRef}
      data-tour="chat-input"
      className={cn(
        'border-t border-border/50 p-4 transition-all duration-200',
        isDragging && 'bg-accent/50 border-primary'
      )}
      data-chat-input
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <DragOverlay isDragging={isDragging} label={t('dropFilesHere')} />

      <div className="relative mx-auto max-w-5xl">
        <AttachmentsPreview
          attachments={attachments}
          onRemove={removeAttachment}
          onPreview={setPreviewAttachment}
          removeLabel={t('removeAttachment')}
        />

        {uploadError && (
          <UploadErrorAlert
            message={uploadError}
            onDismiss={() => setUploadError(null)}
            dismissLabel={t('dismiss')}
          />
        )}

        <div
          ref={inputContainerRef}
          data-chat-input-box
          className="relative flex items-end gap-2 rounded-2xl border border-input/50 p-2 shadow-md focus-within:shadow-lg focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-ring/10 transition-all duration-200"
        >
          {/* Mention Popover */}
          <MentionPopover
            open={mentionState.isOpen}
            onClose={closeCompletion}
            onSelect={handleMentionSelect}
            groupedMentions={groupedMentions}
            query={mentionState.query}
            anchorRect={anchorRect}
            containerRef={inputContainerRef}
          />

          {/* Slash Command Popover */}
          <SlashCommandPopover
            open={slashCommandState.isOpen}
            onClose={closeSlashCommand}
            onSelect={handleSlashCommandSelect}
            query={slashCommandState.query}
            anchorRect={slashAnchorRect}
          />

          {/* Emoji Popover */}
          <EmojiPopover
            open={emojiState.isOpen}
            onClose={closeEmojiPopover}
            onSelect={handleEmojiSelect}
            query={emojiState.query}
            selectedIndex={emojiState.selectedIndex}
            onSelectedIndexChange={() => {}}
          />
          {/* Attachment button - hidden in simplified mode when hideAttachmentButton is set */}
          {!(isSimplifiedMode && simplifiedModeSettings.hideAttachmentButton) && (
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
                {t('attachFile', { current: attachments.length, max: uploadSettings.maxFiles })}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Recent files button - hidden in simplified mode when hideAttachmentButton is set */}
          {showRecentFiles &&
            recentFiles.length > 0 &&
            !(isSimplifiedMode && simplifiedModeSettings.hideAttachmentButton) && (
              <RecentFilesPopover
                onSelectFile={(file: RecentFile) => {
                  // Create attachment from recent file
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

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            aria-label={t('selectFiles')}
            onChange={(e) => {
              if (e.target.files) {
                addFiles(e.target.files);
                e.target.value = '';
              }
            }}
          />

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
                  {/* Recording duration indicator */}
                  {isRecording && recordingDuration > 0 && (
                    <span className="absolute -top-1 -right-1 text-[10px] bg-red-500 text-white rounded-full px-1 min-w-5 text-center">
                      {formatDuration(recordingDuration)}
                    </span>
                  )}
                  {/* Language indicator */}
                  {(isListening || isRecording) && (
                    <span className="absolute -bottom-1 -right-1 text-[10px]">
                      {getLanguageFlag(speechLanguage)}
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

          {/* Prompt template picker - hidden in simplified mode when hideAdvancedInputControls is set */}
          {!(isSimplifiedMode && simplifiedModeSettings.hideAdvancedInputControls) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  disabled={isProcessing || disabled}
                  onClick={() => setTemplateSelectorOpen(true)}
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('insertTemplate')}</TooltipContent>
            </Tooltip>
          )}

          {/* Prompt optimizer button - hidden in simplified mode when hideAdvancedInputControls is set */}
          {onOptimizePrompt &&
            value.trim() &&
            !(isSimplifiedMode && simplifiedModeSettings.hideAdvancedInputControls) && (
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

          {/* MCP Tools button - hidden in simplified mode when hideAdvancedInputControls is set */}
          {isMcpAvailable &&
            !(isSimplifiedMode && simplifiedModeSettings.hideAdvancedInputControls) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-primary"
                    disabled={isProcessing || disabled}
                    onClick={() => {
                      const textarea = textareaRef.current;
                      if (textarea) {
                        const pos = textarea.selectionStart || value.length;
                        const newValue = value.slice(0, pos) + '@' + value.slice(pos);
                        handleInputChange(newValue);
                        requestAnimationFrame(() => {
                          textarea.setSelectionRange(pos + 1, pos + 1);
                          textarea.focus();
                        });
                      }
                    }}
                  >
                    <Zap className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('useMcpTools')}</TooltipContent>
              </Tooltip>
            )}

          {/* Tool History button - hidden in simplified mode when hideAdvancedInputControls is set */}
          {isMcpAvailable &&
            !(isSimplifiedMode && simplifiedModeSettings.hideAdvancedInputControls) && (
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
                onInsertPrompt={(prompt) => {
                  onChange(value ? `${value}\n${prompt}` : prompt);
                  textareaRef.current?.focus();
                }}
                onSelectTool={(toolId, prompt) => {
                  const toolParts = toolId.split(':');
                  const mention =
                    toolParts.length >= 3 ? `@${toolParts[1]}:${toolParts[2]}` : `@${toolId}`;
                  onChange(value ? `${value}\n${mention} ${prompt}` : `${mention} ${prompt}`);
                  textareaRef.current?.focus();
                }}
              />
            )}

          {/* Textarea with character counter */}
          <div className="relative flex-1">
            <TextareaAutosize
              ref={textareaRef}
              value={value}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                isListening
                  ? tPlaceholders('listening')
                  : isMcpAvailable
                    ? tPlaceholders('typeToMention')
                    : tPlaceholders('typeMessage')
              }
              className={cn(
                'w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground',
                'max-h-50 min-h-6 py-1 pr-12'
              )}
              maxRows={8}
              disabled={isProcessing || disabled}
              aria-label={t('inputAriaLabel')}
              aria-describedby={speechError ? 'speech-error' : undefined}
            />
            {/* AI Ghost text overlay */}
            {ghostText && textareaRef.current && (
              <GhostTextOverlay
                text={ghostText}
                textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
                onAccept={acceptGhostTextFn}
                onDismiss={dismissGhostTextFn}
                opacity={ghostTextOpacity}
              />
            )}
            {/* Multi-suggestion completion overlay (shown when multiple AI suggestions available) */}
            <CompletionOverlay
              visible={!!ghostText}
              suggestions={ghostText ? [{
                id: `ghost-${Date.now()}`,
                text: ghostText,
                display_text: ghostText,
                confidence: 0.8,
                completion_type: ghostText.includes('\n') ? 'Block' : 'Line',
              }] : []}
              onDismiss={dismissGhostTextFn}
              ghostTextOpacity={ghostTextOpacity}
              showAcceptHint={true}
              className="absolute left-0 right-0 -bottom-10 z-10"
            />
            {/* Character counter */}
            {value.length > 0 && (
              <span
                className={cn(
                  'absolute right-1 bottom-1 text-[10px] text-muted-foreground/60 select-none',
                  value.length > 8000 && 'text-amber-500',
                  value.length > 10000 && 'text-destructive'
                )}
                aria-live="polite"
              >
                {value.length.toLocaleString()}
              </span>
            )}
          </div>

          {/* Speech feedback - interim transcript preview */}
          {(isListening || isRecording) && interimTranscript && (
            <div
              className="absolute left-2 right-2 -top-8 px-2 py-1 bg-muted/80 backdrop-blur-sm rounded text-xs text-muted-foreground truncate"
              aria-live="polite"
            >
              {interimTranscript}
            </div>
          )}

          {/* Speech error display */}
          {speechError && (
            <div
              id="speech-error"
              className="absolute left-2 right-2 -top-8 px-2 py-1 bg-destructive/10 text-destructive rounded text-xs"
              role="alert"
            >
              {t('speechError')}: {speechError.message}
            </div>
          )}

          {/* Send/Stop button */}
          {isProcessing ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleStop}
                >
                  {isStreaming ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isStreaming ? t('stopGenerating') : t('processing')}</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  disabled={!canSend}
                  onClick={handleSubmit}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t('sendMessage')} {sendOnEnter && '(Enter)'}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Bottom Toolbar - hidden in focused/zen simplified modes */}
        {!(
          isSimplifiedMode &&
          (simplifiedModeSettings.preset === 'focused' || simplifiedModeSettings.preset === 'zen')
        ) && (
          <BottomToolbar
            modelName={modelName}
            providerId={providerId}
            webSearchEnabled={webSearchEnabled}
            thinkingEnabled={thinkingEnabled}
            streamingEnabled={streamingEnabled}
            contextUsagePercent={contextUsagePercent}
            onModelClick={onModelClick}
            onWebSearchChange={onWebSearchChange}
            onThinkingChange={onThinkingChange}
            onStreamingChange={onStreamingChange}
            onOpenAISettings={onOpenAISettings}
            onOpenContextSettings={onOpenContextSettings}
            onPresetChange={onPresetChange}
            onCreatePreset={onCreatePreset}
            onManagePresets={onManagePresets}
            onSelectPrompt={(content) => onChange(value ? `${value}\n${content}` : content)}
            onOpenWorkflowPicker={onOpenWorkflowPicker}
            onOpenPromptOptimization={onOpenPromptOptimization}
            onOpenArena={onOpenArena}
            hasActivePreset={hasActivePreset}
            disabled={disabled}
            isProcessing={isProcessing}
            hideTokenCount={isSimplifiedMode && simplifiedModeSettings.hideTokenCount}
            hideWebSearchToggle={isSimplifiedMode && simplifiedModeSettings.hideWebSearchToggle}
            hideThinkingToggle={isSimplifiedMode && simplifiedModeSettings.hideThinkingToggle}
          />
        )}

        {/* Helper text - hidden in focused/zen simplified modes */}
        {!(
          isSimplifiedMode &&
          (simplifiedModeSettings.preset === 'focused' || simplifiedModeSettings.preset === 'zen')
        ) && (
          <p className="mt-1 sm:mt-2 text-center text-[10px] sm:text-xs text-muted-foreground/70">
            <span className="hidden sm:inline">
              {sendOnEnter ? t('enterToSend') : t('clickToSend')}
              {' • '}
              <span>{t('dragDropFiles')}</span>
              {isMcpAvailable && (
                <>
                  {' • '}
                  <span className="text-primary/80">{t('typeAtForMcp')}</span>
                </>
              )}
            </span>
            <span className="sm:hidden">{sendOnEnter ? 'Enter ↵' : 'Click ➤'}</span>
          </p>
        )}
      </div>

      <PromptTemplateSelector
        open={isTemplateSelectorOpen}
        onOpenChange={setTemplateSelectorOpen}
        onSelect={handleTemplateSelect}
      />

      <PreviewDialog
        attachment={previewAttachment}
        onOpenChange={(open) => {
          if (!open) setPreviewAttachment(null);
        }}
      />
    </div>
  );
}

export default ChatInput;
