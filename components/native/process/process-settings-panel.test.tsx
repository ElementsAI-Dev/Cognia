/**
 * ProcessSettingsPanel Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProcessSettingsPanel } from './process-settings-panel';
import { useProcessManager } from '@/hooks/agent/use-process-manager';
import { DEFAULT_PROCESS_CONFIG } from '@/stores/agent/process-store';

// Mock dependencies
jest.mock('@/hooks/agent/use-process-manager');
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockUseProcessManager = useProcessManager as jest.MockedFunction<typeof useProcessManager>;

const defaultMockReturn = {
  config: DEFAULT_PROCESS_CONFIG,
  configLoading: false,
  isAvailable: true,
  refreshConfig: jest.fn(),
  updateConfig: jest.fn().mockResolvedValue(true),
  processes: [],
  isLoading: false,
  error: null,
  lastRefresh: null,
  trackedPids: [],
  getTrackedByAgent: jest.fn().mockReturnValue([]),
  refresh: jest.fn(),
  search: jest.fn(),
  getTopMemory: jest.fn(),
  terminate: jest.fn(),
  startProcess: jest.fn(),
  trackProcess: jest.fn(),
  untrackProcess: jest.fn(),
  isProgramAllowed: jest.fn(),
  autoRefresh: false,
  setAutoRefresh: jest.fn(),
};

describe('ProcessSettingsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProcessManager.mockReturnValue(defaultMockReturn);
  });

  it('renders not available message when process management is not available', () => {
    mockUseProcessManager.mockReturnValue({
      ...defaultMockReturn,
      isAvailable: false,
    });

    render(<ProcessSettingsPanel />);
    expect(screen.getByText('notAvailable')).toBeInTheDocument();
  });

  it('renders process settings panel when available', () => {
    render(<ProcessSettingsPanel />);
    expect(screen.getByText('enableProcessManagement')).toBeInTheDocument();
  });

  it('shows disabled warning when process management is disabled', () => {
    mockUseProcessManager.mockReturnValue({
      ...defaultMockReturn,
      config: { ...DEFAULT_PROCESS_CONFIG, enabled: false },
    });

    render(<ProcessSettingsPanel />);
    expect(screen.getByText('disabledWarning')).toBeInTheDocument();
  });

  it('does not show disabled warning when enabled', () => {
    mockUseProcessManager.mockReturnValue({
      ...defaultMockReturn,
      config: { ...DEFAULT_PROCESS_CONFIG, enabled: true },
    });

    render(<ProcessSettingsPanel />);
    expect(screen.queryByText('disabledWarning')).not.toBeInTheDocument();
  });

  it('displays denied programs as badges', () => {
    mockUseProcessManager.mockReturnValue({
      ...defaultMockReturn,
      config: {
        ...DEFAULT_PROCESS_CONFIG,
        deniedPrograms: ['rm', 'del', 'format'],
      },
    });

    render(<ProcessSettingsPanel />);
    expect(screen.getByText('rm')).toBeInTheDocument();
    expect(screen.getByText('del')).toBeInTheDocument();
    expect(screen.getByText('format')).toBeInTheDocument();
  });

  it('displays allowed programs as badges', () => {
    mockUseProcessManager.mockReturnValue({
      ...defaultMockReturn,
      config: {
        ...DEFAULT_PROCESS_CONFIG,
        allowedPrograms: ['python', 'node'],
      },
    });

    render(<ProcessSettingsPanel />);
    expect(screen.getByText('python')).toBeInTheDocument();
    expect(screen.getByText('node')).toBeInTheDocument();
  });

  it('shows no restrictions message when allowedPrograms is empty', () => {
    mockUseProcessManager.mockReturnValue({
      ...defaultMockReturn,
      config: {
        ...DEFAULT_PROCESS_CONFIG,
        allowedPrograms: [],
      },
    });

    render(<ProcessSettingsPanel />);
    expect(screen.getByText('noAllowedPrograms')).toBeInTheDocument();
  });

  it('calls refreshConfig on mount', () => {
    const refreshConfig = jest.fn();
    mockUseProcessManager.mockReturnValue({
      ...defaultMockReturn,
      refreshConfig,
    });

    render(<ProcessSettingsPanel />);
    expect(refreshConfig).toHaveBeenCalled();
  });

  it('enables save button when changes are made', async () => {
    render(<ProcessSettingsPanel />);

    // Find and click the first enable switch (process management enable)
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);

    // Save button should be enabled
    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).not.toBeDisabled();
  });

  it('calls updateConfig when save is clicked', async () => {
    const updateConfig = jest.fn().mockResolvedValue(true);
    mockUseProcessManager.mockReturnValue({
      ...defaultMockReturn,
      updateConfig,
    });

    render(<ProcessSettingsPanel />);

    // Make a change - click the first switch (process management enable)
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);

    // Click save
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateConfig).toHaveBeenCalled();
    });
  });

  it('resets to default config when reset is clicked', () => {
    mockUseProcessManager.mockReturnValue({
      ...defaultMockReturn,
      config: {
        ...DEFAULT_PROCESS_CONFIG,
        enabled: true,
        allowedPrograms: ['python'],
      },
    });

    render(<ProcessSettingsPanel />);

    // Click reset
    const resetButton = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetButton);

    // Changes should be pending (save button enabled)
    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).not.toBeDisabled();
  });

  it('adds program to allowed list', async () => {
    render(<ProcessSettingsPanel />);

    // Find the allowed programs input (first one)
    const inputs = screen.getAllByPlaceholderText('addProgram');
    const allowedInput = inputs[0];

    // Type a program name
    fireEvent.change(allowedInput, { target: { value: 'python' } });

    // Click add button (first plus button)
    const addButtons = screen.getAllByRole('button');
    const addButton = addButtons.find((btn) => btn.querySelector('svg.lucide-plus'));
    if (addButton) {
      fireEvent.click(addButton);
    }

    // Save button should be enabled (changes made)
    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).not.toBeDisabled();
  });

  it('shows loading state when configLoading is true', () => {
    mockUseProcessManager.mockReturnValue({
      ...defaultMockReturn,
      configLoading: true,
    });

    render(<ProcessSettingsPanel />);

    // Save button should show loading state or be disabled
    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
  });
});
