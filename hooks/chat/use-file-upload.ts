'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { useRecentFilesStore } from '@/stores';
import { formatFileSize, getFileType } from '@/lib/chat/file-utils';
import type { Attachment } from '@/types/core/message';
import type { UploadSettings } from '@/types/core/chat-input';
import { DEFAULT_UPLOAD_SETTINGS } from '@/types/core/chat-input';

export interface UseFileUploadOptions {
  uploadSettings?: UploadSettings;
}

export interface UseFileUploadReturn {
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  isDragging: boolean;
  uploadError: string | null;
  setUploadError: (error: string | null) => void;
  previewAttachment: Attachment | null;
  setPreviewAttachment: (attachment: Attachment | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  dropZoneRef: React.RefObject<HTMLDivElement | null>;
  addFiles: (files: FileList | File[]) => void;
  removeAttachment: (id: string) => void;
  handleDragEnter: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handlePaste: (e: React.ClipboardEvent) => void;
  openFileDialog: () => void;
}

export function useFileUpload({
  uploadSettings = DEFAULT_UPLOAD_SETTINGS,
}: UseFileUploadOptions = {}): UseFileUploadReturn {
  const addRecentFile = useRecentFilesStore((state) => state.addFile);

  // Core state
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropZoneRef = useRef<HTMLDivElement | null>(null);
  const attachmentsLengthRef = useRef(attachments.length);

  useEffect(() => {
    attachmentsLengthRef.current = attachments.length;
  }, [attachments.length]);

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

  // Add files
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

  // Drag handlers
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

  // Open file dialog
  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Cleanup URL objects on unmount
  useEffect(() => {
    return () => {
      attachments.forEach((attachment) => {
        if (attachment.url) {
          URL.revokeObjectURL(attachment.url);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    attachments,
    setAttachments,
    isDragging,
    uploadError,
    setUploadError,
    previewAttachment,
    setPreviewAttachment,
    fileInputRef,
    dropZoneRef,
    addFiles,
    removeAttachment,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handlePaste,
    openFileDialog,
  };
}
