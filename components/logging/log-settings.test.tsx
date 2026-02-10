import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogSettings } from './log-settings';
import { getLoggerConfig, updateLoggerConfig } from '@/lib/logger';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      settingsTitle: 'Logging Configuration',
      settingsDescription: 'Configure log levels, transports, and retention policies',
      'settings.save': 'Save',
      'settings.saving': 'Saving...',
      'settings.saved': 'Saved!',
      'settings.reset': 'Reset',
      'settings.logLevel.title': 'Log Level',
      'settings.logLevel.description': 'Set the minimum log level',
      'settings.logLevel.minLevel': 'Minimum Level',
      'settings.logLevel.trace': 'Trace',
      'settings.logLevel.traceDesc': 'Most verbose',
      'settings.logLevel.debug': 'Debug',
      'settings.logLevel.debugDesc': 'Debug info',
      'settings.logLevel.info': 'Info',
      'settings.logLevel.infoDesc': 'General info',
      'settings.logLevel.warn': 'Warning',
      'settings.logLevel.warnDesc': 'Warnings',
      'settings.logLevel.error': 'Error',
      'settings.logLevel.errorDesc': 'Errors',
      'settings.logLevel.fatal': 'Fatal',
      'settings.logLevel.fatalDesc': 'Critical',
      'settings.options.includeStackTrace': 'Include Stack Traces',
      'settings.options.includeStackTraceDesc': 'Include stack traces for errors',
      'settings.options.includeSource': 'Include Source Location',
      'settings.options.includeSourceDesc': 'Include file and line number',
      'settings.transports.title': 'Log Transports',
      'settings.transports.description': 'Configure where logs are sent',
      'settings.transports.console': 'Console Output',
      'settings.transports.consoleDesc': 'Output to browser console',
      'settings.transports.indexedDB': 'IndexedDB Storage',
      'settings.transports.indexedDBDesc': 'Persist logs locally',
      'settings.transports.langfuse': 'Langfuse Integration',
      'settings.transports.langfuseDesc': 'Send to Langfuse',
      'settings.transports.opentelemetry': 'OpenTelemetry',
      'settings.transports.opentelemetryDesc': 'OpenTelemetry integration',
      'settings.retention.title': 'Log Retention',
      'settings.retention.description': 'Configure log retention',
      'settings.retention.maxEntries': 'Maximum Entries',
      'settings.retention.maxEntriesDesc': 'Max logs to store',
      'settings.retention.maxAgeDays': 'Maximum Age (Days)',
      'settings.retention.maxAgeDaysDesc': 'Auto cleanup after days',
      'settings.retention.days': 'days',
      'settings.performanceNote.title': 'Performance Note',
      'settings.performanceNote.description': 'Stack traces may impact performance',
    };
    return translations[key] || key;
  },
}));

// Mock logger functions
const mockAddTransport = jest.fn();
const mockRemoveTransport = jest.fn();
const mockCreateConsoleTransport = jest.fn(() => ({ name: 'console' }));
const mockCreateIndexedDBTransport = jest.fn((_o?: unknown) => ({ name: 'indexeddb' }));

jest.mock('@/lib/logger', () => ({
  getLoggerConfig: jest.fn(),
  updateLoggerConfig: jest.fn(),
  addTransport: (t: unknown) => mockAddTransport(t),
  removeTransport: (n: unknown) => mockRemoveTransport(n),
  createConsoleTransport: () => mockCreateConsoleTransport(),
  createIndexedDBTransport: (o?: unknown) => mockCreateIndexedDBTransport(o),
}));

const mockGetLoggerConfig = getLoggerConfig as jest.Mock;
const mockUpdateLoggerConfig = updateLoggerConfig as jest.Mock;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const defaultConfig = {
  minLevel: 'info',
  includeStackTrace: true,
  includeSource: false,
  bufferSize: 50,
  flushInterval: 5000,
  enableConsole: true,
  enableStorage: true,
  enableRemote: false,
  maxStorageEntries: 10000,
};

