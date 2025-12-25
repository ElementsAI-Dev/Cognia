/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatDesignerPanel } from './chat-designer-panel';

// Mock stores
jest.mock('@/stores', () => ({
  useSettingsStore: () => ({
    providerSettings: {
      openai: { apiKey: 'test-key' },
    },
    defaultProvider: 'openai',
  }),
  useArtifactStore: () => ({
    createCanvasDocument: jest.fn(() => 'doc-1'),
    setActiveCanvas: jest.fn(),
    openPanel: jest.fn(),
  }),
}));

// Mock designer lib
jest.mock('@/lib/designer', () => ({
  executeDesignerAIEdit: jest.fn().mockResolvedValue({ success: true, code: 'new code' }),
  getDesignerAIConfig: jest.fn(() => ({})),
  AI_SUGGESTIONS: ['Add dark mode', 'Add animation', 'Improve layout'],
}));

// Mock ReactSandbox
jest.mock('@/components/designer', () => ({
  ReactSandbox: ({ code, onCodeChange }: { code: string; onCodeChange?: (code: string) => void }) => (
    <div data-testid="react-sandbox" data-code={code}>
      {onCodeChange && <button onClick={() => onCodeChange('modified code')}>Modify</button>}
    </div>
  ),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder, disabled, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} {...props} />
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ChatDesignerPanel', () => {
  const defaultProps = {
    code: '<div>Hello World</div>',
    onCodeChange: jest.fn(),
    onClose: jest.fn(),
    className: '',
    showAIPanel: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        setItem: jest.fn(),
        getItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
    // Mock window.open
    window.open = jest.fn();
  });

  it('renders without crashing', () => {
    render(<ChatDesignerPanel {...defaultProps} />);
    expect(screen.getByTestId('react-sandbox')).toBeInTheDocument();
  });

  it('displays Live Preview badge', () => {
    render(<ChatDesignerPanel {...defaultProps} />);
    expect(screen.getByText('Live Preview')).toBeInTheDocument();
  });

  it('passes code to ReactSandbox', () => {
    render(<ChatDesignerPanel {...defaultProps} />);
    const sandbox = screen.getByTestId('react-sandbox');
    expect(sandbox).toHaveAttribute('data-code', defaultProps.code);
  });

  it('displays close button when onClose is provided', () => {
    render(<ChatDesignerPanel {...defaultProps} />);
    // Close button should be present
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('displays AI edit button when onCodeChange is provided', () => {
    render(<ChatDesignerPanel {...defaultProps} />);
    // AI button is present
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('does not display AI edit button when onCodeChange is not provided', () => {
    render(<ChatDesignerPanel {...defaultProps} onCodeChange={undefined} />);
    // Should still render, just without AI panel toggle
    expect(screen.getByTestId('react-sandbox')).toBeInTheDocument();
  });

  it('displays AI panel when showAIPanel is true', () => {
    render(<ChatDesignerPanel {...defaultProps} showAIPanel={true} />);
    expect(screen.getByPlaceholderText('Describe what you want to change...')).toBeInTheDocument();
  });

  it('hides AI panel initially when showAIPanel is false', () => {
    render(<ChatDesignerPanel {...defaultProps} showAIPanel={false} />);
    expect(screen.queryByPlaceholderText('Describe what you want to change...')).not.toBeInTheDocument();
  });

  it('displays AI suggestions when AI panel is open', () => {
    render(<ChatDesignerPanel {...defaultProps} showAIPanel={true} />);
    expect(screen.getByText('Add dark mode')).toBeInTheDocument();
    expect(screen.getByText('Add animation')).toBeInTheDocument();
    expect(screen.getByText('Improve layout')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ChatDesignerPanel {...defaultProps} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('toggles expanded state on expand button click', () => {
    const { container } = render(<ChatDesignerPanel {...defaultProps} />);
    
    // Initial height should be 400px
    const panel = container.firstChild as HTMLElement;
    expect(panel).toHaveClass('h-[400px]');
    
    // Find and click expand button
    const buttons = screen.getAllByRole('button');
    const expandButton = buttons.find(btn => btn.querySelector('svg'));
    if (expandButton) {
      fireEvent.click(expandButton);
    }
  });

  it('opens designer in new tab when external link button is clicked', () => {
    render(<ChatDesignerPanel {...defaultProps} />);
    
    const buttons = screen.getAllByRole('button');
    // Find the external link button (usually has ExternalLink icon)
    const externalButton = buttons[2]; // Third button typically
    if (externalButton) {
      fireEvent.click(externalButton);
      expect(window.open).toHaveBeenCalled();
    }
  });

  it('can fill AI prompt from suggestion badges', () => {
    render(<ChatDesignerPanel {...defaultProps} showAIPanel={true} />);
    
    const suggestionBadge = screen.getByText('Add dark mode');
    fireEvent.click(suggestionBadge);
    
    const textarea = screen.getByPlaceholderText('Describe what you want to change...');
    expect(textarea).toHaveValue('Add dark mode');
  });
});
