/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SpeechSettings } from './speech-settings';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      speechToText: 'Speech to Text',
      sttDescription: 'Configure voice input settings',
      enableVoiceInput: 'Enable Voice Input',
      enableVoiceInputDesc: 'Allow voice input using microphone',
      language: 'Language',
      provider: 'Provider',
      systemSpeech: 'System (Browser)',
      systemSpeechDesc: 'Uses browser built-in speech recognition',
      whisperDesc: 'Uses OpenAI Whisper API',
      needsApiKey: 'Needs API key',
      continuousMode: 'Continuous Mode',
      continuousModeDesc: 'Keep listening after each phrase',
      autoSend: 'Auto Send',
      autoSendDesc: 'Automatically send message',
      autoStopSilence: 'Auto Stop on Silence',
      autoStopSilenceDesc: 'Stop listening after silence',
      disabled: 'Disabled',
      textToSpeech: 'Text to Speech',
      ttsDescription: 'Configure voice output settings',
      enableTts: 'Enable Text-to-Speech',
      enableTtsDesc: 'Allow AI responses to be read aloud',
      voice: 'Voice',
      selectVoice: 'Select a voice...',
      noVoices: 'No voices available',
      default: 'Default',
      speechRate: 'Speech Rate',
      slow: 'Slow',
      normal: 'Normal',
      fast: 'Fast',
      pitch: 'Pitch',
      volume: 'Volume',
      autoPlayResponses: 'Auto-play Responses',
      autoPlayResponsesDesc: 'Automatically read AI responses',
      testVoice: 'Test Voice',
      stopTest: 'Stop',
      browserSupport: 'Browser Support',
      speechRecognition: 'Speech Recognition',
      speechSynthesis: 'Speech Synthesis',
      availableVoices: 'Available Voices',
      supported: 'Supported',
      notSupported: 'Not Supported',
      browserSupportNote: 'Speech features depend on browser support',
      processing: 'Processing...',
    };
    return translations[key] || key;
  },
}));

// Mock stores
const mockSpeechSettings = {
  sttEnabled: true,
  sttLanguage: 'zh-CN',
  sttProvider: 'system',
  sttContinuous: true,
  sttInterimResults: true,
  sttAutoSend: false,
  sttAutoStopSilence: 3000,
  ttsEnabled: false,
  ttsVoice: '',
  ttsRate: 1.0,
  ttsPitch: 1.0,
  ttsVolume: 1.0,
  ttsAutoPlay: false,
};

const mockSetters = {
  setSttEnabled: jest.fn(),
  setSttLanguage: jest.fn(),
  setSttProvider: jest.fn(),
  setSttContinuous: jest.fn(),
  setSttAutoSend: jest.fn(),
  setTtsEnabled: jest.fn(),
  setTtsVoice: jest.fn(),
  setTtsRate: jest.fn(),
  setTtsAutoPlay: jest.fn(),
  setSpeechSettings: jest.fn(),
};

jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: unknown) => unknown) => {
    const state = {
      speechSettings: mockSpeechSettings,
      providerSettings: {
        openai: { apiKey: 'test-key' },
      },
      ...mockSetters,
    };
    return selector(state);
  },
}));

// Mock UI components to avoid React 19 issues
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, id }: { checked?: boolean; onCheckedChange?: (checked: boolean) => void; id?: string }) => (
    <input type="checkbox" data-testid={id || 'switch'} checked={checked} onChange={(e) => onCheckedChange?.(e.target.checked)} />
  ),
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, id }: { value?: number[]; onValueChange?: (value: number[]) => void; id?: string }) => (
    <input type="range" data-testid={id || 'slider'} value={value?.[0]} onChange={(e) => onValueChange?.([Number(e.target.value)])} />
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value }: { children: React.ReactNode; value?: string }) => (
    <div data-testid="select" data-value={value}>{children}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: string; size?: string; className?: string }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size} className={className}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

// Mock speech recognition support
const mockSpeechRecognition = jest.fn();
Object.defineProperty(window, 'SpeechRecognition', {
  value: mockSpeechRecognition,
  writable: true,
});

// Mock speech synthesis
const mockSpeechSynthesis = {
  getVoices: jest.fn(() => [
    { name: 'Google 普通话', lang: 'zh-CN', default: true },
    { name: 'Google US English', lang: 'en-US', default: false },
  ]),
  speak: jest.fn(),
  cancel: jest.fn(),
  onvoiceschanged: null,
};
Object.defineProperty(window, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true,
});

// Mock SpeechSynthesisUtterance
class MockSpeechSynthesisUtterance {
  text = '';
  voice = null;
  rate = 1;
  pitch = 1;
  volume = 1;
  lang = '';
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  
  constructor(text?: string) {
    if (text) this.text = text;
  }
}
Object.defineProperty(window, 'SpeechSynthesisUtterance', {
  value: MockSpeechSynthesisUtterance,
  writable: true,
});

describe('SpeechSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<SpeechSettings />);
    // Component should render cards
    expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
  });

  it('renders STT section elements', () => {
    render(<SpeechSettings />);
    // Check for main sections via card test ids
    const cards = screen.getAllByTestId('card');
    expect(cards.length).toBeGreaterThanOrEqual(3); // At least STT, TTS, and Browser Support
  });

  it('renders switches for settings', () => {
    render(<SpeechSettings />);
    // Check for switch elements
    const switches = screen.getAllByTestId(/switch/);
    expect(switches.length).toBeGreaterThan(0);
  });

  it('renders select elements', () => {
    render(<SpeechSettings />);
    // Check for select elements
    const selects = screen.getAllByTestId('select');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('renders slider for speech rate', () => {
    render(<SpeechSettings />);
    // Check for slider element
    const sliders = screen.getAllByTestId('slider');
    expect(sliders.length).toBeGreaterThan(0);
  });
});
