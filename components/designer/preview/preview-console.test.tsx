import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PreviewConsole } from './preview-console';
import { useDesignerStore } from '@/stores/designer';

// Mock the designer store
jest.mock('@/stores/designer', () => ({
  useDesignerStore: jest.fn(),
}));

const mockClearConsoleLogs = jest.fn();
const mockToggleConsole = jest.fn();

const defaultStore = {
  consoleLogs: [] as Array<{ id: string; level: string; message: string; timestamp: number; count: number }>,
  clearConsoleLogs: mockClearConsoleLogs,
  showConsole: true,
  toggleConsole: mockToggleConsole,
};

function setupStore(overrides: Partial<typeof defaultStore> = {}) {
  const store = { ...defaultStore, ...overrides };
  (useDesignerStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: typeof store) => unknown) => selector(store)
  );
  return store;
}

const messages = {
  designer: {
    console: 'Console',
    clearConsole: 'Clear Console',
    noConsoleLogs: 'No console output',
  },
};

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe('PreviewConsole', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders console header with title', () => {
      setupStore();
      renderWithProviders(<PreviewConsole />);
      expect(screen.getByText('Console')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      setupStore();
      const { container } = renderWithProviders(
        <PreviewConsole className="my-custom-class" />
      );
      const classDiv = container.querySelector('.my-custom-class');
      expect(classDiv).toBeInTheDocument();
    });

    it('applies custom maxHeight to console output area', () => {
      setupStore({
        showConsole: true,
        consoleLogs: [
          { id: '1', level: 'log', message: 'test', timestamp: Date.now(), count: 1 },
        ],
      });
      const { container } = renderWithProviders(<PreviewConsole maxHeight={300} />);
      const scrollArea = container.querySelector('.overflow-auto');
      expect(scrollArea).toHaveStyle({ maxHeight: '300px' });
    });

    it('uses default maxHeight of 200', () => {
      setupStore({
        showConsole: true,
        consoleLogs: [
          { id: '1', level: 'log', message: 'test', timestamp: Date.now(), count: 1 },
        ],
      });
      const { container } = renderWithProviders(<PreviewConsole />);
      const scrollArea = container.querySelector('.overflow-auto');
      expect(scrollArea).toHaveStyle({ maxHeight: '200px' });
    });
  });

  describe('empty state', () => {
    it('shows empty state when no logs and console is open', () => {
      setupStore({ showConsole: true, consoleLogs: [] });
      renderWithProviders(<PreviewConsole />);
      expect(screen.getByText('No console output')).toBeInTheDocument();
    });
  });

  describe('log entries', () => {
    it('renders log level entries', () => {
      setupStore({
        showConsole: true,
        consoleLogs: [
          { id: '1', level: 'log', message: 'Log message', timestamp: Date.now(), count: 1 },
        ],
      });
      renderWithProviders(<PreviewConsole />);
      expect(screen.getByText('Log message')).toBeInTheDocument();
    });

    it('renders info level entries', () => {
      setupStore({
        showConsole: true,
        consoleLogs: [
          { id: '1', level: 'info', message: 'Info message', timestamp: Date.now(), count: 1 },
        ],
      });
      renderWithProviders(<PreviewConsole />);
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });

    it('renders warn level entries', () => {
      setupStore({
        showConsole: true,
        consoleLogs: [
          { id: '1', level: 'warn', message: 'Warning message', timestamp: Date.now(), count: 1 },
        ],
      });
      renderWithProviders(<PreviewConsole />);
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });

    it('renders error level entries', () => {
      setupStore({
        showConsole: true,
        consoleLogs: [
          { id: '1', level: 'error', message: 'Error message', timestamp: Date.now(), count: 1 },
        ],
      });
      renderWithProviders(<PreviewConsole />);
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('renders multiple entries of different levels', () => {
      setupStore({
        showConsole: true,
        consoleLogs: [
          { id: '1', level: 'log', message: 'Log msg', timestamp: Date.now(), count: 1 },
          { id: '2', level: 'info', message: 'Info msg', timestamp: Date.now(), count: 1 },
          { id: '3', level: 'warn', message: 'Warn msg', timestamp: Date.now(), count: 1 },
          { id: '4', level: 'error', message: 'Error msg', timestamp: Date.now(), count: 1 },
        ],
      });
      renderWithProviders(<PreviewConsole />);
      expect(screen.getByText('Log msg')).toBeInTheDocument();
      expect(screen.getByText('Info msg')).toBeInTheDocument();
      expect(screen.getByText('Warn msg')).toBeInTheDocument();
      expect(screen.getByText('Error msg')).toBeInTheDocument();
    });
  });

  describe('badges', () => {
    it('shows error count badge in header when errors exist', () => {
      setupStore({
        showConsole: true,
        consoleLogs: [
          { id: '1', level: 'error', message: 'Error 1', timestamp: Date.now(), count: 1 },
          { id: '2', level: 'error', message: 'Error 2', timestamp: Date.now(), count: 1 },
        ],
      });
      renderWithProviders(<PreviewConsole />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('does not show error badge when no errors', () => {
      setupStore({
        showConsole: true,
        consoleLogs: [
          { id: '1', level: 'log', message: 'OK', timestamp: Date.now(), count: 1 },
        ],
      });
      renderWithProviders(<PreviewConsole />);
      // No destructive badge should be rendered
      const badges = screen.queryAllByText('0');
      expect(badges).toHaveLength(0);
    });

    it('shows warning count badge when warnings exist', () => {
      setupStore({
        showConsole: true,
        consoleLogs: [
          { id: '1', level: 'warn', message: 'Warn 1', timestamp: Date.now(), count: 1 },
          { id: '2', level: 'warn', message: 'Warn 2', timestamp: Date.now(), count: 1 },
          { id: '3', level: 'warn', message: 'Warn 3', timestamp: Date.now(), count: 1 },
        ],
      });
      renderWithProviders(<PreviewConsole />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('shows both error and warning badges simultaneously', () => {
      setupStore({
        showConsole: true,
        consoleLogs: [
          { id: '1', level: 'error', message: 'Err', timestamp: Date.now(), count: 1 },
          { id: '2', level: 'warn', message: 'W1', timestamp: Date.now(), count: 1 },
          { id: '3', level: 'warn', message: 'W2', timestamp: Date.now(), count: 1 },
        ],
      });
      renderWithProviders(<PreviewConsole />);
      expect(screen.getByText('1')).toBeInTheDocument(); // error count
      expect(screen.getByText('2')).toBeInTheDocument(); // warn count
    });

    it('shows duplicate count badge for repeated messages', () => {
      setupStore({
        showConsole: true,
        consoleLogs: [
          { id: '1', level: 'log', message: 'Repeated msg', timestamp: Date.now(), count: 5 },
        ],
      });
      renderWithProviders(<PreviewConsole />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('does not show duplicate count badge when count is 1', () => {
      setupStore({
        showConsole: true,
        consoleLogs: [
          { id: '1', level: 'log', message: 'Single msg', timestamp: Date.now(), count: 1 },
        ],
      });
      renderWithProviders(<PreviewConsole />);
      expect(screen.getByText('Single msg')).toBeInTheDocument();
      // Should NOT show a "1" badge for the count
      const headerBadges = screen.queryAllByText('1');
      // The only "1" might be from error/warn count badge (but there are none here)
      expect(headerBadges).toHaveLength(0);
    });
  });

  describe('timestamp formatting', () => {
    it('formats timestamp correctly', () => {
      // Use a known timestamp: 2024-01-15 10:05:30.123
      const ts = new Date(2024, 0, 15, 10, 5, 30, 123).getTime();
      setupStore({
        showConsole: true,
        consoleLogs: [
          { id: '1', level: 'log', message: 'Timestamped', timestamp: ts, count: 1 },
        ],
      });
      renderWithProviders(<PreviewConsole />);
      expect(screen.getByText('10:05:30.123')).toBeInTheDocument();
    });

    it('pads single-digit hours/minutes/seconds', () => {
      const ts = new Date(2024, 0, 15, 1, 2, 3, 4).getTime();
      setupStore({
        showConsole: true,
        consoleLogs: [
          { id: '1', level: 'log', message: 'Padded', timestamp: ts, count: 1 },
        ],
      });
      renderWithProviders(<PreviewConsole />);
      expect(screen.getByText('01:02:03.004')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls toggleConsole when header is clicked', () => {
      setupStore();
      renderWithProviders(<PreviewConsole />);
      fireEvent.click(screen.getByText('Console'));
      expect(mockToggleConsole).toHaveBeenCalledTimes(1);
    });

    it('calls clearConsoleLogs when clear button is clicked', () => {
      setupStore({ showConsole: true });
      renderWithProviders(<PreviewConsole />);
      // Clear button only visible when console is open
      const buttons = screen.getAllByRole('button');
      // The clear button has the Trash2 icon
      const clearBtn = buttons.find((btn) => btn.querySelector('.lucide-trash-2'));
      expect(clearBtn).toBeDefined();
      if (clearBtn) {
        fireEvent.click(clearBtn);
        expect(mockClearConsoleLogs).toHaveBeenCalledTimes(1);
      }
    });

    it('does not show clear button when console is collapsed', () => {
      setupStore({ showConsole: false });
      renderWithProviders(<PreviewConsole />);
      const buttons = screen.queryAllByRole('button');
      const clearBtn = buttons.find((btn) => btn.querySelector('.lucide-trash-2'));
      expect(clearBtn).toBeUndefined();
    });

    it('clear button click does not toggle console (stopPropagation)', () => {
      setupStore({ showConsole: true });
      renderWithProviders(<PreviewConsole />);
      const buttons = screen.getAllByRole('button');
      const clearBtn = buttons.find((btn) => btn.querySelector('.lucide-trash-2'));
      if (clearBtn) {
        fireEvent.click(clearBtn);
        // clearConsoleLogs should be called but toggleConsole should not
        expect(mockClearConsoleLogs).toHaveBeenCalledTimes(1);
        expect(mockToggleConsole).not.toHaveBeenCalled();
      }
    });
  });

  describe('collapsed/expanded state', () => {
    it('does not show log entries when console is collapsed', () => {
      setupStore({
        showConsole: false,
        consoleLogs: [
          { id: '1', level: 'log', message: 'Hidden message', timestamp: Date.now(), count: 1 },
        ],
      });
      renderWithProviders(<PreviewConsole />);
      expect(screen.queryByText('Hidden message')).not.toBeInTheDocument();
    });

    it('shows log entries when console is expanded', () => {
      setupStore({
        showConsole: true,
        consoleLogs: [
          { id: '1', level: 'log', message: 'Visible message', timestamp: Date.now(), count: 1 },
        ],
      });
      renderWithProviders(<PreviewConsole />);
      expect(screen.getByText('Visible message')).toBeInTheDocument();
    });

    it('still shows header badges when console is collapsed', () => {
      setupStore({
        showConsole: false,
        consoleLogs: [
          { id: '1', level: 'error', message: 'Err', timestamp: Date.now(), count: 1 },
          { id: '2', level: 'error', message: 'Err2', timestamp: Date.now(), count: 1 },
        ],
      });
      renderWithProviders(<PreviewConsole />);
      // Error count badge should still be visible in header
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('shows ChevronDown icon when expanded', () => {
      setupStore({ showConsole: true });
      const { container } = renderWithProviders(<PreviewConsole />);
      expect(container.querySelector('.lucide-chevron-down')).toBeInTheDocument();
    });

    it('shows ChevronUp icon when collapsed', () => {
      setupStore({ showConsole: false });
      const { container } = renderWithProviders(<PreviewConsole />);
      expect(container.querySelector('.lucide-chevron-up')).toBeInTheDocument();
    });
  });
});
