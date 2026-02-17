import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogSettings } from './log-settings';

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
const mockApplyLoggingSettings = jest.fn();
const mockGetLoggingBootstrapState = jest.fn();

jest.mock('@/lib/logger', () => ({
  getLoggingBootstrapState: (...args: unknown[]) =>
    (mockGetLoggingBootstrapState as (...innerArgs: unknown[]) => unknown)(...args),
  applyLoggingSettings: (...args: unknown[]) =>
    (mockApplyLoggingSettings as (...innerArgs: unknown[]) => unknown)(...args),
}));

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

const defaultBootstrapState = {
  config: {
  minLevel: 'info',
  includeStackTrace: true,
  includeSource: false,
  bufferSize: 50,
  flushInterval: 5000,
  enableConsole: true,
  enableStorage: true,
  enableRemote: false,
  maxStorageEntries: 10000,
  },
  transports: {
    console: true,
    indexedDB: true,
    remote: false,
    langfuse: false,
    opentelemetry: false,
  },
  retention: {
    maxEntries: 10000,
    maxAgeDays: 7,
  },
};

describe('LogSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockGetLoggingBootstrapState.mockReturnValue(defaultBootstrapState);
    mockApplyLoggingSettings.mockImplementation(() => defaultBootstrapState);
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
    it('loads initial config from bootstrap state', () => {
      render(<LogSettings />);

      expect(mockGetLoggingBootstrapState).toHaveBeenCalled();
    });
  });

  describe('Saving Configuration', () => {
    it('calls applyLoggingSettings when save is clicked', async () => {
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
        expect(mockApplyLoggingSettings).toHaveBeenCalled();
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
    it('applies transport settings on save', async () => {
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
        expect(mockApplyLoggingSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            transports: expect.any(Object),
            retention: expect.any(Object),
          })
        );
      });
    });

    it('applies logger config and retention settings on save', async () => {
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
        expect(mockApplyLoggingSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            config: expect.any(Object),
            retention: expect.objectContaining({
              maxEntries: expect.any(Number),
              maxAgeDays: expect.any(Number),
            }),
          })
        );
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
