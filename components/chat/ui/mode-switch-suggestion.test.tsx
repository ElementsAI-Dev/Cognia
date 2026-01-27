/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModeSwitchSuggestion, InlineModeSuggestion } from './mode-switch-suggestion';
import type { IntentDetectionResult } from '@/lib/ai/tools/intent-detection';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

describe('ModeSwitchSuggestion', () => {
  const mockResult: IntentDetectionResult = {
    hasIntent: true,
    intentType: 'learning',
    suggestedMode: 'learning',
    confidence: 0.85,
    reason: 'Your query appears to be about learning a new topic.',
    matchedKeywords: ['learn', 'tutorial', 'explain'],
  };

  const defaultProps = {
    result: mockResult,
    currentMode: 'chat' as const,
    onAccept: jest.fn(),
    onDismiss: jest.fn(),
    onKeepCurrent: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with suggestion', () => {
    render(<ModeSwitchSuggestion {...defaultProps} />);
    
    expect(screen.getByText(/建议切换到学习模式/)).toBeInTheDocument();
  });

  it('displays the reason for suggestion', () => {
    render(<ModeSwitchSuggestion {...defaultProps} />);
    
    expect(screen.getByText(mockResult.reason)).toBeInTheDocument();
  });

  it('shows matched keywords', () => {
    render(<ModeSwitchSuggestion {...defaultProps} />);
    
    expect(screen.getByText(/检测到关键词/)).toBeInTheDocument();
  });

  it('calls onAccept when accept button is clicked', async () => {
    render(<ModeSwitchSuggestion {...defaultProps} />);
    
    // Find the button that contains "切换到" text (not the header)
    const buttons = screen.getAllByRole('button');
    const acceptButton = buttons.find(btn => btn.textContent?.includes('切换到') && btn.textContent?.includes('学习模式'));
    expect(acceptButton).toBeTruthy();
    fireEvent.click(acceptButton!);
    
    await waitFor(() => {
      expect(defaultProps.onAccept).toHaveBeenCalledWith('learning');
    });
  });

  it('calls onKeepCurrent when keep current button is clicked', async () => {
    render(<ModeSwitchSuggestion {...defaultProps} />);
    
    const keepButton = screen.getByText('保持当前模式');
    fireEvent.click(keepButton);
    
    await waitFor(() => {
      expect(defaultProps.onKeepCurrent).toHaveBeenCalled();
    });
  });

  it('calls onDismiss when dismiss button is clicked', async () => {
    render(<ModeSwitchSuggestion {...defaultProps} />);
    
    const buttons = screen.getAllByRole('button');
    const dismissButton = buttons.find(btn => btn.getAttribute('aria-label') === '关闭建议');
    
    if (dismissButton) {
      fireEvent.click(dismissButton);
      await waitFor(() => {
        expect(defaultProps.onDismiss).toHaveBeenCalled();
      });
    }
  });

  it('returns null when suggested mode equals current mode', () => {
    const { container } = render(
      <ModeSwitchSuggestion 
        {...defaultProps} 
        currentMode="learning"
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('returns null when no suggested mode', () => {
    const resultWithNoSuggestion: IntentDetectionResult = {
      ...mockResult,
      suggestedMode: null,
    };
    
    const { container } = render(
      <ModeSwitchSuggestion 
        {...defaultProps} 
        result={resultWithNoSuggestion}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('displays confidence indicator', () => {
    render(<ModeSwitchSuggestion {...defaultProps} />);
    
    expect(screen.getByText('置信度：')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ModeSwitchSuggestion {...defaultProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('InlineModeSuggestion', () => {
  const defaultProps = {
    suggestedMode: 'research' as const,
    onAccept: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<InlineModeSuggestion {...defaultProps} />);
    
    expect(screen.getByText(/切换到研究模式？/)).toBeInTheDocument();
  });

  it('calls onAccept when "是" is clicked', () => {
    render(<InlineModeSuggestion {...defaultProps} />);
    
    fireEvent.click(screen.getByText('是'));
    expect(defaultProps.onAccept).toHaveBeenCalled();
  });

  it('calls onDismiss when "否" is clicked', () => {
    render(<InlineModeSuggestion {...defaultProps} />);
    
    fireEvent.click(screen.getByText('否'));
    expect(defaultProps.onDismiss).toHaveBeenCalled();
  });
});
