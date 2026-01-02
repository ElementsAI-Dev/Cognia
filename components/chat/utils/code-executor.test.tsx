/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CodeExecutor } from './code-executor';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

describe('CodeExecutor', () => {
  const defaultProps = {
    code: 'console.log("Hello World");',
    language: 'javascript',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<CodeExecutor {...defaultProps} />);
    expect(screen.getByText(defaultProps.code)).toBeInTheDocument();
  });

  it('displays the language badge', () => {
    render(<CodeExecutor {...defaultProps} />);
    expect(screen.getByText('javascript')).toBeInTheDocument();
  });

  it('displays code content', () => {
    const code = 'const x = 42;';
    render(<CodeExecutor code={code} language="javascript" />);
    expect(screen.getByText(code)).toBeInTheDocument();
  });

  it('shows run button for supported languages', () => {
    render(<CodeExecutor {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2); // Copy and Run buttons
  });

  it('shows "Run not supported" for unsupported languages', () => {
    render(<CodeExecutor code="print('hello')" language="python" />);
    expect(screen.getByText('Run not supported')).toBeInTheDocument();
  });

  it('supports javascript language', () => {
    render(<CodeExecutor code="console.log(1)" language="javascript" />);
    expect(screen.queryByText('Run not supported')).not.toBeInTheDocument();
  });

  it('supports js language alias', () => {
    render(<CodeExecutor code="console.log(1)" language="js" />);
    expect(screen.queryByText('Run not supported')).not.toBeInTheDocument();
  });

  it('supports typescript language', () => {
    render(<CodeExecutor code="console.log(1)" language="typescript" />);
    expect(screen.queryByText('Run not supported')).not.toBeInTheDocument();
  });

  it('supports ts language alias', () => {
    render(<CodeExecutor code="console.log(1)" language="ts" />);
    expect(screen.queryByText('Run not supported')).not.toBeInTheDocument();
  });

  it('copies code to clipboard when copy button is clicked', async () => {
    render(<CodeExecutor {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    const copyButton = buttons[0]; // First button is copy
    
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(defaultProps.code);
    });
  });

  it('disables run button when code is empty', () => {
    render(<CodeExecutor code="   " language="javascript" />);
    const buttons = screen.getAllByRole('button');
    const runButton = buttons.find(btn => btn.hasAttribute('disabled'));
    expect(runButton).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(
      <CodeExecutor {...defaultProps} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders multiline code correctly', () => {
    const multilineCode = `const a = 1;
const b = 2;
console.log(a + b);`;
    render(<CodeExecutor code={multilineCode} language="javascript" />);
    // Multiline text is in the code element
    expect(screen.getByText(/const a = 1/)).toBeInTheDocument();
    expect(screen.getByText(/const b = 2/)).toBeInTheDocument();
  });

  it('displays case-insensitive language badge', () => {
    render(<CodeExecutor code="test" language="JAVASCRIPT" />);
    expect(screen.getByText('JAVASCRIPT')).toBeInTheDocument();
  });
});
