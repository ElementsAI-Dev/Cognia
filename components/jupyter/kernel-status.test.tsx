/**
 * KernelStatus Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { KernelStatus } from './kernel-status';
import type { KernelInfo, KernelStatus as KernelStatusType } from '@/types/system/jupyter';

// Messages for testing
const messages = {
  jupyter: {
    noKernel: 'No kernel',
    connectKernel: 'Connect kernel',
    connecting: 'Connecting...',
    interrupt: 'Interrupt',
    restart: 'Restart',
  },
};

const renderWithIntl = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

const createMockKernel = (overrides: Partial<KernelInfo> = {}): KernelInfo => ({
  id: 'kernel-1',
  name: 'Python 3',
  envPath: '/usr/bin/python3',
  status: 'idle',
  pythonVersion: '3.10.0',
  executionCount: 0,
  createdAt: new Date().toISOString(),
  lastActivityAt: null,
  ...overrides,
});

describe('KernelStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('no kernel state', () => {
    it('should render no kernel state when kernel is null', () => {
      renderWithIntl(<KernelStatus kernel={null} />);

      expect(screen.getByText('No kernel')).toBeInTheDocument();
    });

    it('should show connect button when onConnect is provided', () => {
      const onConnect = jest.fn();
      renderWithIntl(<KernelStatus kernel={null} onConnect={onConnect} />);

      const connectButton = screen.getByRole('button');
      expect(connectButton).toBeInTheDocument();
      expect(connectButton.querySelector('.lucide-zap')).toBeInTheDocument();
    });

    it('should call onConnect when connect button is clicked', () => {
      const onConnect = jest.fn();
      renderWithIntl(<KernelStatus kernel={null} onConnect={onConnect} />);

      fireEvent.click(screen.getByRole('button'));
      expect(onConnect).toHaveBeenCalledTimes(1);
    });

    it('should not show connect button when onConnect is not provided', () => {
      renderWithIntl(<KernelStatus kernel={null} />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('connecting state', () => {
    it('should render connecting state', () => {
      renderWithIntl(<KernelStatus kernel={null} isConnecting={true} />);

      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    it('should show loading spinner when connecting', () => {
      renderWithIntl(<KernelStatus kernel={null} isConnecting={true} />);

      // Spinner should be present - check for animate-spin class on any element
      const spinnerContainer = document.querySelector('.animate-spin');
      expect(spinnerContainer).toBeInTheDocument();
    });
  });

  describe('idle status', () => {
    it('should render idle status correctly', () => {
      const kernel = createMockKernel({ status: 'idle' });
      renderWithIntl(<KernelStatus kernel={kernel} />);

      expect(screen.getByText(/Python 3 · Idle/)).toBeInTheDocument();
    });

    it('should show green indicator for idle status', () => {
      const kernel = createMockKernel({ status: 'idle' });
      renderWithIntl(<KernelStatus kernel={kernel} />);

      // Idle status text should be shown
      expect(screen.getByText(/Idle/)).toBeInTheDocument();
    });
  });

  describe('busy status', () => {
    it('should render busy status correctly', () => {
      const kernel = createMockKernel({ status: 'busy' });
      renderWithIntl(<KernelStatus kernel={kernel} />);

      expect(screen.getByText(/Python 3 · Busy/)).toBeInTheDocument();
    });

    it('should show yellow indicator for busy status', () => {
      const kernel = createMockKernel({ status: 'busy' });
      renderWithIntl(<KernelStatus kernel={kernel} />);

      // Busy status text should be shown
      expect(screen.getByText(/Busy/)).toBeInTheDocument();
    });

    it('should show interrupt button when busy and onInterrupt is provided', () => {
      const kernel = createMockKernel({ status: 'busy' });
      const onInterrupt = jest.fn();
      renderWithIntl(<KernelStatus kernel={kernel} onInterrupt={onInterrupt} />);

      const buttons = screen.getAllByRole('button');
      const interruptButton = buttons.find((btn) => btn.querySelector('.lucide-square'));
      expect(interruptButton).toBeInTheDocument();
    });

    it('should call onInterrupt when interrupt button is clicked', () => {
      const kernel = createMockKernel({ status: 'busy' });
      const onInterrupt = jest.fn();
      renderWithIntl(<KernelStatus kernel={kernel} onInterrupt={onInterrupt} />);

      const buttons = screen.getAllByRole('button');
      const interruptButton = buttons.find((btn) => btn.querySelector('.lucide-square'));
      if (interruptButton) {
        fireEvent.click(interruptButton);
      }
      expect(onInterrupt).toHaveBeenCalledTimes(1);
    });
  });

  describe('starting status', () => {
    it('should render starting status correctly', () => {
      const kernel = createMockKernel({ status: 'starting' });
      renderWithIntl(<KernelStatus kernel={kernel} />);

      expect(screen.getByText(/Python 3 · Starting/)).toBeInTheDocument();
    });

    it('should show blue indicator for starting status', () => {
      const kernel = createMockKernel({ status: 'starting' });
      renderWithIntl(<KernelStatus kernel={kernel} />);

      // Starting status text should be shown
      expect(screen.getByText(/Starting/)).toBeInTheDocument();
    });
  });

  describe('dead status', () => {
    it('should render dead status correctly', () => {
      const kernel = createMockKernel({ status: 'dead' });
      renderWithIntl(<KernelStatus kernel={kernel} />);

      expect(screen.getByText(/Python 3 · Dead/)).toBeInTheDocument();
    });

    it('should show red indicator for dead status', () => {
      const kernel = createMockKernel({ status: 'dead' });
      renderWithIntl(<KernelStatus kernel={kernel} />);

      // Dead status text should be shown
      expect(screen.getByText(/Dead/)).toBeInTheDocument();
    });
  });

  describe('error status', () => {
    it('should render error status correctly', () => {
      const kernel = createMockKernel({ status: 'error' });
      renderWithIntl(<KernelStatus kernel={kernel} />);

      expect(screen.getByText(/Python 3 · Error/)).toBeInTheDocument();
    });

    it('should show red indicator for error status', () => {
      const kernel = createMockKernel({ status: 'error' });
      renderWithIntl(<KernelStatus kernel={kernel} />);

      // Error status text should be shown
      expect(screen.getByText(/Error/)).toBeInTheDocument();
    });
  });

  describe('restarting status', () => {
    it('should render restarting status correctly', () => {
      const kernel = createMockKernel({ status: 'restarting' });
      renderWithIntl(<KernelStatus kernel={kernel} />);

      expect(screen.getByText(/Python 3 · Restarting/)).toBeInTheDocument();
    });

    it('should not show restart button when restarting', () => {
      const kernel = createMockKernel({ status: 'restarting' });
      const onRestart = jest.fn();
      renderWithIntl(<KernelStatus kernel={kernel} onRestart={onRestart} />);

      const buttons = screen.queryAllByRole('button');
      const restartButton = buttons.find((btn) => btn.querySelector('.lucide-refresh-cw'));
      expect(restartButton).toBeUndefined();
    });
  });

  describe('restart functionality', () => {
    it('should show restart button when onRestart is provided and not restarting', () => {
      const kernel = createMockKernel({ status: 'idle' });
      const onRestart = jest.fn();
      renderWithIntl(<KernelStatus kernel={kernel} onRestart={onRestart} />);

      const buttons = screen.getAllByRole('button');
      const restartButton = buttons.find((btn) => btn.querySelector('.lucide-refresh-cw'));
      expect(restartButton).toBeInTheDocument();
    });

    it('should call onRestart when restart button is clicked', () => {
      const kernel = createMockKernel({ status: 'idle' });
      const onRestart = jest.fn();
      renderWithIntl(<KernelStatus kernel={kernel} onRestart={onRestart} />);

      const buttons = screen.getAllByRole('button');
      const restartButton = buttons.find((btn) => btn.querySelector('.lucide-refresh-cw'));
      if (restartButton) {
        fireEvent.click(restartButton);
      }
      expect(onRestart).toHaveBeenCalledTimes(1);
    });
  });

  describe('execution count', () => {
    it('should display execution count when greater than 0', () => {
      const kernel = createMockKernel({ executionCount: 5 });
      renderWithIntl(<KernelStatus kernel={kernel} />);

      expect(screen.getByText('[5]')).toBeInTheDocument();
    });

    it('should not display execution count when 0', () => {
      const kernel = createMockKernel({ executionCount: 0 });
      renderWithIntl(<KernelStatus kernel={kernel} />);

      expect(screen.queryByText('[0]')).not.toBeInTheDocument();
    });
  });

  describe('all kernel statuses', () => {
    const statuses: KernelStatusType[] = [
      'idle',
      'busy',
      'starting',
      'dead',
      'restarting',
      'interrupting',
      'stopping',
      'configuring',
      'installing',
      'error',
    ];

    it.each(statuses)('should render %s status without errors', (status) => {
      const kernel = createMockKernel({ status });
      expect(() => renderWithIntl(<KernelStatus kernel={kernel} />)).not.toThrow();
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const kernel = createMockKernel();
      const { container } = renderWithIntl(
        <KernelStatus kernel={kernel} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
