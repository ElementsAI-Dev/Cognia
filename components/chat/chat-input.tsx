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
import { Send, Paperclip, Square, Loader2, Mic, X, FileIcon, ImageIcon, Archive, Wand2, Zap, Globe, Brain, Settings2 } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { Button } from '@/components/ui/button';
// TooltipProvider is now at app level in providers.tsx
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSettingsStore, useRecentFilesStore, usePresetStore, useSessionStore } from '@/stores';
import { RecentFilesPopover } from './recent-files-popover';
import { MentionPopover } from './mention-popover';
import { PresetQuickPrompts } from '@/components/presets/preset-quick-prompts';
import { PresetQuickSwitcher } from '@/components/presets/preset-quick-switcher';
import type { RecentFile } from '@/stores/recent-files-store';
import type { MentionItem, SelectedMention, ParsedToolCall } from '@/types/mcp';
import { useMention, useSpeech } from '@/hooks';
import { cn } from '@/lib/utils';
import { transcribeViaApi, formatDuration } from '@/lib/ai/media/speech-api';
import { getLanguageFlag } from '@/types/speech';
import { nanoid } from 'nanoid';

// Helper to get caret coordinates in textarea for mention popover positioning
function getCaretCoordinates(textarea: HTMLTextAreaElement): DOMRect | null {
  const { selectionStart } = textarea;
  if (selectionStart === null) return null;
  
  const mirror = document.createElement('div');
  const computed = window.getComputedStyle(textarea);
  
  const styles = [
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
    'letterSpacing', 'textTransform', 'wordSpacing', 'textIndent',
    'whiteSpace', 'wordWrap', 'lineHeight', 'padding', 'border', 'boxSizing'
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

// Attachment type
export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'file' | 'archive';
  url: string;
  size: number;
  mimeType: string;
  file?: File;
}

// Upload settings
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
    SpeechRecognition: { new(): SpeechRecognition };
    webkitSpeechRecognition: { new(): SpeechRecognition };
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
  onWebSearchChange?: (enabled: boolean) => void;
  onThinkingChange?: (enabled: boolean) => void;
  modelName?: string;
  modeName?: string;
  // Model selection (controlled by parent)
  onModelClick?: () => void;
  onModeClick?: () => void;
  onWorkflowClick?: () => void;
  // Preset management
  onPresetChange?: (preset: import('@/types/preset').Preset) => void;
  onCreatePreset?: () => void;
  onManagePresets?: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileType(mimeType: string): 'image' | 'archive' | 'file' {
  if (mimeType.startsWith('image/')) return 'image';
  if (
    mimeType.includes('zip') ||
    mimeType.includes('tar') ||
    mimeType.includes('rar') ||
    mimeType.includes('7z') ||
    mimeType.includes('gzip')
  ) {
    return 'archive';
  }
  return 'file';
}

function getFileIcon(type: 'image' | 'archive' | 'file') {
  switch (type) {
    case 'image':
      return <ImageIcon className="h-4 w-4" />;
    case 'archive':
      return <Archive className="h-4 w-4" />;
    default:
      return <FileIcon className="h-4 w-4" />;
  }
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
  onWebSearchChange,
  onThinkingChange,
  modelName = 'GPT-4o',
  modeName: _modeName,
  onModelClick,
  onModeClick: _onModeClick,
  onPresetChange,
  onCreatePreset,
  onManagePresets,
}: ChatInputProps) {
  const t = useTranslations('chatInput');
  const tPlaceholders = useTranslations('placeholders');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const sendOnEnter = useSettingsStore((state) => state.sendOnEnter);
  const addRecentFile = useRecentFilesStore((state) => state.addFile);
  const allRecentFiles = useRecentFilesStore((state) => state.recentFiles);
  
  // Mention popover positioning
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  
  // MCP Mention system
  const {
    mentionState,
    groupedMentions,
    handleTextChange,
    selectMention,
    closeMention,
    parseToolCalls,
    isMcpAvailable,
  } = useMention({
    onMentionsChange,
  });
  
  // Memoize recent files to avoid unnecessary re-renders
  const recentFiles = useMemo(() => 
    [...allRecentFiles]
      .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())
      .slice(0, 10),
    [allRecentFiles]
  );

  // Attachments state
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Voice input with enhanced speech hook
  const {
    isListening,
    isRecording,
    transcript: _speechTranscript,
    interimTranscript: _interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    sttSupported: speechSupported,
    currentProvider: speechProvider,
    currentLanguage: speechLanguage,
    error: _speechError,
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
        onSubmit(text, attachments.length > 0 ? attachments : undefined, parseToolCalls(text).length > 0 ? parseToolCalls(text) : undefined);
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

  // Handle input change with mention detection
  const handleInputChange = useCallback((newValue: string) => {
    onChange(newValue);
    const textarea = textareaRef.current;
    if (textarea) {
      const pos = textarea.selectionStart || 0;
      handleTextChange(newValue, pos);
    }
  }, [onChange, handleTextChange]);

  // Handle cursor position changes for mention popover
  const handleSelectionChange = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      const pos = textarea.selectionStart || 0;
      handleTextChange(value, pos);
      
      if (mentionState.isOpen) {
        const rect = getCaretCoordinates(textarea);
        setAnchorRect(rect);
      }
    }
  }, [value, handleTextChange, mentionState.isOpen]);

  // Handle mention selection from popover
  const handleMentionSelect = useCallback((item: MentionItem) => {
    const { newText, newCursorPosition } = selectMention(item);
    onChange(newText);
    
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
        textarea.focus();
      }
    });
  }, [selectMention, onChange]);

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
  const validateFile = useCallback((file: File): string | null => {
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
  }, [uploadSettings]);

  // Use ref for attachments length to avoid recreating addFiles on every change
  const attachmentsLengthRef = useRef(attachments.length);
  useEffect(() => {
    attachmentsLengthRef.current = attachments.length;
  }, [attachments.length]);

  // Add files - use ref for attachments.length to keep callback stable
  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remainingSlots = uploadSettings.maxFiles - attachmentsLengthRef.current;

    if (fileArray.length > remainingSlots) {
      setUploadError(`Can only add ${remainingSlots} more files. Maximum is ${uploadSettings.maxFiles}.`);
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

      // Track in recent files
      addRecentFile({
        name: file.name,
        path: file.name,
        type: getFileType(file.type) === 'image' ? 'image' : 'file',
        mimeType: file.type,
        size: file.size,
        url: attachment.url,
      });
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
      setUploadError(null);
    }
  }, [uploadSettings.maxFiles, validateFile, addRecentFile]);

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const { files } = e.dataTransfer;
    if (files?.length) {
      addFiles(files);
    }
  }, [addFiles]);

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
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
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
  }, [addFiles]);

  const handleSubmit = useCallback(() => {
    if (!canSend) return;
    // Parse tool calls from the message
    const toolCalls = parseToolCalls(value);
    onSubmit(value, attachments.length > 0 ? attachments : undefined, toolCalls.length > 0 ? toolCalls : undefined);
    onChange('');
    setAttachments([]);
    textareaRef.current?.focus();
  }, [canSend, value, attachments, onSubmit, onChange, parseToolCalls]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If mention popover is open, let it handle navigation keys
    if (mentionState.isOpen) {
      if (['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
        // These are handled by MentionPopover
        return;
      }
    }
    
    if (e.key === 'Enter' && !e.shiftKey && sendOnEnter && !mentionState.isOpen) {
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
      className={cn(
        'border-t border-border/50 bg-background/95 backdrop-blur-sm p-4 transition-all duration-200',
        isDragging && 'bg-accent/50 border-primary'
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md animate-in fade-in-0 duration-200">
          <div className="flex flex-col items-center gap-3 text-primary animate-in zoom-in-95 duration-200">
            <div className="rounded-full bg-primary/10 p-4">
              <Paperclip className="h-10 w-10" />
            </div>
            <span className="text-lg font-medium">{t('dropFilesHere')}</span>
          </div>
        </div>
      )}

      <div className="relative mx-auto max-w-3xl">
          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="group relative flex items-center gap-2 rounded-xl border border-border/50 bg-muted/50 px-3 py-2 cursor-pointer hover:bg-accent hover:border-accent transition-all duration-150"
                  onClick={() => setPreviewAttachment(attachment)}
                >
                  {attachment.type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="h-8 w-8 rounded object-cover"
                    />
                  ) : (
                    getFileIcon(attachment.type)
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate max-w-[150px]">
                      {attachment.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.size)}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAttachment(attachment.id);
                    }}
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 opacity-0 transition-all duration-150 group-hover:opacity-100 hover:scale-110"
                  >
                    <X className="h-3 w-3 text-destructive-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload error */}
          {uploadError && (
            <Alert variant="destructive" className="mb-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
              <AlertDescription className="flex items-center justify-between">
                <span>{uploadError}</span>
                <button
                  onClick={() => setUploadError(null)}
                  className="ml-2 underline hover:no-underline transition-all"
                >
                  {t('dismiss')}
                </button>
              </AlertDescription>
            </Alert>
          )}

          <div ref={inputContainerRef} className="relative flex items-end gap-2 rounded-2xl border border-input/50 bg-card p-2 shadow-md focus-within:shadow-lg focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-ring/10 transition-all duration-200">
            {/* Mention Popover */}
            <MentionPopover
              open={mentionState.isOpen}
              onClose={closeMention}
              onSelect={handleMentionSelect}
              groupedMentions={groupedMentions}
              query={mentionState.query}
              anchorRect={anchorRect}
              containerRef={inputContainerRef}
            />
            {/* Attachment button */}
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

            {/* Recent files button */}
            {showRecentFiles && recentFiles.length > 0 && (
              <RecentFilesPopover
                onSelectFile={(file: RecentFile) => {
                  // Create attachment from recent file
                  const attachment: Attachment = {
                    id: nanoid(),
                    name: file.name,
                    type: file.type === 'image' ? 'image' : file.type === 'document' ? 'file' : 'file',
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
                      <span className="absolute -top-1 -right-1 text-[10px] bg-red-500 text-white rounded-full px-1 min-w-[20px] text-center">
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

            {/* Prompt optimizer button */}
            {onOptimizePrompt && value.trim() && (
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
                <TooltipContent>
                  {t('optimizePrompt')}
                </TooltipContent>
              </Tooltip>
            )}

            {/* MCP Tools button */}
            {isMcpAvailable && (
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
                <TooltipContent>
                  {t('useMcpTools')}
                </TooltipContent>
              </Tooltip>
            )}

            {/* Textarea */}
            <TextareaAutosize
              ref={textareaRef}
              value={value}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={isListening ? tPlaceholders('listening') : (isMcpAvailable ? tPlaceholders('typeToMention') : tPlaceholders('typeMessage'))}
              className={cn(
                'flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground',
                'max-h-[200px] min-h-[24px] py-1'
              )}
              maxRows={8}
              disabled={isProcessing || disabled}
            />

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
                <TooltipContent>
                  {isStreaming ? t('stopGenerating') : t('processing')}
                </TooltipContent>
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

          {/* Bottom toolbar with feature toggles */}
          <div className="mt-1 sm:mt-2 flex items-center justify-between px-1">
            {/* Left side - Feature toggles */}
            <div className="flex items-center gap-1">
              {/* Model selector */}
              {onModelClick && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 sm:h-7 gap-1 sm:gap-1.5 px-1.5 sm:px-2 text-[10px] sm:text-xs font-normal text-muted-foreground hover:text-foreground"
                      onClick={onModelClick}
                    >
                      <span className="font-medium">⚡</span>
                      <span className="max-w-[60px] sm:max-w-[100px] truncate">{modelName}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('changeModel')}</TooltipContent>
                </Tooltip>
              )}

              {/* Divider */}
              <div className="mx-0.5 sm:mx-1 h-3 sm:h-4 w-px bg-border" />

              {/* Web Search toggle - enhanced with label */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-6 sm:h-7 gap-1 sm:gap-1.5 px-1.5 sm:px-2 text-[10px] sm:text-xs font-normal',
                      webSearchEnabled 
                        ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => onWebSearchChange?.(!webSearchEnabled)}
                  >
                    <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden sm:inline">{t('search')}</span>
                    {webSearchEnabled && <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-primary animate-pulse" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('toggleWebSearch')}</TooltipContent>
              </Tooltip>

              {/* Thinking Mode toggle - enhanced with label */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-6 sm:h-7 gap-1 sm:gap-1.5 px-1.5 sm:px-2 text-[10px] sm:text-xs font-normal',
                      thinkingEnabled 
                        ? 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20' 
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => onThinkingChange?.(!thinkingEnabled)}
                  >
                    <Brain className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden sm:inline">{t('think')}</span>
                    {thinkingEnabled && <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-purple-500 animate-pulse" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('extendedThinking')}</TooltipContent>
              </Tooltip>

              {/* AI Settings */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 sm:h-7 sm:w-7"
                    onClick={onOpenAISettings}
                  >
                    <Settings2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('aiSettings')}</TooltipContent>
              </Tooltip>

              {/* Divider - hidden on very small screens */}
              <div className="hidden min-[400px]:block mx-0.5 sm:mx-1 h-3 sm:h-4 w-px bg-border" />

              {/* Preset Quick Switcher - hidden on very small screens */}
              <div className="hidden min-[400px]:block">
                <PresetQuickSwitcher
                  onPresetChange={onPresetChange}
                  onCreateNew={onCreatePreset}
                  onManage={onManagePresets}
                  disabled={isProcessing || disabled}
                />
              </div>

              {/* Preset Quick Prompts - hidden on small screens */}
              <div className="hidden sm:block">
                <PresetQuickPromptsWrapper
                  onSelectPrompt={(content) => {
                    onChange(value ? `${value}\n${content}` : content);
                  }}
                  disabled={isProcessing || disabled}
                />
              </div>
            </div>

            {/* Right side - Context usage with progress bar */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={onOpenContextSettings}
                className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors group"
                title={t('contextWindowUsage')}
              >
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <div className="w-10 sm:w-16 h-1 sm:h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        contextUsagePercent < 50 ? "bg-green-500" :
                        contextUsagePercent < 80 ? "bg-yellow-500" : "bg-red-500"
                      )}
                      style={{ width: `${Math.min(100, contextUsagePercent)}%` }}
                    />
                  </div>
                  <span className={cn(
                    "tabular-nums",
                    contextUsagePercent >= 80 && "text-red-500 font-medium"
                  )}>
                    {contextUsagePercent}%
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Helper text - simplified on small screens */}
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
            <span className="sm:hidden">
              {sendOnEnter ? 'Enter ↵' : 'Click ➤'}
            </span>
          </p>
        </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewAttachment} onOpenChange={(open) => !open && setPreviewAttachment(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewAttachment?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {previewAttachment?.type === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewAttachment.url}
                alt={previewAttachment.name}
                className="max-h-[60vh] max-w-full rounded-lg object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 py-8">
                {getFileIcon(previewAttachment?.type || 'file')}
                <span className="text-lg font-medium">{previewAttachment?.name}</span>
                <span className="text-sm text-muted-foreground">
                  {previewAttachment?.mimeType} • {formatFileSize(previewAttachment?.size || 0)}
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Wrapper component for PresetQuickPrompts that gets prompts from current preset
function PresetQuickPromptsWrapper({
  onSelectPrompt,
  disabled,
}: {
  onSelectPrompt: (content: string) => void;
  disabled?: boolean;
}) {
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const sessions = useSessionStore((state) => state.sessions);
  const presets = usePresetStore((state) => state.presets);
  
  // Get current session's preset
  const currentSession = activeSessionId ? sessions.find(s => s.id === activeSessionId) : null;
  const presetId = currentSession?.presetId;
  const currentPreset = presetId ? presets.find(p => p.id === presetId) : null;
  
  // Get builtin prompts from preset
  const prompts = currentPreset?.builtinPrompts || [];
  
  if (prompts.length === 0) {
    return null;
  }
  
  return (
    <PresetQuickPrompts
      prompts={prompts}
      onSelectPrompt={onSelectPrompt}
      disabled={disabled}
    />
  );
}

export default ChatInput;
