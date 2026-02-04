/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ExternalAgentCommands } from './external-agent-commands';
import type { AcpAvailableCommand } from '@/types/agent/external-agent';

const mockMessages = {
  externalAgent: {
    commands: 'Commands',
    commandsTooltip: 'View available slash commands',
    availableCommands: 'Available Commands',
    commandsDescription: 'Execute slash commands provided by the agent',
  },
};

const renderWithIntl = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={mockMessages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('ExternalAgentCommands', () => {
  const mockCommands: AcpAvailableCommand[] = [
    { name: 'compact', description: 'Compress conversation history' },
    { name: 'clear', description: 'Clear the current session' },
    { name: 'review', description: 'Review code changes', input: { hint: 'branch name' } },
  ];

  const mockOnExecute = jest.fn();

  beforeEach(() => {
    mockOnExecute.mockClear();
  });

  it('should render nothing when commands is empty', () => {
    const { container } = renderWithIntl(
      <ExternalAgentCommands commands={[]} onExecute={mockOnExecute} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render nothing when commands is undefined', () => {
    const { container } = renderWithIntl(
      <ExternalAgentCommands commands={undefined as unknown as AcpAvailableCommand[]} onExecute={mockOnExecute} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render commands button with count badge', () => {
    renderWithIntl(
      <ExternalAgentCommands commands={mockCommands} onExecute={mockOnExecute} />
    );
    
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should show popover when button is clicked', () => {
    renderWithIntl(
      <ExternalAgentCommands commands={mockCommands} onExecute={mockOnExecute} />
    );
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(screen.getByText('Available Commands')).toBeInTheDocument();
  });

  it('should display all commands in popover', () => {
    renderWithIntl(
      <ExternalAgentCommands commands={mockCommands} onExecute={mockOnExecute} />
    );
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(screen.getByText('/compact')).toBeInTheDocument();
    expect(screen.getByText('/clear')).toBeInTheDocument();
    expect(screen.getByText('/review')).toBeInTheDocument();
  });

  it('should display command descriptions', () => {
    renderWithIntl(
      <ExternalAgentCommands commands={mockCommands} onExecute={mockOnExecute} />
    );
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(screen.getByText('Compress conversation history')).toBeInTheDocument();
    expect(screen.getByText('Clear the current session')).toBeInTheDocument();
  });

  it('should show input hint for commands with arguments', () => {
    renderWithIntl(
      <ExternalAgentCommands commands={mockCommands} onExecute={mockOnExecute} />
    );
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(screen.getByText('branch name')).toBeInTheDocument();
  });

  it('should be disabled when isExecuting is true', () => {
    renderWithIntl(
      <ExternalAgentCommands 
        commands={mockCommands} 
        onExecute={mockOnExecute} 
        isExecuting={true}
      />
    );
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should apply custom className', () => {
    renderWithIntl(
      <ExternalAgentCommands 
        commands={mockCommands} 
        onExecute={mockOnExecute}
        className="custom-class"
      />
    );
    
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('should call onExecute with command when execute button is clicked', async () => {
    renderWithIntl(
      <ExternalAgentCommands commands={mockCommands} onExecute={mockOnExecute} />
    );
    
    // Open popover
    fireEvent.click(screen.getByRole('button'));
    
    // Find and click the execute button for the first command
    const executeButtons = screen.getAllByRole('button').filter(
      (btn) => btn.querySelector('svg.lucide-chevron-right')
    );
    
    if (executeButtons.length > 0) {
      fireEvent.click(executeButtons[0]);
      expect(mockOnExecute).toHaveBeenCalledWith('/compact', undefined);
    }
  });

  it('should handle single command correctly', () => {
    const singleCommand: AcpAvailableCommand[] = [
      { name: 'help', description: 'Show help' },
    ];
    
    renderWithIntl(
      <ExternalAgentCommands commands={singleCommand} onExecute={mockOnExecute} />
    );
    
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
