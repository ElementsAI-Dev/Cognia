'use client';

/**
 * ChatInput - Enhanced message input with voice, attachments, and drag-drop
 */

import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { Send, Paperclip, Square, Loader2, Mic, X, FileIcon, ImageIcon, Archive, Wand2 } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { Button } from '@/components/ui/button';
// TooltipProvider is now at app level in providers.tsx
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useSettingsStore, useRecentFilesStore } from '@/stores';
import { RecentFilesPopover } from './recent-files-popover';
import type { RecentFile } from '@/stores/recent-files-store';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';

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
  onSubmit: (content: string, attachments?: Attachment[]) => void;
  isLoading?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  disabled?: boolean;
  uploadSettings?: UploadSettings;
  onOptimizePrompt?: () => void;
  showRecentFiles?: boolean;
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
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const sendOnEnter = useSettingsStore((state) => state.sendOnEnter);
  const addRecentFile = useRecentFilesStore((state) => state.addFile);
  const allRecentFiles = useRecentFilesStore((state) => state.recentFiles);
  
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

  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Check speech support synchronously during initial render (not in effect)
  const [speechSupported] = useState(() => 
    typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );

  // Preview state
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

  const isProcessing = isLoading || isStreaming;
  const canSend = (value.trim().length > 0 || attachments.length > 0) && !isProcessing && !disabled;

  // Store refs for speech recognition callbacks
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  
  // Keep refs updated
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  }, [value, onChange]);

  // Initialize speech recognition - only once on mount
  useEffect(() => {
    if (!speechSupported) return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechRecognition = new SpeechRecognition();

    speechRecognition.continuous = true;
    speechRecognition.interimResults = true;
    speechRecognition.lang = 'zh-CN'; // Can be configured

    speechRecognition.onstart = () => setIsListening(true);
    speechRecognition.onend = () => setIsListening(false);

    speechRecognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0]?.transcript ?? '';
        }
      }
      if (finalTranscript) {
        const currentValue = valueRef.current;
        onChangeRef.current(currentValue + (currentValue ? ' ' : '') + finalTranscript);
      }
    };

    speechRecognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognitionRef.current = speechRecognition;

    return () => {
      speechRecognition.stop();
    };
  }, [speechSupported]);

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
    onSubmit(value, attachments.length > 0 ? attachments : undefined);
    onChange('');
    setAttachments([]);
    textareaRef.current?.focus();
  }, [canSend, value, attachments, onSubmit, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && sendOnEnter) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleStop = () => {
    onStop?.();
  };

  const toggleVoice = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  }, [isListening]);

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
  }, []);

  return (
    <div
      ref={dropZoneRef}
      className={cn(
        'border-t border-border bg-background p-4 transition-colors',
        isDragging && 'bg-accent/50 border-primary'
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Paperclip className="h-12 w-12" />
            <span className="text-lg font-medium">Drop files here</span>
          </div>
        </div>
      )}

      <div className="relative mx-auto max-w-3xl">
          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="group relative flex items-center gap-2 rounded-lg border bg-card px-3 py-2 cursor-pointer hover:bg-accent"
                  onClick={() => setPreviewAttachment(attachment)}
                >
                  {attachment.type === 'image' ? (
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
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3 text-destructive-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload error */}
          {uploadError && (
            <div className="mb-2 rounded-lg bg-destructive/10 p-2 text-sm text-destructive">
              {uploadError}
              <button
                onClick={() => setUploadError(null)}
                className="ml-2 underline"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 rounded-2xl border border-input bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/20">
            {/* Attachment button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  disabled={isProcessing || disabled}
                  onClick={openFileDialog}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Attach file ({attachments.length}/{uploadSettings.maxFiles})
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
                      'h-8 w-8 shrink-0 transition-colors',
                      isListening && 'bg-red-500/20 text-red-500 animate-pulse'
                    )}
                    disabled={isProcessing || disabled}
                    onClick={toggleVoice}
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isListening ? 'Stop listening' : 'Voice input'}
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
                  Optimize prompt
                </TooltipContent>
              </Tooltip>
            )}

            {/* Textarea */}
            <TextareaAutosize
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={isListening ? 'Listening...' : 'Type a message...'}
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
                    className="h-8 w-8 flex-shrink-0"
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
                  {isStreaming ? 'Stop generating' : 'Processing...'}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    disabled={!canSend}
                    onClick={handleSubmit}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Send message {sendOnEnter && '(Enter)'}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Helper text */}
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {sendOnEnter
              ? 'Press Enter to send, Shift+Enter for new line'
              : 'Click send button to send message'}
            {' • '}
            <span>Drag & drop or paste files</span>
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

export default ChatInput;