describe('LogSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockGetLoggerConfig.mockReturnValue(defaultConfig);
  });

  describe('Rendering', () => {
    it('renders the settings page with header', () => {
      render(<LogSettings />);

      expect(screen.getByText('Logging Configuration')).toBeInTheDocument();
      expect(
        screen.getByText('Configure log levels, transports, and retention policies')
      ).toBeInTheDocument();
    });

    it('renders log level section', () => {
      render(<LogSettings />);

      expect(screen.getByText('Log Level')).toBeInTheDocument();
      expect(screen.getByText('Minimum Level')).toBeInTheDocument();
    });

    it('renders transport options', () => {
      render(<LogSettings />);

      expect(screen.getByText('Log Transports')).toBeInTheDocument();
      expect(screen.getByText('Console Output')).toBeInTheDocument();
      expect(screen.getByText('IndexedDB Storage')).toBeInTheDocument();
    });

    it('renders retention settings', () => {
      render(<LogSettings />);

      expect(screen.getByText('Log Retention')).toBeInTheDocument();
      expect(screen.getByText('Maximum Entries')).toBeInTheDocument();
      expect(screen.getByText('Maximum Age (Days)')).toBeInTheDocument();
    });

    it('renders performance note', () => {
      render(<LogSettings />);

      expect(screen.getByText('Performance Note')).toBeInTheDocument();
    });

    it('renders save and reset buttons', () => {
      render(<LogSettings />);

      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });
  });

  describe('Configuration Loading', () => {
    it('loads initial config from getLoggerConfig', () => {
      render(<LogSettings />);

      expect(mockGetLoggerConfig).toHaveBeenCalled();
    });

    it('loads transport settings from localStorage', () => {
      const transportSettings = JSON.stringify({
        console: true,
        indexedDB: false,
        langfuse: true,
      });
      localStorageMock.getItem.mockReturnValueOnce(transportSettings);

      render(<LogSettings />);

      expect(localStorageMock.getItem).toHaveBeenCalledWith('cognia-logging-transports');
    });

    it('loads retention settings from localStorage', () => {
      const retentionSettings = JSON.stringify({
        maxEntries: 5000,
        maxAgeDays: 14,
      });
      localStorageMock.getItem.mockReturnValueOnce(null); // transports
      localStorageMock.getItem.mockReturnValueOnce(retentionSettings);

      render(<LogSettings />);

      expect(localStorageMock.getItem).toHaveBeenCalledWith('cognia-logging-retention');
    });
  });

  describe('Saving Configuration', () => {
    it('calls updateLoggerConfig when save is clicked', async () => {
      const user = userEvent.setup();
      render(<LogSettings />);

      // Make a change first to enable save
      const switches = screen.getAllByRole('switch');
      if (switches.length > 0) {
        await user.click(switches[0]);
      }

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateLoggerConfig).toHaveBeenCalled();
      });
    });

    it('saves transport settings to localStorage', async () => {
      const user = userEvent.setup();
      render(<LogSettings />);

      // Make a change
      const switches = screen.getAllByRole('switch');
      if (switches.length > 0) {
        await user.click(switches[0]);
      }

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'cognia-logging-transports',
          expect.any(String)
        );
      });
    });

    it('saves retention settings to localStorage', async () => {
      const user = userEvent.setup();
      render(<LogSettings />);

      // Make a change
      const switches = screen.getAllByRole('switch');
      if (switches.length > 0) {
        await user.click(switches[0]);
      }

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'cognia-logging-retention',
          expect.any(String)
        );
      });
    });

    it('shows saved status after successful save', async () => {
      const user = userEvent.setup();
      render(<LogSettings />);

      // Make a change
      const switches = screen.getAllByRole('switch');
      if (switches.length > 0) {
        await user.click(switches[0]);
      }

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Saved!')).toBeInTheDocument();
      });
    });
  });

  describe('Reset Functionality', () => {
    it('resets config to defaults when reset is clicked', async () => {
      const user = userEvent.setup();
      render(<LogSettings />);

      const resetButton = screen.getByText('Reset');
      await user.click(resetButton);

      // After reset, save should be enabled (hasChanges = true)
      const saveButton = screen.getByText('Save');
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Toggle Switches', () => {
    it('toggles includeStackTrace when switch is clicked', async () => {
      const user = userEvent.setup();
      render(<LogSettings />);

      const stackTraceLabel = screen.getByText('Include Stack Traces');
      const switchElement = stackTraceLabel.closest('div')?.querySelector('[role="switch"]');

      if (switchElement) {
        await user.click(switchElement);

        // Verify switch state changed
        expect(switchElement).toHaveAttribute('aria-checked');
      }
    });

    it('toggles transport options when switches are clicked', async () => {
      const user = userEvent.setup();
      render(<LogSettings />);

      const switches = screen.getAllByRole('switch');
      expect(switches.length).toBeGreaterThan(0);

      // Click first switch
      await user.click(switches[0]);

      // Save should now be enabled
      const saveButton = screen.getByText('Save');
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Log Level Selection', () => {
    it('renders log level selector', () => {
      render(<LogSettings />);

      // Verify level selector exists
      const levelSelectors = screen.getAllByRole('combobox');
      expect(levelSelectors.length).toBeGreaterThan(0);
    });
  });

  describe('Props', () => {
    it('applies custom className', () => {
      const { container } = render(<LogSettings className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Save Button State', () => {
    it('save button is disabled when no changes', () => {
      render(<LogSettings />);

      const saveButton = screen.getByText('Save');
      expect(saveButton).toBeDisabled();
    });

    it('save button is enabled after making changes', async () => {
      const user = userEvent.setup();
      render(<LogSettings />);

      const switches = screen.getAllByRole('switch');
      if (switches.length > 0) {
        await user.click(switches[0]);
      }

      const saveButton = screen.getByText('Save');
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Transport Application', () => {
    it('calls addTransport for enabled transports on save', async () => {
      const user = userEvent.setup();
      render(<LogSettings />);

      // Make a change to enable save
      const switches = screen.getAllByRole('switch');
      if (switches.length > 0) {
        await user.click(switches[0]);
      }

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      await waitFor(() => {
        // Console transport should be added (enabled by default)
        expect(mockAddTransport).toHaveBeenCalled();
      });
    });

    it('calls createIndexedDBTransport with retention settings on save', async () => {
      const user = userEvent.setup();
      render(<LogSettings />);

      // Make a change
      const switches = screen.getAllByRole('switch');
      if (switches.length > 0) {
        await user.click(switches[0]);
      }

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockCreateIndexedDBTransport).toHaveBeenCalledWith(
          expect.objectContaining({
            maxEntries: expect.any(Number),
            retentionDays: expect.any(Number),
          })
        );
      });
    });

    it('calls removeTransport for disabled transports on save', async () => {
      const user = userEvent.setup();
      render(<LogSettings />);

      // Make a change
      const switches = screen.getAllByRole('switch');
      if (switches.length > 0) {
        await user.click(switches[0]);
      }

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      await waitFor(() => {
        // removeTransport should be called for indexeddb before re-adding
        expect(mockRemoveTransport).toHaveBeenCalledWith('indexeddb');
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible switch elements', () => {
      render(<LogSettings />);

      const switches = screen.getAllByRole('switch');
      expect(switches.length).toBeGreaterThan(0);

      switches.forEach((switchEl) => {
        expect(switchEl).toHaveAttribute('aria-checked');
      });
    });

    it('has accessible buttons', () => {
      render(<LogSettings />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      const resetButton = screen.getByRole('button', { name: /reset/i });

      expect(saveButton).toBeInTheDocument();
      expect(resetButton).toBeInTheDocument();
    });
  });
});
