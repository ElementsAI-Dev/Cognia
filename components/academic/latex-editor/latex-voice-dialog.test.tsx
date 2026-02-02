import { render, screen } from '@testing-library/react';
import { LatexVoiceDialog } from './latex-voice-dialog';
import { NextIntlClientProvider } from 'next-intl';

// Mock the voice-to-latex service
jest.mock('@/lib/latex', () => ({
  VoiceToLaTeXService: jest.fn().mockImplementation(() => ({
    convertToLaTeX: jest.fn().mockReturnValue('\\alpha + \\beta'),
  })),
  isVoiceRecognitionSupported: jest.fn().mockReturnValue(true),
  getMathVocabulary: jest.fn().mockReturnValue({
    alpha: '\\alpha',
    beta: '\\beta',
    gamma: '\\gamma',
  }),
}));

// Mock SpeechRecognition
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  onresult: null as ((event: unknown) => void) | null,
  onerror: null as ((event: unknown) => void) | null,
  onend: null as (() => void) | null,
  continuous: false,
  interimResults: false,
  lang: 'en-US',
};

Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: jest.fn().mockImplementation(() => mockSpeechRecognition),
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: jest.fn().mockImplementation(() => mockSpeechRecognition),
});

// Use translation keys that match actual component usage
const messages = {
  latex: {
    voiceInput: 'Voice Input',
    voiceDescription: 'Speak mathematical expressions',
    language: 'Language',
    startListening: 'Start Listening',
    stopListening: 'Stop Listening',
    listening: 'Listening...',
    transcript: 'Transcript',
    result: 'LaTeX Result',
    insert: 'Insert',
    copy: 'Copy',
    copied: 'Copied!',
    notSupported: 'Voice recognition not supported',
    vocabularyHints: 'Vocabulary Hints',
  },
};

const renderWithIntl = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('LatexVoiceDialog', () => {
  const mockOnInsert = jest.fn();
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open is true', () => {
    renderWithIntl(
      <LatexVoiceDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onInsert={mockOnInsert}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    renderWithIntl(
      <LatexVoiceDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        onInsert={mockOnInsert}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders microphone button when open', () => {
    renderWithIntl(
      <LatexVoiceDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onInsert={mockOnInsert}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders action buttons when open', () => {
    renderWithIntl(
      <LatexVoiceDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onInsert={mockOnInsert}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });
});
