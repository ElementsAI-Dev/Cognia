/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SafetySettings } from './safety-settings';
import { useSettingsStore } from '@/stores';

// Mock the settings store
jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn(),
}));

describe('SafetySettings', () => {
  const mockSetSafetyModeEnabled = jest.fn();
  const mockSetSafetyMode = jest.fn();
  const mockSetCheckUserInput = jest.fn();
  const mockSetCheckSystemPrompt = jest.fn();
  const mockSetCheckToolCalls = jest.fn();
  const mockSetBlockDangerousCommands = jest.fn();
  const mockAddSafetyRule = jest.fn();
  const mockRemoveSafetyRule = jest.fn();
  const mockEnableSafetyRule = jest.fn();
  const mockDisableSafetyRule = jest.fn();
  const mockAddCustomBlockedPattern = jest.fn();
  const mockRemoveCustomBlockedPattern = jest.fn();
  const mockAddCustomAllowedPattern = jest.fn();
  const mockRemoveCustomAllowedPattern = jest.fn();
  const mockSetExternalReviewConfig = jest.fn();
  const mockSetLogSafetyEvents = jest.fn();
  const mockSetShowSafetyWarnings = jest.fn();
  const mockResetSafetyModeSettings = jest.fn();

  const defaultSafetyModeSettings = {
    enabled: false,
    mode: 'off' as const,
    checkUserInput: true,
    checkSystemPrompt: true,
    checkToolCalls: true,
    blockDangerousCommands: true,
    rules: [],
    customBlockedPatterns: [],
    customAllowedPatterns: [],
    externalReview: {
      enabled: false,
      endpoint: '',
      apiKey: '',
      headers: {},
      timeoutMs: 5000,
      minSeverity: 'medium' as const,
      fallbackMode: 'allow' as const,
    },
    logSafetyEvents: true,
    showSafetyWarnings: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const mockStore = {
      safetyModeSettings: defaultSafetyModeSettings,
      setSafetyModeEnabled: mockSetSafetyModeEnabled,
      setSafetyMode: mockSetSafetyMode,
      setCheckUserInput: mockSetCheckUserInput,
      setCheckSystemPrompt: mockSetCheckSystemPrompt,
      setCheckToolCalls: mockSetCheckToolCalls,
      setBlockDangerousCommands: mockSetBlockDangerousCommands,
      addSafetyRule: mockAddSafetyRule,
      removeSafetyRule: mockRemoveSafetyRule,
      enableSafetyRule: mockEnableSafetyRule,
      disableSafetyRule: mockDisableSafetyRule,
      addCustomBlockedPattern: mockAddCustomBlockedPattern,
      removeCustomBlockedPattern: mockRemoveCustomBlockedPattern,
      addCustomAllowedPattern: mockAddCustomAllowedPattern,
      removeCustomAllowedPattern: mockRemoveCustomAllowedPattern,
      setExternalReviewConfig: mockSetExternalReviewConfig,
      setLogSafetyEvents: mockSetLogSafetyEvents,
      setShowSafetyWarnings: mockSetShowSafetyWarnings,
      resetSafetyModeSettings: mockResetSafetyModeSettings,
    };
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(mockStore);
  });

  it('should render safety mode toggle', () => {
    render(<SafetySettings />);
    
    expect(screen.getByText('Safety Mode')).toBeInTheDocument();
    expect(screen.getByText(/Enable security checks/)).toBeInTheDocument();
  });

  it('should show safety mode options when enabled', async () => {
    const mockStore = {
      safetyModeSettings: { ...defaultSafetyModeSettings, enabled: true },
      setSafetyModeEnabled: mockSetSafetyModeEnabled,
      setSafetyMode: mockSetSafetyMode,
      setCheckUserInput: mockSetCheckUserInput,
      setCheckSystemPrompt: mockSetCheckSystemPrompt,
      setCheckToolCalls: mockSetCheckToolCalls,
      setBlockDangerousCommands: mockSetBlockDangerousCommands,
      addSafetyRule: mockAddSafetyRule,
      removeSafetyRule: mockRemoveSafetyRule,
      enableSafetyRule: mockEnableSafetyRule,
      disableSafetyRule: mockDisableSafetyRule,
      addCustomBlockedPattern: mockAddCustomBlockedPattern,
      removeCustomBlockedPattern: mockRemoveCustomBlockedPattern,
      addCustomAllowedPattern: mockAddCustomAllowedPattern,
      removeCustomAllowedPattern: mockRemoveCustomAllowedPattern,
      setExternalReviewConfig: mockSetExternalReviewConfig,
      setLogSafetyEvents: mockSetLogSafetyEvents,
      setShowSafetyWarnings: mockSetShowSafetyWarnings,
      resetSafetyModeSettings: mockResetSafetyModeSettings,
    };
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(mockStore);

    render(<SafetySettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Detection Mode')).toBeInTheDocument();
    });
  });

  it('should call setSafetyModeEnabled when toggle is clicked', async () => {
    render(<SafetySettings />);
    
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    
    await waitFor(() => {
      expect(mockSetSafetyModeEnabled).toHaveBeenCalledWith(true);
    });
  });

  it('should show check options when enabled', async () => {
    const mockStore = {
      safetyModeSettings: { ...defaultSafetyModeSettings, enabled: true },
      setSafetyModeEnabled: mockSetSafetyModeEnabled,
      setSafetyMode: mockSetSafetyMode,
      setCheckUserInput: mockSetCheckUserInput,
      setCheckSystemPrompt: mockSetCheckSystemPrompt,
      setCheckToolCalls: mockSetCheckToolCalls,
      setBlockDangerousCommands: mockSetBlockDangerousCommands,
      addSafetyRule: mockAddSafetyRule,
      removeSafetyRule: mockRemoveSafetyRule,
      enableSafetyRule: mockEnableSafetyRule,
      disableSafetyRule: mockDisableSafetyRule,
      addCustomBlockedPattern: mockAddCustomBlockedPattern,
      removeCustomBlockedPattern: mockRemoveCustomBlockedPattern,
      addCustomAllowedPattern: mockAddCustomAllowedPattern,
      removeCustomAllowedPattern: mockRemoveCustomAllowedPattern,
      setExternalReviewConfig: mockSetExternalReviewConfig,
      setLogSafetyEvents: mockSetLogSafetyEvents,
      setShowSafetyWarnings: mockSetShowSafetyWarnings,
      resetSafetyModeSettings: mockResetSafetyModeSettings,
    };
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(mockStore);

    render(<SafetySettings />);
    
    await waitFor(() => {
      expect(screen.getByText('User Messages')).toBeInTheDocument();
      expect(screen.getByText('System Prompts')).toBeInTheDocument();
      expect(screen.getByText('Tool Calls')).toBeInTheDocument();
      expect(screen.getByText('Block Dangerous Commands')).toBeInTheDocument();
    });
  });

  it('should call setCheckUserInput when toggle is clicked', async () => {
    const mockStore = {
      safetyModeSettings: { ...defaultSafetyModeSettings, enabled: true },
      setSafetyModeEnabled: mockSetSafetyModeEnabled,
      setSafetyMode: mockSetSafetyMode,
      setCheckUserInput: mockSetCheckUserInput,
      setCheckSystemPrompt: mockSetCheckSystemPrompt,
      setCheckToolCalls: mockSetCheckToolCalls,
      setBlockDangerousCommands: mockSetBlockDangerousCommands,
      addSafetyRule: mockAddSafetyRule,
      removeSafetyRule: mockRemoveSafetyRule,
      enableSafetyRule: mockEnableSafetyRule,
      disableSafetyRule: mockDisableSafetyRule,
      addCustomBlockedPattern: mockAddCustomBlockedPattern,
      removeCustomBlockedPattern: mockRemoveCustomBlockedPattern,
      addCustomAllowedPattern: mockAddCustomAllowedPattern,
      removeCustomAllowedPattern: mockRemoveCustomAllowedPattern,
      setExternalReviewConfig: mockSetExternalReviewConfig,
      setLogSafetyEvents: mockSetLogSafetyEvents,
      setShowSafetyWarnings: mockSetShowSafetyWarnings,
      resetSafetyModeSettings: mockResetSafetyModeSettings,
    };
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(mockStore);

    render(<SafetySettings />);
    
    await waitFor(() => {
      const toggle = screen.getAllByRole('switch').find(
        (el) => el.parentElement?.textContent?.includes('User Messages')
      );
      if (toggle) fireEvent.click(toggle);
    });
    
    await waitFor(() => {
      expect(mockSetCheckUserInput).toHaveBeenCalled();
    });
  });

  it('should show custom patterns section when enabled', async () => {
    const mockStore = {
      safetyModeSettings: { ...defaultSafetyModeSettings, enabled: true },
      setSafetyModeEnabled: mockSetSafetyModeEnabled,
      setSafetyMode: mockSetSafetyMode,
      setCheckUserInput: mockSetCheckUserInput,
      setCheckSystemPrompt: mockSetCheckSystemPrompt,
      setCheckToolCalls: mockSetCheckToolCalls,
      setBlockDangerousCommands: mockSetBlockDangerousCommands,
      addSafetyRule: mockAddSafetyRule,
      removeSafetyRule: mockRemoveSafetyRule,
      enableSafetyRule: mockEnableSafetyRule,
      disableSafetyRule: mockDisableSafetyRule,
      addCustomBlockedPattern: mockAddCustomBlockedPattern,
      removeCustomBlockedPattern: mockRemoveCustomBlockedPattern,
      addCustomAllowedPattern: mockAddCustomAllowedPattern,
      removeCustomAllowedPattern: mockRemoveCustomAllowedPattern,
      setExternalReviewConfig: mockSetExternalReviewConfig,
      setLogSafetyEvents: mockSetLogSafetyEvents,
      setShowSafetyWarnings: mockSetShowSafetyWarnings,
      resetSafetyModeSettings: mockResetSafetyModeSettings,
    };
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(mockStore);

    render(<SafetySettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Custom Patterns')).toBeInTheDocument();
      expect(screen.getByText('Blocked Patterns')).toBeInTheDocument();
      expect(screen.getByText('Allowed Patterns (Whitelist)')).toBeInTheDocument();
    });
  });

  it('should add custom blocked pattern', async () => {
    const mockStore = {
      safetyModeSettings: { ...defaultSafetyModeSettings, enabled: true },
      setSafetyModeEnabled: mockSetSafetyModeEnabled,
      setSafetyMode: mockSetSafetyMode,
      setCheckUserInput: mockSetCheckUserInput,
      setCheckSystemPrompt: mockSetCheckSystemPrompt,
      setCheckToolCalls: mockSetCheckToolCalls,
      setBlockDangerousCommands: mockSetBlockDangerousCommands,
      addSafetyRule: mockAddSafetyRule,
      removeSafetyRule: mockRemoveSafetyRule,
      enableSafetyRule: mockEnableSafetyRule,
      disableSafetyRule: mockDisableSafetyRule,
      addCustomBlockedPattern: mockAddCustomBlockedPattern,
      removeCustomBlockedPattern: mockRemoveCustomBlockedPattern,
      addCustomAllowedPattern: mockAddCustomAllowedPattern,
      removeCustomAllowedPattern: mockRemoveCustomAllowedPattern,
      setExternalReviewConfig: mockSetExternalReviewConfig,
      setLogSafetyEvents: mockSetLogSafetyEvents,
      setShowSafetyWarnings: mockSetShowSafetyWarnings,
      resetSafetyModeSettings: mockResetSafetyModeSettings,
    };
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(mockStore);

    render(<SafetySettings />);
    
    await waitFor(() => {
      const input = screen.getByPlaceholderText('Enter pattern to block...');
      fireEvent.change(input, { target: { value: 'test-pattern' } });
      
      const addButton = screen.getByRole('button', { name: '' });
      fireEvent.click(addButton);
    });
    
    await waitFor(() => {
      expect(mockAddCustomBlockedPattern).toHaveBeenCalledWith('test-pattern');
    });
  });

  it('should add custom allowed pattern', async () => {
    const mockStore = {
      safetyModeSettings: { ...defaultSafetyModeSettings, enabled: true },
      setSafetyModeEnabled: mockSetSafetyModeEnabled,
      setSafetyMode: mockSetSafetyMode,
      setCheckUserInput: mockSetCheckUserInput,
      setCheckSystemPrompt: mockSetCheckSystemPrompt,
      setCheckToolCalls: mockSetCheckToolCalls,
      setBlockDangerousCommands: mockSetBlockDangerousCommands,
      addSafetyRule: mockAddSafetyRule,
      removeSafetyRule: mockRemoveSafetyRule,
      enableSafetyRule: mockEnableSafetyRule,
      disableSafetyRule: mockDisableSafetyRule,
      addCustomBlockedPattern: mockAddCustomBlockedPattern,
      removeCustomBlockedPattern: mockRemoveCustomBlockedPattern,
      addCustomAllowedPattern: mockAddCustomAllowedPattern,
      removeCustomAllowedPattern: mockRemoveCustomAllowedPattern,
      setExternalReviewConfig: mockSetExternalReviewConfig,
      setLogSafetyEvents: mockSetLogSafetyEvents,
      setShowSafetyWarnings: mockSetShowSafetyWarnings,
      resetSafetyModeSettings: mockResetSafetyModeSettings,
    };
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(mockStore);

    render(<SafetySettings />);
    
    await waitFor(() => {
      const input = screen.getByPlaceholderText('Enter pattern to allow...');
      fireEvent.change(input, { target: { value: 'safe-pattern' } });
      
      const addButton = screen.getAllByRole('button').find(
        (el) => el.querySelector('svg') && el.parentElement?.parentElement?.querySelector('input')?.placeholder?.includes('allow')
      );
      if (addButton) fireEvent.click(addButton);
    });
    
    await waitFor(() => {
      expect(mockAddCustomAllowedPattern).toHaveBeenCalledWith('safe-pattern');
    });
  });

  it('should show safety rules section when enabled', async () => {
    const mockStore = {
      safetyModeSettings: { ...defaultSafetyModeSettings, enabled: true },
      setSafetyModeEnabled: mockSetSafetyModeEnabled,
      setSafetyMode: mockSetSafetyMode,
      setCheckUserInput: mockSetCheckUserInput,
      setCheckSystemPrompt: mockSetCheckSystemPrompt,
      setCheckToolCalls: mockSetCheckToolCalls,
      setBlockDangerousCommands: mockSetBlockDangerousCommands,
      addSafetyRule: mockAddSafetyRule,
      removeSafetyRule: mockRemoveSafetyRule,
      enableSafetyRule: mockEnableSafetyRule,
      disableSafetyRule: mockDisableSafetyRule,
      addCustomBlockedPattern: mockAddCustomBlockedPattern,
      removeCustomBlockedPattern: mockRemoveCustomBlockedPattern,
      addCustomAllowedPattern: mockAddCustomAllowedPattern,
      removeCustomAllowedPattern: mockRemoveCustomAllowedPattern,
      setExternalReviewConfig: mockSetExternalReviewConfig,
      setLogSafetyEvents: mockSetLogSafetyEvents,
      setShowSafetyWarnings: mockSetShowSafetyWarnings,
      resetSafetyModeSettings: mockResetSafetyModeSettings,
    };
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(mockStore);

    render(<SafetySettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Safety Rules')).toBeInTheDocument();
    });
  });

  it('should add safety rule', async () => {
    const mockStore = {
      safetyModeSettings: { ...defaultSafetyModeSettings, enabled: true },
      setSafetyModeEnabled: mockSetSafetyModeEnabled,
      setSafetyMode: mockSetSafetyMode,
      setCheckUserInput: mockSetCheckUserInput,
      setCheckSystemPrompt: mockSetCheckSystemPrompt,
      setCheckToolCalls: mockSetCheckToolCalls,
      setBlockDangerousCommands: mockSetBlockDangerousCommands,
      addSafetyRule: mockAddSafetyRule,
      removeSafetyRule: mockRemoveSafetyRule,
      enableSafetyRule: mockEnableSafetyRule,
      disableSafetyRule: mockDisableSafetyRule,
      addCustomBlockedPattern: mockAddCustomBlockedPattern,
      removeCustomBlockedPattern: mockRemoveCustomBlockedPattern,
      addCustomAllowedPattern: mockAddCustomAllowedPattern,
      removeCustomAllowedPattern: mockRemoveCustomAllowedPattern,
      setExternalReviewConfig: mockSetExternalReviewConfig,
      setLogSafetyEvents: mockSetLogSafetyEvents,
      setShowSafetyWarnings: mockSetShowSafetyWarnings,
      resetSafetyModeSettings: mockResetSafetyModeSettings,
    };
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(mockStore);

    render(<SafetySettings />);
    
    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('e.g., Block SQL Injection');
      fireEvent.change(nameInput, { target: { value: 'Test Rule' } });
      
      const patternInput = screen.getByPlaceholderText('e.g., /\\b(SELECT|INSERT|UPDATE|DELETE)\\b/gi');
      fireEvent.change(patternInput, { target: { value: 'test.*pattern' } });
      
      const addButton = screen.getByRole('button', { name: /Add Rule/i });
      fireEvent.click(addButton);
    });
    
    await waitFor(() => {
      expect(mockAddSafetyRule).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Rule',
          pattern: 'test.*pattern',
        })
      );
    });
  });

  it('should show external review API section when enabled', async () => {
    const mockStore = {
      safetyModeSettings: { ...defaultSafetyModeSettings, enabled: true },
      setSafetyModeEnabled: mockSetSafetyModeEnabled,
      setSafetyMode: mockSetSafetyMode,
      setCheckUserInput: mockSetCheckUserInput,
      setCheckSystemPrompt: mockSetCheckSystemPrompt,
      setCheckToolCalls: mockSetCheckToolCalls,
      setBlockDangerousCommands: mockSetBlockDangerousCommands,
      addSafetyRule: mockAddSafetyRule,
      removeSafetyRule: mockRemoveSafetyRule,
      enableSafetyRule: mockEnableSafetyRule,
      disableSafetyRule: mockDisableSafetyRule,
      addCustomBlockedPattern: mockAddCustomBlockedPattern,
      removeCustomBlockedPattern: mockRemoveCustomBlockedPattern,
      addCustomAllowedPattern: mockAddCustomAllowedPattern,
      removeCustomAllowedPattern: mockRemoveCustomAllowedPattern,
      setExternalReviewConfig: mockSetExternalReviewConfig,
      setLogSafetyEvents: mockSetLogSafetyEvents,
      setShowSafetyWarnings: mockSetShowSafetyWarnings,
      resetSafetyModeSettings: mockResetSafetyModeSettings,
    };
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(mockStore);

    render(<SafetySettings />);
    
    await waitFor(() => {
      expect(screen.getByText('External Review API')).toBeInTheDocument();
    });
  });

  it('should enable external review API', async () => {
    const mockStore = {
      safetyModeSettings: { ...defaultSafetyModeSettings, enabled: true },
      setSafetyModeEnabled: mockSetSafetyModeEnabled,
      setSafetyMode: mockSetSafetyMode,
      setCheckUserInput: mockSetCheckUserInput,
      setCheckSystemPrompt: mockSetCheckSystemPrompt,
      setCheckToolCalls: mockSetCheckToolCalls,
      setBlockDangerousCommands: mockSetBlockDangerousCommands,
      addSafetyRule: mockAddSafetyRule,
      removeSafetyRule: mockRemoveSafetyRule,
      enableSafetyRule: mockEnableSafetyRule,
      disableSafetyRule: mockDisableSafetyRule,
      addCustomBlockedPattern: mockAddCustomBlockedPattern,
      removeCustomBlockedPattern: mockRemoveCustomBlockedPattern,
      addCustomAllowedPattern: mockAddCustomAllowedPattern,
      removeCustomAllowedPattern: mockRemoveCustomAllowedPattern,
      setExternalReviewConfig: mockSetExternalReviewConfig,
      setLogSafetyEvents: mockSetLogSafetyEvents,
      setShowSafetyWarnings: mockSetShowSafetyWarnings,
      resetSafetyModeSettings: mockResetSafetyModeSettings,
    };
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(mockStore);

    render(<SafetySettings />);
    
    await waitFor(() => {
      const toggle = screen.getAllByRole('switch').find(
        (el) => el.parentElement?.textContent?.includes('Enable External Review')
      );
      if (toggle) fireEvent.click(toggle);
    });
    
    await waitFor(() => {
      expect(mockSetExternalReviewConfig).toHaveBeenCalledWith({ enabled: true });
    });
  });

  it('should update external review API endpoint', async () => {
    const mockStore = {
      safetyModeSettings: {
        ...defaultSafetyModeSettings,
        enabled: true,
        externalReview: { ...defaultSafetyModeSettings.externalReview, enabled: true },
      },
      setSafetyModeEnabled: mockSetSafetyModeEnabled,
      setSafetyMode: mockSetSafetyMode,
      setCheckUserInput: mockSetCheckUserInput,
      setCheckSystemPrompt: mockSetCheckSystemPrompt,
      setCheckToolCalls: mockSetCheckToolCalls,
      setBlockDangerousCommands: mockSetBlockDangerousCommands,
      addSafetyRule: mockAddSafetyRule,
      removeSafetyRule: mockRemoveSafetyRule,
      enableSafetyRule: mockEnableSafetyRule,
      disableSafetyRule: mockDisableSafetyRule,
      addCustomBlockedPattern: mockAddCustomBlockedPattern,
      removeCustomBlockedPattern: mockRemoveCustomBlockedPattern,
      addCustomAllowedPattern: mockAddCustomAllowedPattern,
      removeCustomAllowedPattern: mockRemoveCustomAllowedPattern,
      setExternalReviewConfig: mockSetExternalReviewConfig,
      setLogSafetyEvents: mockSetLogSafetyEvents,
      setShowSafetyWarnings: mockSetShowSafetyWarnings,
      resetSafetyModeSettings: mockResetSafetyModeSettings,
    };
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(mockStore);

    render(<SafetySettings />);
    
    await waitFor(() => {
      const input = screen.getByPlaceholderText('https://api.example.com/review');
      fireEvent.change(input, { target: { value: 'https://test.api.com/review' } });
    });
    
    await waitFor(() => {
      expect(mockSetExternalReviewConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'https://test.api.com/review',
        })
      );
    });
  });

  it('should call resetSafetyModeSettings when reset button is clicked', async () => {
    const mockStore = {
      safetyModeSettings: { ...defaultSafetyModeSettings, enabled: true },
      setSafetyModeEnabled: mockSetSafetyModeEnabled,
      setSafetyMode: mockSetSafetyMode,
      setCheckUserInput: mockSetCheckUserInput,
      setCheckSystemPrompt: mockSetCheckSystemPrompt,
      setCheckToolCalls: mockSetCheckToolCalls,
      setBlockDangerousCommands: mockSetBlockDangerousCommands,
      addSafetyRule: mockAddSafetyRule,
      removeSafetyRule: mockRemoveSafetyRule,
      enableSafetyRule: mockEnableSafetyRule,
      disableSafetyRule: mockDisableSafetyRule,
      addCustomBlockedPattern: mockAddCustomBlockedPattern,
      removeCustomBlockedPattern: mockRemoveCustomBlockedPattern,
      addCustomAllowedPattern: mockAddCustomAllowedPattern,
      removeCustomAllowedPattern: mockRemoveCustomAllowedPattern,
      setExternalReviewConfig: mockSetExternalReviewConfig,
      setLogSafetyEvents: mockSetLogSafetyEvents,
      setShowSafetyWarnings: mockSetShowSafetyWarnings,
      resetSafetyModeSettings: mockResetSafetyModeSettings,
    };
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(mockStore);

    render(<SafetySettings />);
    
    await waitFor(() => {
      const resetButton = screen.getByRole('button', { name: /Reset to Defaults/i });
      fireEvent.click(resetButton);
    });
    
    await waitFor(() => {
      expect(mockResetSafetyModeSettings).toHaveBeenCalled();
    });
  });

  it('should display existing custom blocked patterns', async () => {
    const mockStore = {
      safetyModeSettings: {
        ...defaultSafetyModeSettings,
        enabled: true,
        customBlockedPatterns: ['pattern1', 'pattern2'],
      },
      setSafetyModeEnabled: mockSetSafetyModeEnabled,
      setSafetyMode: mockSetSafetyMode,
      setCheckUserInput: mockSetCheckUserInput,
      setCheckSystemPrompt: mockSetCheckSystemPrompt,
      setCheckToolCalls: mockSetCheckToolCalls,
      setBlockDangerousCommands: mockSetBlockDangerousCommands,
      addSafetyRule: mockAddSafetyRule,
      removeSafetyRule: mockRemoveSafetyRule,
      enableSafetyRule: mockEnableSafetyRule,
      disableSafetyRule: mockDisableSafetyRule,
      addCustomBlockedPattern: mockAddCustomBlockedPattern,
      removeCustomBlockedPattern: mockRemoveCustomBlockedPattern,
      addCustomAllowedPattern: mockAddCustomAllowedPattern,
      removeCustomAllowedPattern: mockRemoveCustomAllowedPattern,
      setExternalReviewConfig: mockSetExternalReviewConfig,
      setLogSafetyEvents: mockSetLogSafetyEvents,
      setShowSafetyWarnings: mockSetShowSafetyWarnings,
      resetSafetyModeSettings: mockResetSafetyModeSettings,
    };
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(mockStore);

    render(<SafetySettings />);
    
    await waitFor(() => {
      expect(screen.getByText('pattern1')).toBeInTheDocument();
      expect(screen.getByText('pattern2')).toBeInTheDocument();
    });
  });

  it('should display existing custom allowed patterns', async () => {
    const mockStore = {
      safetyModeSettings: {
        ...defaultSafetyModeSettings,
        enabled: true,
        customAllowedPatterns: ['safe1', 'safe2'],
      },
      setSafetyModeEnabled: mockSetSafetyModeEnabled,
      setSafetyMode: mockSetSafetyMode,
      setCheckUserInput: mockSetCheckUserInput,
      setCheckSystemPrompt: mockSetCheckSystemPrompt,
      setCheckToolCalls: mockSetCheckToolCalls,
      setBlockDangerousCommands: mockSetBlockDangerousCommands,
      addSafetyRule: mockAddSafetyRule,
      removeSafetyRule: mockRemoveSafetyRule,
      enableSafetyRule: mockEnableSafetyRule,
      disableSafetyRule: mockDisableSafetyRule,
      addCustomBlockedPattern: mockAddCustomBlockedPattern,
      removeCustomBlockedPattern: mockRemoveCustomBlockedPattern,
      addCustomAllowedPattern: mockAddCustomAllowedPattern,
      removeCustomAllowedPattern: mockRemoveCustomAllowedPattern,
      setExternalReviewConfig: mockSetExternalReviewConfig,
      setLogSafetyEvents: mockSetLogSafetyEvents,
      setShowSafetyWarnings: mockSetShowSafetyWarnings,
      resetSafetyModeSettings: mockResetSafetyModeSettings,
    };
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(mockStore);

    render(<SafetySettings />);
    
    await waitFor(() => {
      expect(screen.getByText('safe1')).toBeInTheDocument();
      expect(screen.getByText('safe2')).toBeInTheDocument();
    });
  });

  it('should display existing safety rules', async () => {
    const mockStore = {
      safetyModeSettings: {
        ...defaultSafetyModeSettings,
        enabled: true,
        rules: [
          {
            id: '1',
            name: 'Rule 1',
            pattern: 'test.*pattern',
            type: ['input', 'system'],
            severity: 'high' as const,
            description: 'Test rule',
            enabled: true,
          },
        ],
      },
      setSafetyModeEnabled: mockSetSafetyModeEnabled,
      setSafetyMode: mockSetSafetyMode,
      setCheckUserInput: mockSetCheckUserInput,
      setCheckSystemPrompt: mockSetCheckSystemPrompt,
      setCheckToolCalls: mockSetCheckToolCalls,
      setBlockDangerousCommands: mockSetBlockDangerousCommands,
      addSafetyRule: mockAddSafetyRule,
      removeSafetyRule: mockRemoveSafetyRule,
      enableSafetyRule: mockEnableSafetyRule,
      disableSafetyRule: mockDisableSafetyRule,
      addCustomBlockedPattern: mockAddCustomBlockedPattern,
      removeCustomBlockedPattern: mockRemoveCustomBlockedPattern,
      addCustomAllowedPattern: mockAddCustomAllowedPattern,
      removeCustomAllowedPattern: mockRemoveCustomAllowedPattern,
      setExternalReviewConfig: mockSetExternalReviewConfig,
      setLogSafetyEvents: mockSetLogSafetyEvents,
      setShowSafetyWarnings: mockSetShowSafetyWarnings,
      resetSafetyModeSettings: mockResetSafetyModeSettings,
    };
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(mockStore);

    render(<SafetySettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Rule 1')).toBeInTheDocument();
      expect(screen.getByText('Test rule')).toBeInTheDocument();
    });
  });

  it('should remove custom blocked pattern', async () => {
    const mockStore = {
      safetyModeSettings: {
        ...defaultSafetyModeSettings,
        enabled: true,
        customBlockedPatterns: ['pattern1'],
      },
      setSafetyModeEnabled: mockSetSafetyModeEnabled,
      setSafetyMode: mockSetSafetyMode,
      setCheckUserInput: mockSetCheckUserInput,
      setCheckSystemPrompt: mockSetCheckSystemPrompt,
      setCheckToolCalls: mockSetCheckToolCalls,
      setBlockDangerousCommands: mockSetBlockDangerousCommands,
      addSafetyRule: mockAddSafetyRule,
      removeSafetyRule: mockRemoveSafetyRule,
      enableSafetyRule: mockEnableSafetyRule,
      disableSafetyRule: mockDisableSafetyRule,
      addCustomBlockedPattern: mockAddCustomBlockedPattern,
      removeCustomBlockedPattern: mockRemoveCustomBlockedPattern,
      addCustomAllowedPattern: mockAddCustomAllowedPattern,
      removeCustomAllowedPattern: mockRemoveCustomAllowedPattern,
      setExternalReviewConfig: mockSetExternalReviewConfig,
      setLogSafetyEvents: mockSetLogSafetyEvents,
      setShowSafetyWarnings: mockSetShowSafetyWarnings,
      resetSafetyModeSettings: mockResetSafetyModeSettings,
    };
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(mockStore);

    render(<SafetySettings />);
    
    await waitFor(() => {
      const removeButton = screen.getByRole('button', { name: '' });
      fireEvent.click(removeButton);
    });
    
    await waitFor(() => {
      expect(mockRemoveCustomBlockedPattern).toHaveBeenCalledWith('pattern1');
    });
  });
});
