/**
 * Audio and Speech Recognition Types
 */

// Audio recording state
export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

// Audio playback state
export type PlaybackState = 'idle' | 'playing' | 'paused' | 'stopped';

// Speech recognition result
export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

// Audio recording options
export interface RecordingOptions {
  sampleRate?: number;
  channelCount?: number;
  bitDepth?: number;
}

// Type definitions for Speech APIs
export interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null;
  onend: ((event: Event) => void) | null;
}

export interface ISpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

export interface ISpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export interface ISpeechRecognitionResult extends SpeechRecognitionResult {
  length: number;
  item(index: number): ISpeechRecognitionAlternative;
}

export interface ISpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionResultList {
  length: number;
  item(index: number): ISpeechRecognitionResult;
  [index: number]: ISpeechRecognitionResult;
}
