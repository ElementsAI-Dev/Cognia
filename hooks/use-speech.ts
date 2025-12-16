'use client';

/**
 * useSpeech - hook for text-to-speech and speech-to-text functionality
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

export interface UseSpeechOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export interface UseSpeechReturn {
  // Speech-to-Text
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  sttSupported: boolean;

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
    language = 'zh-CN',
    continuous = true,
    interimResults = true,
    onResult,
    onError,
  } = options;

  // STT state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance>(null);

  // TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check support
  const sttSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const ttsSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Initialize STT
  useEffect(() => {
    if (!sttSupported) return;

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();

    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

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
      onError?.(event.error);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [sttSupported, language, continuous, interimResults, onResult, onError]);

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

  // STT methods
  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;

    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
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
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    sttSupported,

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
