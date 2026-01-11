/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CopyButton, InlineCopyButton } from './copy-button';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock the useCopy hook
const mockCopy = jest.fn().mockResolvedValue({ success: true });
jest.mock('@/hooks/ui', () => ({
  useCopy: () => ({
    copy: mockCopy,
    isCopying: false,
  }),
  addToCopyHistory: jest.fn(),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => {
  const MockButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
    function MockButton({ children, onClick, disabled, ...props }, ref) {
      return <button ref={ref} onClick={onClick} disabled={disabled} {...props}>{children}</button>;
    }
  );
  return { Button: MockButton };
});

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip">{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('CopyButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    render(<CopyButton content="test content" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls copy function when clicked', async () => {
    render(<CopyButton content="test content" />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(mockCopy).toHaveBeenCalledWith('test content', expect.any(Object));
    });
  });

  it('supports function content', async () => {
    const contentFn = jest.fn().mockReturnValue('dynamic content');
    render(<CopyButton content={contentFn} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(contentFn).toHaveBeenCalled();
      expect(mockCopy).toHaveBeenCalledWith('dynamic content', expect.any(Object));
    });
  });

  it('can be disabled', () => {
    render(<CopyButton content="test" disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders icon only when iconOnly is true', () => {
    render(<CopyButton content="test" iconOnly />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('calls onCopySuccess callback on successful copy', async () => {
    const onCopySuccess = jest.fn();
    render(<CopyButton content="test" onCopySuccess={onCopySuccess} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(onCopySuccess).toHaveBeenCalled();
    });
  });
});

describe('InlineCopyButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<InlineCopyButton content="test content" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('copies content when clicked', async () => {
    render(<InlineCopyButton content="inline content" />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(mockCopy).toHaveBeenCalledWith('inline content');
    });
  });

  it('applies custom className', () => {
    render(<InlineCopyButton content="test" className="custom-class" />);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });
});
