/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolApprovalDialog, ToolApprovalRequest } from './tool-approval-dialog';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      tools: {
        approvalRequired: 'Tool Approval Required',
        approvalDescription:
          'The agent wants to use the following tool. Please review and approve or deny.',
        parameters: 'Parameters',
        alwaysAllowTool: 'Always allow this tool',
        deny: 'Deny',
        approve: 'Approve',
      },
      common: {},
    };
    return translations[namespace]?.[key] || key;
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    variant,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button onClick={onClick} data-variant={variant}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({
    id,
    checked,
    onCheckedChange,
  }: {
    id?: string;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      id={id}
      data-testid="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="dialog" onClick={() => onOpenChange?.(false)}>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
  DialogFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="dialog-footer" className={className}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 data-testid="dialog-title" className={className}>
      {children}
    </h2>
  ),
}));

jest.mock('@/components/ai-elements/code-block', () => ({
  CodeBlock: ({ code, language }: { code: string; language?: string }) => (
    <pre data-testid="code-block" data-language={language}>
      {code}
    </pre>
  ),
}));

describe('ToolApprovalDialog', () => {
  const mockRequest: ToolApprovalRequest = {
    id: 'request-1',
    toolName: 'web_search',
    toolDescription: 'Search the web for information',
    args: { query: 'test query' },
    riskLevel: 'low',
  };

  const defaultProps = {
    request: mockRequest,
    open: true,
    onOpenChange: jest.fn(),
    onApprove: jest.fn(),
    onDeny: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when request is null', () => {
    const { container } = render(<ToolApprovalDialog {...defaultProps} request={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when not open', () => {
    const { container } = render(<ToolApprovalDialog {...defaultProps} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders dialog when open with request', () => {
    render(<ToolApprovalDialog {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('displays the dialog title', () => {
    render(<ToolApprovalDialog {...defaultProps} />);
    expect(screen.getByText('Tool Approval Required')).toBeInTheDocument();
  });

  it('displays the dialog description', () => {
    render(<ToolApprovalDialog {...defaultProps} />);
    expect(
      screen.getByText(
        'The agent wants to use the following tool. Please review and approve or deny.'
      )
    ).toBeInTheDocument();
  });

  it('displays the tool name', () => {
    render(<ToolApprovalDialog {...defaultProps} />);
    expect(screen.getByText('web_search')).toBeInTheDocument();
  });

  it('displays the tool description', () => {
    render(<ToolApprovalDialog {...defaultProps} />);
    expect(screen.getByText('Search the web for information')).toBeInTheDocument();
  });

  it('displays the parameters section', () => {
    render(<ToolApprovalDialog {...defaultProps} />);
    expect(screen.getByText('Parameters')).toBeInTheDocument();
    expect(screen.getByTestId('code-block')).toBeInTheDocument();
  });

  it('displays parameters as JSON', () => {
    render(<ToolApprovalDialog {...defaultProps} />);
    const codeBlock = screen.getByTestId('code-block');
    // Check that the JSON content contains the key-value pair (formatting may vary)
    expect(codeBlock).toHaveTextContent('"query"');
    expect(codeBlock).toHaveTextContent('"test query"');
    expect(codeBlock).toHaveAttribute('data-language', 'json');
  });

  describe('Risk levels', () => {
    it('displays low risk badge correctly', () => {
      render(<ToolApprovalDialog {...defaultProps} />);
      expect(screen.getByText('Low Risk')).toBeInTheDocument();
    });

    it('displays medium risk badge correctly', () => {
      const mediumRiskRequest = { ...mockRequest, riskLevel: 'medium' as const };
      render(<ToolApprovalDialog {...defaultProps} request={mediumRiskRequest} />);
      expect(screen.getByText('Medium Risk')).toBeInTheDocument();
    });

    it('displays high risk badge correctly', () => {
      const highRiskRequest = { ...mockRequest, riskLevel: 'high' as const };
      render(<ToolApprovalDialog {...defaultProps} request={highRiskRequest} />);
      expect(screen.getByText('High Risk')).toBeInTheDocument();
    });
  });

  describe('Always Allow checkbox', () => {
    it('shows checkbox for low risk tools', () => {
      render(<ToolApprovalDialog {...defaultProps} />);
      expect(screen.getByTestId('checkbox')).toBeInTheDocument();
      expect(screen.getByText('Always allow this tool')).toBeInTheDocument();
    });

    it('does not show checkbox for medium risk tools', () => {
      const mediumRiskRequest = { ...mockRequest, riskLevel: 'medium' as const };
      render(<ToolApprovalDialog {...defaultProps} request={mediumRiskRequest} />);
      expect(screen.queryByTestId('checkbox')).not.toBeInTheDocument();
    });

    it('does not show checkbox for high risk tools', () => {
      const highRiskRequest = { ...mockRequest, riskLevel: 'high' as const };
      render(<ToolApprovalDialog {...defaultProps} request={highRiskRequest} />);
      expect(screen.queryByTestId('checkbox')).not.toBeInTheDocument();
    });
  });

  describe('Action buttons', () => {
    it('renders Deny button', () => {
      render(<ToolApprovalDialog {...defaultProps} />);
      expect(screen.getByText('Deny')).toBeInTheDocument();
    });

    it('renders Approve button', () => {
      render(<ToolApprovalDialog {...defaultProps} />);
      expect(screen.getByText('Approve')).toBeInTheDocument();
    });

    it('calls onDeny when Deny button is clicked', () => {
      const onDeny = jest.fn();
      render(<ToolApprovalDialog {...defaultProps} onDeny={onDeny} />);

      fireEvent.click(screen.getByText('Deny'));

      expect(onDeny).toHaveBeenCalledWith('request-1');
    });

    it('calls onApprove when Approve button is clicked', () => {
      const onApprove = jest.fn();
      render(<ToolApprovalDialog {...defaultProps} onApprove={onApprove} />);

      fireEvent.click(screen.getByText('Approve'));

      expect(onApprove).toHaveBeenCalledWith('request-1', false);
    });

    it('calls onApprove with alwaysAllow=true when checkbox is checked', async () => {
      const onApprove = jest.fn();
      render(<ToolApprovalDialog {...defaultProps} onApprove={onApprove} />);

      const checkbox = screen.getByTestId('checkbox');
      fireEvent.click(checkbox);

      fireEvent.click(screen.getByText('Approve'));

      expect(onApprove).toHaveBeenCalledWith('request-1', true);
    });
  });

  describe('State reset', () => {
    it('resets alwaysAllow state after approving', () => {
      const onApprove = jest.fn();
      const { rerender } = render(<ToolApprovalDialog {...defaultProps} onApprove={onApprove} />);

      const checkbox = screen.getByTestId('checkbox');
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      fireEvent.click(screen.getByText('Approve'));

      // Rerender with the same props
      rerender(<ToolApprovalDialog {...defaultProps} onApprove={onApprove} />);

      // Checkbox should be unchecked after approve
      expect(screen.getByTestId('checkbox')).not.toBeChecked();
    });

    it('resets alwaysAllow state after denying', () => {
      const onDeny = jest.fn();
      const { rerender } = render(<ToolApprovalDialog {...defaultProps} onDeny={onDeny} />);

      const checkbox = screen.getByTestId('checkbox');
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      fireEvent.click(screen.getByText('Deny'));

      // Rerender with the same props
      rerender(<ToolApprovalDialog {...defaultProps} onDeny={onDeny} />);

      // Checkbox should be unchecked after deny
      expect(screen.getByTestId('checkbox')).not.toBeChecked();
    });
  });

  describe('Complex args', () => {
    it('handles complex nested args', () => {
      const complexRequest = {
        ...mockRequest,
        args: {
          query: 'test',
          options: {
            limit: 10,
            filters: ['active', 'recent'],
          },
        },
      };
      render(<ToolApprovalDialog {...defaultProps} request={complexRequest} />);

      const codeBlock = screen.getByTestId('code-block');
      expect(codeBlock).toHaveTextContent('"query": "test"');
      expect(codeBlock).toHaveTextContent('"limit": 10');
    });

    it('handles empty args', () => {
      const emptyArgsRequest = { ...mockRequest, args: {} };
      render(<ToolApprovalDialog {...defaultProps} request={emptyArgsRequest} />);

      const codeBlock = screen.getByTestId('code-block');
      expect(codeBlock).toHaveTextContent('{}');
    });
  });

  describe('ACP options', () => {
    it('renders ACP option buttons with names', () => {
      const requestWithOptions: ToolApprovalRequest = {
        ...mockRequest,
        acpOptions: [
          {
            optionId: 'allow_once',
            name: 'Allow once',
            kind: 'allow_once',
            isDefault: true,
            description: 'Allow this tool for this call',
          },
          {
            optionId: 'reject_once',
            name: 'Reject once',
            kind: 'reject_once',
          },
        ],
      };

      render(<ToolApprovalDialog {...defaultProps} request={requestWithOptions} />);

      expect(screen.getByText('Allow once')).toBeInTheDocument();
      expect(screen.getByText('Reject once')).toBeInTheDocument();
    });

    it('calls onSelectOption with optionId when ACP option is selected', () => {
      const onSelectOption = jest.fn();
      const requestWithOptions: ToolApprovalRequest = {
        ...mockRequest,
        acpOptions: [
          {
            optionId: 'allow_once',
            name: 'Allow once',
            kind: 'allow_once',
            isDefault: true,
          },
        ],
      };

      render(
        <ToolApprovalDialog
          {...defaultProps}
          request={requestWithOptions}
          onSelectOption={onSelectOption}
        />
      );

      fireEvent.click(screen.getByText('Allow once'));

      expect(onSelectOption).toHaveBeenCalledWith('request-1', 'allow_once');
    });
  });
});
