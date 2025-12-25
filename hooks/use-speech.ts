'use client';

/**
 * useSpeech - Enhanced hook for text-to-speech and speech-to-text functionality
 * 
 * Features:
 * - Browser native Speech Recognition API
 * - OpenAI Whisper API support (via audio recording)
 * - Settings store integration
 * - Audio recording with MediaRecorder
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSettingsStore } from '@/stores';
import type { SpeechLanguageCode, SpeechProvider, SpeechError } from '@/types/speech';
import { getSpeechError } from '@/types/speech';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

export interface UseSpeechOptions {
  language?: SpeechLanguageCode;
  provider?: SpeechProvider;
  continuous?: boolean;
  interimResults?: boolean;
  autoSend?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: SpeechError) => void;
  onAutoSend?: (transcript: string) => void;
  // Use settings from store (default: true)
  useSettings?: boolean;
}

export interface UseSpeechReturn {
  // Speech-to-Text
  isListening: boolean;
  isRecording: boolean; // For Whisper API mode
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  sttSupported: boolean;
  currentProvider: SpeechProvider;
  currentLanguage: SpeechLanguageCode;
  error: SpeechError | null;
  
  // Audio recording (for Whisper)
  audioBlob: Blob | null;
  recordingDuration: number;

  // Text-to-Speech
  isSpeaking: boolean;
  speak: (text: string, options?: SpeakOptions) => void;
  stopSpeaking: () => void;
  pauseSpeaking: () => void;
  resumeSpeaking: () => void;
  ttsSupported: boolean;
  voices: SpeechSynthesisVoice[];
}

export interface SpeakOptions {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

export function useSpeech(options: UseSpeechOptions = {}): UseSpeechReturn {
  const {
    useSettings = true,
    onResult,
    onError,
    onAutoSend,
  } = options;

  // Get settings from store
  const speechSettings = useSettingsStore((state) => state.speechSettings);
  
  // Merge options with settings
  const language = options.language ?? (useSettings ? speechSettings.sttLanguage : 'zh-CN');
  const provider = options.provider ?? (useSettings ? speechSettings.sttProvider : 'system');
  const continuous = options.continuous ?? (useSettings ? speechSettings.sttContinuous : true);
  const interimResults = options.interimResults ?? (useSettings ? speechSettings.sttInterimResults : true);
  const autoSend = options.autoSend ?? (useSettings ? speechSettings.sttAutoSend : false);

  // STT state
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<SpeechError | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance>(null);
  
  // Audio recording state (for Whisper API)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check support
  const browserSttSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  
  const mediaRecorderSupported =
    typeof window !== 'undefined' && 'MediaRecorder' in window;
  
  // STT is supported if browser API works OR we can record for Whisper
  const sttSupported = browserSttSupported || (provider === 'openai' && mediaRecorderSupported);

  const ttsSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Initialize browser STT (only for system provider)
  useEffect(() => {
    if (!browserSttSupported || provider !== 'system') return;

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();

    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };
    
    recognition.onend = () => {
      setIsListening(false);
      // Auto-send if enabled and we have a transcript
      if (autoSend && transcript.trim()) {
        onAutoSend?.(transcript);
      }
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? '';

        if (result.isFinal) {
          finalTranscript += text;
        } else {
          interim += text;
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
        onResult?.(finalTranscript, true);
      }

      setInterimTranscript(interim);
      if (interim) {
        onResult?.(interim, false);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      const speechError = getSpeechError(event.error as Parameters<typeof getSpeechError>[0]);
      setError(speechError);
      onError?.(speechError);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [browserSttSupported, provider, language, continuous, interimResults, autoSend, transcript, onResult, onError, onAutoSend]);

  // Initialize TTS voices
  useEffect(() => {
    if (!ttsSupported) return;

    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, [ttsSupported]);

  // Start audio recording for Whisper API
  const startRecording = useCallback(async () => {
    if (!mediaRecorderSupported) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setIsRecording(false);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Clear timer
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setError(null);
      
      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(Date.now() - recordingStartTimeRef.current);
      }, 100);
      
    } catch (err) {
      console.error('Failed to start recording:', err);
      const speechError = getSpeechError('audio-capture');
      setError(speechError);
      onError?.(speechError);
    }
  }, [mediaRecorderSupported, onError]);
  
  // Stop audio recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // STT methods
  const startListening = useCallback(() => {
    setError(null);
    
    if (provider === 'openai') {
      // Use audio recording for Whisper
      startRecording();
    } else {
      // Use browser Speech Recognition
      if (!recognitionRef.current || isListening) return;
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        const speechError = getSpeechError('aborted');
        setError(speechError);
        onError?.(speechError);
      }
    }
  }, [provider, isListening, startRecording, onError]);

  const stopListening = useCallback(() => {
    if (provider === 'openai') {
      stopRecording();
    } else {
      if (!recognitionRef.current) return;
      recognitionRef.current.stop();
    }
  }, [provider, stopRecording]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setAudioBlob(null);
    setRecordingDuration(0);
    setError(null);
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // TTS methods
  const speak = useCallback(
    (text: string, speakOptions: SpeakOptions = {}) => {
      if (!ttsSupported) return;

      // Cancel any ongoing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      if (speakOptions.voice) {
        utterance.voice = speakOptions.voice;
      } else {
        // Try to find a voice matching the language
        const matchingVoice = voices.find((v) =>
          v.lang.startsWith(speakOptions.lang || language)
        );
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }
      }

      utterance.rate = speakOptions.rate ?? 1;
      utterance.pitch = speakOptions.pitch ?? 1;
      utterance.volume = speakOptions.volume ?? 1;
      utterance.lang = speakOptions.lang || language;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
    },
    [ttsSupported, voices, language]
  );

  const stopSpeaking = useCallback(() => {
    if (!ttsSupported) return;
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [ttsSupported]);

  const pauseSpeaking = useCallback(() => {
    if (!ttsSupported) return;
    speechSynthesis.pause();
  }, [ttsSupported]);

  const resumeSpeaking = useCallback(() => {
    if (!ttsSupported) return;
    speechSynthesis.resume();
  }, [ttsSupported]);

  return {
    // STT
    isListening: isListening || isRecording,
    isRecording,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    sttSupported,
    currentProvider: provider,
    currentLanguage: language,
    error,
    
    // Audio recording
    audioBlob,
    recordingDuration,

    // TTS
    isSpeaking,
    speak,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    ttsSupported,
    voices,
  };
}

export default useSpeech;
