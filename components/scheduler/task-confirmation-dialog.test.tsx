/**
 * TaskConfirmationDialog Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { TaskConfirmationDialog, AdminElevationDialog } from './task-confirmation-dialog';
import type { TaskConfirmationRequest } from '@/types/scheduler';

describe('TaskConfirmationDialog', () => {
  const mockConfirmation: TaskConfirmationRequest = {
    task_id: 'task-1',
    operation: 'create',
    risk_level: 'medium',
    requires_admin: false,
    warnings: ['This task will run with elevated privileges'],
    details: {
      task_name: 'Test Task',
      trigger_summary: 'Every hour',
      action_summary: 'Run command: echo hello',
    },
  };

  const defaultProps = {
    confirmation: mockConfirmation,
    open: true,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
    loading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render dialog when open', () => {
      render(<TaskConfirmationDialog {...defaultProps} />);

      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    it('should not render when confirmation is null', () => {
      render(<TaskConfirmationDialog {...defaultProps} confirmation={null} />);

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('should display risk level badge', () => {
      render(<TaskConfirmationDialog {...defaultProps} />);

      expect(screen.getByText(/medium/i)).toBeInTheDocument();
    });

    it('should display trigger summary', () => {
      render(<TaskConfirmationDialog {...defaultProps} />);

      expect(screen.getByText('Every hour')).toBeInTheDocument();
    });

    it('should display action summary', () => {
      render(<TaskConfirmationDialog {...defaultProps} />);

      expect(screen.getByText(/Run command: echo hello/)).toBeInTheDocument();
    });

    it('should display warnings', () => {
      render(<TaskConfirmationDialog {...defaultProps} />);

      expect(
        screen.getByText('This task will run with elevated privileges')
      ).toBeInTheDocument();
    });

    it('should show admin required indicator when requires_admin is true', () => {
      const adminConfirmation = {
        ...mockConfirmation,
        requires_admin: true,
      };

      render(
        <TaskConfirmationDialog {...defaultProps} confirmation={adminConfirmation} />
      );

      expect(screen.getByText(/Administrator/i)).toBeInTheDocument();
    });
  });

  describe('risk levels', () => {
    it('should render low risk level correctly', () => {
      const lowRiskConfirmation = {
        ...mockConfirmation,
        risk_level: 'low' as const,
      };

      render(
        <TaskConfirmationDialog {...defaultProps} confirmation={lowRiskConfirmation} />
      );

      expect(screen.getByText(/low/i)).toBeInTheDocument();
    });

    it('should render high risk level correctly', () => {
      const highRiskConfirmation = {
        ...mockConfirmation,
        risk_level: 'high' as const,
      };

      render(
        <TaskConfirmationDialog {...defaultProps} confirmation={highRiskConfirmation} />
      );

      expect(screen.getByText(/high/i)).toBeInTheDocument();
    });

    it('should render critical risk level correctly', () => {
      const criticalConfirmation = {
        ...mockConfirmation,
        risk_level: 'critical' as const,
      };

      render(
        <TaskConfirmationDialog {...defaultProps} confirmation={criticalConfirmation} />
      );

      expect(screen.getByText(/critical/i)).toBeInTheDocument();
    });

    it('should not show checkbox for high risk operations', () => {
      const highRiskConfirmation = {
        ...mockConfirmation,
        risk_level: 'high' as const,
      };

      render(
        <TaskConfirmationDialog {...defaultProps} confirmation={highRiskConfirmation} />
      );

      // Only critical risk shows checkbox
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('should require checkbox confirmation for critical risk', () => {
      const criticalConfirmation = {
        ...mockConfirmation,
        risk_level: 'critical' as const,
      };

      render(
        <TaskConfirmationDialog {...defaultProps} confirmation={criticalConfirmation} />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('interactions', () => {
    it('should call onConfirm when confirm button clicked', () => {
      render(<TaskConfirmationDialog {...defaultProps} />);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      expect(defaultProps.onConfirm).toHaveBeenCalled();
    });

    it('should call onCancel when cancel button clicked', () => {
      render(<TaskConfirmationDialog {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it('should toggle checkbox for critical risk operations', () => {
      const criticalConfirmation = {
        ...mockConfirmation,
        risk_level: 'critical' as const,
      };

      render(
        <TaskConfirmationDialog {...defaultProps} confirmation={criticalConfirmation} />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      fireEvent.click(checkbox);

      expect(checkbox).toBeChecked();
    });

    it('should show loading state', () => {
      render(<TaskConfirmationDialog {...defaultProps} loading={true} />);

      // Buttons should exist
      expect(screen.getByRole('button', { name: /confirm|processing/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });
});

describe('AdminElevationDialog', () => {
  const defaultProps = {
    open: true,
    onRequestElevation: jest.fn(),
    onCancel: jest.fn(),
    loading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render dialog when open', () => {
      render(<AdminElevationDialog {...defaultProps} />);

      // Dialog should be rendered with admin-related text
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('should display elevation explanation', () => {
      render(<AdminElevationDialog {...defaultProps} />);

      // Should show some explanation about privileges
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onRequestElevation when elevate button clicked', () => {
      render(<AdminElevationDialog {...defaultProps} />);

      const elevateButton = screen.getByRole('button', { name: /elevation|request/i });
      fireEvent.click(elevateButton);

      expect(defaultProps.onRequestElevation).toHaveBeenCalled();
    });

    it('should call onCancel when cancel button clicked', () => {
      render(<AdminElevationDialog {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it('should disable buttons when loading', () => {
      render(<AdminElevationDialog {...defaultProps} loading={true} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });
});
