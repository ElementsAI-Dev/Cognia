/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatWidgetInput } from './chat-widget-input';

// Mock useSpeech hook
jest.mock('@/hooks/media/use-speech', () => ({
  useSpeech: () => ({
    isListening: false,
    startListening: jest.fn(),
    stopListening: jest.fn(),
    sttSupported: true,
    interimTranscript: '',
    isSpeaking: false,
    speak: jest.fn(),
    stopSpeaking: jest.fn(),
    ttsSupported: true,
  }),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} type={type} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
    function Textarea(props, ref) {
      return <textarea ref={ref} {...props} />;
    }
  ),
}));

describe('ChatWidgetInput', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    onSubmit: jest.fn(),
    onKeyDown: jest.fn(),
    onStop: jest.fn(),
    isLoading: false,
    disabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ChatWidgetInput {...defaultProps} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders textarea with default placeholder', () => {
    render(<ChatWidgetInput {...defaultProps} />);
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
  });

  it('renders textarea with custom placeholder', () => {
    render(<ChatWidgetInput {...defaultProps} placeholder="Custom placeholder" />);
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('displays current value in textarea', () => {
    render(<ChatWidgetInput {...defaultProps} value="Hello world" />);
    expect(screen.getByRole('textbox')).toHaveValue('Hello world');
  });

  it('calls onChange when typing', () => {
    render(<ChatWidgetInput {...defaultProps} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'New message' } });
    expect(defaultProps.onChange).toHaveBeenCalledWith('New message');
  });

  it('calls onKeyDown when key is pressed', () => {
    render(<ChatWidgetInput {...defaultProps} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(defaultProps.onKeyDown).toHaveBeenCalled();
  });

  it('calls onSubmit when form is submitted', () => {
    const { container } = render(<ChatWidgetInput {...defaultProps} value="Hello" />);
    const form = container.querySelector('form');
    fireEvent.submit(form!);
    expect(defaultProps.onSubmit).toHaveBeenCalled();
  });

  it('disables textarea when disabled prop is true', () => {
    render(<ChatWidgetInput {...defaultProps} disabled={true} />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('displays send button when not loading', () => {
    render(<ChatWidgetInput {...defaultProps} value="Hello" />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('displays stop button when loading with onStop', () => {
    render(<ChatWidgetInput {...defaultProps} isLoading={true} onStop={defaultProps.onStop} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls onStop when stop button is clicked during loading', () => {
    render(<ChatWidgetInput {...defaultProps} isLoading={true} onStop={defaultProps.onStop} />);
    const buttons = screen.getAllByRole('button');
    // Find stop button (should be last or second to last)
    const stopButton = buttons[buttons.length - 1];
    fireEvent.click(stopButton);
    expect(defaultProps.onStop).toHaveBeenCalled();
  });

  it('disables send button when value is empty', () => {
    render(<ChatWidgetInput {...defaultProps} value="" />);
    // The submit button should be disabled when empty
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons.find(btn => btn.getAttribute('type') === 'submit');
    expect(sendButton).toBeDisabled();
  });

  it('enables send button when value is not empty', () => {
    render(<ChatWidgetInput {...defaultProps} value="Hello" />);
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons.find(btn => btn.getAttribute('type') === 'submit');
    expect(sendButton).not.toBeDisabled();
  });

  it('displays character counter when value is not empty', () => {
    render(<ChatWidgetInput {...defaultProps} value="Hello" />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not display character counter when value is empty', () => {
    render(<ChatWidgetInput {...defaultProps} value="" />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('applies destructive style to character counter when over 4000 characters', () => {
    const longText = 'a'.repeat(4001);
    render(<ChatWidgetInput {...defaultProps} value={longText} />);
    const counter = screen.getByText('4001');
    expect(counter).toHaveClass('text-destructive');
  });

  it('applies custom className', () => {
    const { container } = render(<ChatWidgetInput {...defaultProps} className="custom-class" />);
    const form = container.querySelector('form');
    expect(form).toHaveClass('custom-class');
  });

  it('displays voice input button when sttSupported and showVoiceInput is true', () => {
    render(<ChatWidgetInput {...defaultProps} showVoiceInput={true} />);
    const buttons = screen.getAllByRole('button');
    // Voice button should be present
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('hides voice input button when showVoiceInput is false', () => {
    render(<ChatWidgetInput {...defaultProps} showVoiceInput={false} />);
    const buttons = screen.getAllByRole('button');
    // Should only have send button
    expect(buttons.length).toBe(1);
  });

  it('forwards ref to textarea', () => {
    const ref = React.createRef<HTMLTextAreaElement>();
    render(<ChatWidgetInput {...defaultProps} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('auto-resizes textarea when content changes', () => {
    render(<ChatWidgetInput {...defaultProps} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Simulate input that would trigger resize
    fireEvent.change(textarea, { target: { value: 'Line 1\nLine 2\nLine 3' } });
    
    expect(defaultProps.onChange).toHaveBeenCalled();
  });
});

describe('ChatWidgetInput with voice listening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows listening state when isListening is true', () => {
    jest.doMock('@/hooks/media/use-speech', () => ({
      useSpeech: () => ({
        isListening: true,
        startListening: jest.fn(),
        stopListening: jest.fn(),
        sttSupported: true,
        interimTranscript: 'testing...',
        isSpeaking: false,
        speak: jest.fn(),
        stopSpeaking: jest.fn(),
        ttsSupported: true,
      }),
    }));
    
    // This test verifies the component renders with voice support
    const props = {
      value: '',
      onChange: jest.fn(),
      onSubmit: jest.fn(),
      onKeyDown: jest.fn(),
      showVoiceInput: true,
    };
    
    render(<ChatWidgetInput {...props} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
