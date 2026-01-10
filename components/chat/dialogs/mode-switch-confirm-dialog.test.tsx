import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ModeSwitchConfirmDialog } from './mode-switch-confirm-dialog';
import type { ModeSwitchConfirmDialogProps } from './mode-switch-confirm-dialog';

const messages = {
  modeSwitch: {
    title: 'Switch Chat Mode',
    description: 'Switching modes will start a new conversation.',
    warningTitle: 'Current conversation will end',
    warningMessage: 'You have {count} messages in this conversation.',
    carryContextLabel: 'Summarize and carry context',
    carryContextDescription: 'Generate a summary of the current chat.',
    generatingSummary: 'Generating summary...',
    summaryReady: 'Summary ready to carry over',
    switchMode: 'Switch Mode',
    switchWithContext: 'Switch with Context',
  },
  chat: {
    modeChat: 'Chat',
    modeAgent: 'Agent',
    modeResearch: 'Research',
    modeLearning: 'Learning',
  },
  common: {
    cancel: 'Cancel',
  },
};

const renderWithIntl = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('ModeSwitchConfirmDialog', () => {
  const defaultProps: ModeSwitchConfirmDialogProps = {
    open: true,
    onOpenChange: jest.fn(),
    currentMode: 'chat',
    targetMode: 'agent',
    messageCount: 5,
    sessionTitle: 'Test Session',
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dialog when open', () => {
    renderWithIntl(<ModeSwitchConfirmDialog {...defaultProps} />);
    
    expect(screen.getByText('Switch Chat Mode')).toBeInTheDocument();
    expect(screen.getByText('Current conversation will end')).toBeInTheDocument();
  });

  it('displays current and target mode names', () => {
    renderWithIntl(<ModeSwitchConfirmDialog {...defaultProps} />);
    
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
  });

  it('displays the message count in warning', () => {
    renderWithIntl(<ModeSwitchConfirmDialog {...defaultProps} />);
    
    expect(screen.getByText(/5 messages/)).toBeInTheDocument();
  });

  it('displays session title as badge', () => {
    renderWithIntl(<ModeSwitchConfirmDialog {...defaultProps} />);
    
    expect(screen.getByText('Test Session')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = jest.fn();
    renderWithIntl(<ModeSwitchConfirmDialog {...defaultProps} onCancel={onCancel} />);
    
    fireEvent.click(screen.getByText('Cancel'));
    
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onConfirm with carryContext: false when switching without context', () => {
    const onConfirm = jest.fn();
    renderWithIntl(<ModeSwitchConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    
    fireEvent.click(screen.getByText('Switch Mode'));
    
    expect(onConfirm).toHaveBeenCalledWith({ carryContext: false, summary: undefined });
  });

  it('shows checkbox for carry context option', () => {
    renderWithIntl(<ModeSwitchConfirmDialog {...defaultProps} />);
    
    expect(screen.getByText('Summarize and carry context')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('generates summary when carry context is checked', async () => {
    const mockGenerateSummary = jest.fn().mockResolvedValue('Test summary content');
    renderWithIntl(
      <ModeSwitchConfirmDialog 
        {...defaultProps} 
        onGenerateSummary={mockGenerateSummary}
      />
    );
    
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    await waitFor(() => {
      expect(mockGenerateSummary).toHaveBeenCalled();
    });
  });

  it('shows summary ready message after generation', async () => {
    const mockGenerateSummary = jest.fn().mockResolvedValue('Test summary content');
    renderWithIntl(
      <ModeSwitchConfirmDialog 
        {...defaultProps} 
        onGenerateSummary={mockGenerateSummary}
      />
    );
    
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    await waitFor(() => {
      expect(screen.getByText('Summary ready to carry over')).toBeInTheDocument();
    });
  });

  it('calls onConfirm with summary when switching with context', async () => {
    const onConfirm = jest.fn();
    const mockGenerateSummary = jest.fn().mockResolvedValue('Test summary content');
    renderWithIntl(
      <ModeSwitchConfirmDialog 
        {...defaultProps} 
        onConfirm={onConfirm}
        onGenerateSummary={mockGenerateSummary}
      />
    );
    
    // Check the carry context checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    // Wait for summary generation
    await waitFor(() => {
      expect(screen.getByText('Summary ready to carry over')).toBeInTheDocument();
    });
    
    // Click the switch with context button
    fireEvent.click(screen.getByText('Switch with Context'));
    
    expect(onConfirm).toHaveBeenCalledWith({
      carryContext: true,
      summary: 'Test summary content',
    });
  });

  it('disables buttons while generating summary', async () => {
    const mockGenerateSummary = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('Summary'), 100))
    );
    renderWithIntl(
      <ModeSwitchConfirmDialog 
        {...defaultProps} 
        onGenerateSummary={mockGenerateSummary}
      />
    );
    
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    // Buttons should be disabled during generation
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeDisabled();
    });
  });

  it('handles different mode combinations', () => {
    const modes = ['chat', 'agent', 'research', 'learning'] as const;
    
    for (const currentMode of modes) {
      for (const targetMode of modes) {
        if (currentMode !== targetMode) {
          const { unmount } = renderWithIntl(
            <ModeSwitchConfirmDialog 
              {...defaultProps} 
              currentMode={currentMode}
              targetMode={targetMode}
            />
          );
          
          // Dialog should render without errors
          expect(screen.getByText('Switch Chat Mode')).toBeInTheDocument();
          unmount();
        }
      }
    }
  });

  it('resets state when cancel button is clicked', () => {
    const onCancel = jest.fn();
    renderWithIntl(
      <ModeSwitchConfirmDialog {...defaultProps} onCancel={onCancel} />
    );
    
    // Click cancel button
    fireEvent.click(screen.getByText('Cancel'));
    
    // onCancel should be called
    expect(onCancel).toHaveBeenCalled();
  });

  it('triggers summary generation when checkbox is clicked', async () => {
    const mockGenerateSummary = jest.fn().mockResolvedValue('Summary content');
    renderWithIntl(
      <ModeSwitchConfirmDialog 
        {...defaultProps} 
        onGenerateSummary={mockGenerateSummary}
      />
    );
    
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    // Summary generation should be triggered
    await waitFor(() => {
      expect(mockGenerateSummary).toHaveBeenCalled();
    });
  });

  it('handles summary generation failure gracefully', async () => {
    const mockGenerateSummary = jest.fn().mockRejectedValue(new Error('Failed'));
    renderWithIntl(
      <ModeSwitchConfirmDialog 
        {...defaultProps} 
        onGenerateSummary={mockGenerateSummary}
      />
    );
    
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    // Checkbox should be unchecked after failure
    await waitFor(() => {
      expect(checkbox).not.toBeChecked();
    });
  });
});
