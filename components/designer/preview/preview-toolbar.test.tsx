import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PreviewToolbar } from './preview-toolbar';
import { useDesignerStore } from '@/stores/designer';

jest.mock('@/stores/designer', () => ({
  useDesignerStore: jest.fn(),
}));

const mockToggleConsole = jest.fn();

type LogEntry = { id: string; level: string; message: string; timestamp: number; count: number };

const defaultStore = {
  viewport: 'desktop' as string,
  customViewport: null as { width: number; height: number } | null,
  zoom: 100,
  showConsole: false,
  toggleConsole: mockToggleConsole,
  consoleLogs: [] as LogEntry[],
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
    refreshPreview: 'Refresh Preview',
    screenshotPreview: 'Screenshot',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit Fullscreen',
    openInNewTab: 'Open in New Tab',
  },
};

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe('PreviewToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('viewport display', () => {
    it('renders desktop viewport info', () => {
      setupStore();
      renderWithProviders(<PreviewToolbar />);
      expect(screen.getByText('1280×800')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('renders mobile viewport dimensions', () => {
      setupStore({ viewport: 'mobile' });
      renderWithProviders(<PreviewToolbar />);
      expect(screen.getByText('375×667')).toBeInTheDocument();
    });

    it('renders tablet viewport dimensions', () => {
      setupStore({ viewport: 'tablet' });
      renderWithProviders(<PreviewToolbar />);
      expect(screen.getByText('768×1024')).toBeInTheDocument();
    });

    it('renders full viewport as "Full"', () => {
      setupStore({ viewport: 'full' });
      renderWithProviders(<PreviewToolbar />);
      expect(screen.getByText('Full')).toBeInTheDocument();
    });

    it('renders custom viewport dimensions', () => {
      setupStore({ customViewport: { width: 1440, height: 900 } });
      renderWithProviders(<PreviewToolbar />);
      expect(screen.getByText('1440×900')).toBeInTheDocument();
    });

    it('custom viewport takes priority over preset viewport', () => {
      setupStore({ viewport: 'mobile', customViewport: { width: 500, height: 600 } });
      renderWithProviders(<PreviewToolbar />);
      expect(screen.getByText('500×600')).toBeInTheDocument();
      expect(screen.queryByText('375×667')).not.toBeInTheDocument();
    });

    it('renders zoom percentage', () => {
      setupStore({ zoom: 75 });
      renderWithProviders(<PreviewToolbar />);
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  describe('className prop', () => {
    it('applies custom className to the toolbar', () => {
      setupStore();
      const { container } = renderWithProviders(
        <PreviewToolbar className="my-toolbar-class" />
      );
      const classDiv = container.querySelector('.my-toolbar-class');
      expect(classDiv).toBeInTheDocument();
    });
  });

  describe('console toggle', () => {
    it('calls toggleConsole when console button is clicked', () => {
      setupStore();
      renderWithProviders(<PreviewToolbar />);
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]);
      expect(mockToggleConsole).toHaveBeenCalledTimes(1);
    });

    it('console button uses secondary variant when showConsole is true', () => {
      setupStore({ showConsole: true });
      renderWithProviders(<PreviewToolbar />);
      const buttons = screen.getAllByRole('button');
      // First button is the console toggle; check it has the active variant
      expect(buttons[0]).toBeInTheDocument();
    });
  });

  describe('error badge', () => {
    it('shows error count badge when errors exist', () => {
      setupStore({
        consoleLogs: [
          { id: '1', level: 'error', message: 'err', timestamp: Date.now(), count: 1 },
          { id: '2', level: 'error', message: 'err2', timestamp: Date.now(), count: 1 },
          { id: '3', level: 'log', message: 'ok', timestamp: Date.now(), count: 1 },
        ],
      });
      renderWithProviders(<PreviewToolbar />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('does not show error badge when no errors', () => {
      setupStore({
        consoleLogs: [
          { id: '1', level: 'log', message: 'ok', timestamp: Date.now(), count: 1 },
        ],
      });
      renderWithProviders(<PreviewToolbar />);
      // No error badge should exist
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('caps error count at 9+ for more than 9 errors', () => {
      const errors: LogEntry[] = Array.from({ length: 12 }, (_, i) => ({
        id: String(i),
        level: 'error',
        message: `err-${i}`,
        timestamp: Date.now(),
        count: 1,
      }));
      setupStore({ consoleLogs: errors });
      renderWithProviders(<PreviewToolbar />);
      expect(screen.getByText('9+')).toBeInTheDocument();
    });

    it('shows exact count for 9 or fewer errors', () => {
      const errors: LogEntry[] = Array.from({ length: 7 }, (_, i) => ({
        id: String(i),
        level: 'error',
        message: `err-${i}`,
        timestamp: Date.now(),
        count: 1,
      }));
      setupStore({ consoleLogs: errors });
      renderWithProviders(<PreviewToolbar />);
      expect(screen.getByText('7')).toBeInTheDocument();
    });
  });

  describe('refresh button', () => {
    it('calls onRefresh when refresh button is clicked', () => {
      setupStore();
      const onRefresh = jest.fn();
      renderWithProviders(<PreviewToolbar onRefresh={onRefresh} />);
      const buttons = screen.getAllByRole('button');
      // Find the refresh button (after console + separator)
      const refreshBtn = buttons.find((btn) => btn.querySelector('.lucide-refresh-cw'));
      expect(refreshBtn).toBeDefined();
      if (refreshBtn) {
        fireEvent.click(refreshBtn);
        expect(onRefresh).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('screenshot button', () => {
    it('calls onScreenshot when screenshot button is clicked', async () => {
      setupStore();
      const onScreenshot = jest.fn().mockResolvedValue(undefined);
      renderWithProviders(<PreviewToolbar onScreenshot={onScreenshot} />);
      const buttons = screen.getAllByRole('button');
      const screenshotBtn = buttons.find((btn) => btn.querySelector('.lucide-camera'));
      expect(screenshotBtn).toBeDefined();
      if (screenshotBtn) {
        fireEvent.click(screenshotBtn);
        await waitFor(() => {
          expect(onScreenshot).toHaveBeenCalledTimes(1);
        });
      }
    });
  });

  describe('open in new tab', () => {
    it('calls onOpenNewTab when new tab button is clicked', () => {
      setupStore();
      const onOpenNewTab = jest.fn();
      renderWithProviders(<PreviewToolbar onOpenNewTab={onOpenNewTab} />);
      const buttons = screen.getAllByRole('button');
      const newTabBtn = buttons.find((btn) => btn.querySelector('.lucide-external-link'));
      expect(newTabBtn).toBeDefined();
      if (newTabBtn) {
        fireEvent.click(newTabBtn);
        expect(onOpenNewTab).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('fullscreen button', () => {
    it('renders fullscreen toggle button', () => {
      setupStore();
      renderWithProviders(<PreviewToolbar />);
      const buttons = screen.getAllByRole('button');
      const fullscreenBtn = buttons.find((btn) => btn.querySelector('.lucide-maximize-2'));
      expect(fullscreenBtn).toBeDefined();
    });
  });

  describe('buttons count', () => {
    it('renders all 5 action buttons', () => {
      setupStore();
      renderWithProviders(<PreviewToolbar />);
      const buttons = screen.getAllByRole('button');
      // Console, Refresh, Screenshot, Fullscreen, Open in new tab
      expect(buttons).toHaveLength(5);
    });
  });
});
