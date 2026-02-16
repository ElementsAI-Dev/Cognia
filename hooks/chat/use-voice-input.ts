'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { useSpeech } from '@/hooks';
import { transcribeViaApi } from '@/lib/ai/media/speech-api';
import type { Attachment } from '@/types/core/message';
import type { ParsedToolCall } from '@/types/mcp';

export interface UseVoiceInputOptions {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (content: string, attachments?: Attachment[], toolCalls?: ParsedToolCall[]) => void;
  canSend: boolean;
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  parseToolCalls: (text: string) => ParsedToolCall[];
}

export interface UseVoiceInputReturn {
  isListening: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  interimTranscript: string;
  speechSupported: boolean;
  speechProvider: string;
  speechLanguage: string;
  speechError: { message: string } | null;
  recordingDuration: number;
  toggleVoice: () => void;
}

export function useVoiceInput({
  value,
  onChange,
  onSubmit,
  canSend,
  attachments,
  setAttachments,
  parseToolCalls,
}: UseVoiceInputOptions): UseVoiceInputReturn {
  // Store refs for speech recognition callbacks
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  // Keep refs updated
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  }, [value, onChange]);

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

  const toggleVoice = useCallback(() => {
    if (isListening || isRecording) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, isRecording, startListening, stopListening]);

  return {
    isListening,
    isRecording,
    isTranscribing,
    interimTranscript,
    speechSupported,
    speechProvider,
    speechLanguage,
    speechError,
    recordingDuration,
    toggleVoice,
  };
}
