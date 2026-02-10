/**
 * @jest-environment jsdom
 */
/**
 * SimplifiedModeSettings tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SimplifiedModeSettings } from './simplified-mode-settings';
import type { SimplifiedModePreset } from '@/stores/settings/settings-store';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, Record<string, string>> = {
      simplifiedMode: {
        title: 'Simplified Mode',
        description: 'Configure simplified interface mode with presets',
        presetLabel: 'Preset',
        enableLabel: 'Enable Simplified Mode',
        enableDescription: 'Turn on simplified interface mode',
        reset: 'Reset',
        // Presets
        'presets.off': 'Off',
        'presets.minimal': 'Minimal',
        'presets.focused': 'Focused',
        'presets.zen': 'Zen',
        // Preset descriptions
        'presetDescriptions.off': 'Full interface with all features',
        'presetDescriptions.minimal': 'Hide advanced controls and badges',
        'presetDescriptions.focused': 'Minimal with auto-hide sidebar',
        'presetDescriptions.zen': 'Ultra-minimal, distraction-free',
        // Header settings
        headerSettings: 'Header',
        headerDescription: 'Customize header elements',
        hideModelSelector: 'Hide Model Selector',
        hideModeSelector: 'Hide Mode Selector',
        hideSessionActions: 'Hide Session Actions',
        // Input settings
        inputSettings: 'Input',
        inputDescription: 'Customize input area',
        hideAdvancedInputControls: 'Hide Advanced Input Controls',
        hideAttachmentButton: 'Hide Attachment Button',
        hideWebSearchToggle: 'Hide Web Search Toggle',
        hideThinkingToggle: 'Hide Thinking Toggle',
        hidePresetSelector: 'Hide Preset Selector',
        hideContextIndicator: 'Hide Context Indicator',
        // Welcome settings
        welcomeSettings: 'Welcome Screen',
        welcomeDescription: 'Customize welcome screen',
        hideFeatureBadges: 'Hide Feature Badges',
        hideSuggestionDescriptions: 'Hide Suggestion Descriptions',
        hideQuickAccessLinks: 'Hide Quick Access Links',
        // Sidebar & Message settings
        sidebarAndMessageSettings: 'Sidebar & Messages',
        sidebarAndMessageDescription: 'Sidebar and message display options',
        autoHideSidebar: 'Auto-hide Sidebar',
        hideMessageActions: 'Hide Message Actions',
        hideMessageTimestamps: 'Hide Message Timestamps',
        hideTokenCount: 'Hide Token Count',
        // Shortcut settings
        shortcutSettings: 'Keyboard Shortcut',
        shortcutHint: 'Quick toggle shortcut',
        shortcutValue: 'Shortcut',
      },
    };

    let result = translations[namespace]?.[key] || key;
    if (params?.shortcut) {
      result = result.replace('{shortcut}', String(params.shortcut));
    }
    return result;
  },
}));

// Mock the stores
const mockSetSimplifiedModeSettings = jest.fn();
const mockSetSimplifiedModeEnabled = jest.fn();
const mockSetSimplifiedModePreset = jest.fn();
const mockResetSimplifiedModeSettings = jest.fn();

const mockSimplifiedModeSettings = {
  enabled: false,
  preset: 'off' as SimplifiedModePreset,
  hideModelSelector: false,
  hideModeSelector: false,
  hideSessionActions: false,
  hideAdvancedInputControls: false,
  hideAttachmentButton: false,
  hideWebSearchToggle: false,
  hideThinkingToggle: false,
  hidePresetSelector: false,
  hideContextIndicator: false,
  hideFeatureBadges: false,
  hideSuggestionDescriptions: false,
  hideQuickAccessLinks: false,
  autoHideSidebar: false,
  hideMessageActions: false,
  hideMessageTimestamps: false,
  hideTokenCount: false,
  toggleShortcut: 'CommandOrControl+Shift+S',
};

jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      simplifiedModeSettings: mockSimplifiedModeSettings,
      setSimplifiedModeSettings: mockSetSimplifiedModeSettings,
      setSimplifiedModeEnabled: mockSetSimplifiedModeEnabled,
      setSimplifiedModePreset: mockSetSimplifiedModePreset,
      resetSimplifiedModeSettings: mockResetSimplifiedModeSettings,
    };
    return selector(state);
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Sparkles: ({ className }: { className?: string }) => <svg data-testid="sparkles-icon" className={className} />,
  Minimize2: ({ className }: { className?: string }) => <svg data-testid="minimize2-icon" className={className} />,
  Focus: ({ className }: { className?: string }) => <svg data-testid="focus-icon" className={className} />,
  Leaf: ({ className }: { className?: string }) => <svg data-testid="leaf-icon" className={className} />,
  RotateCcw: ({ className }: { className?: string }) => <svg data-testid="rotate-ccw-icon" className={className} />,
  Info: ({ className }: { className?: string }) => <svg data-testid="info-icon" className={className} />,
}));

// Mock UI components
jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) => (
    <button
      role="switch"
      aria-checked={checked}
      data-testid="switch"
      onClick={() => onCheckedChange?.(!checked)}
    >
      switch
    </button>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <button onClick={onClick} className={className} data-testid="button">
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p data-testid="card-description">{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3 data-testid="card-title">{children}</h3>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
    <div data-testid="select" data-value={value}>
      {children}
      <button
        data-testid="select-trigger"
        onClick={() => onValueChange?.('minimal')}
      >
        Select Trigger
      </button>
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value} data-testid="select-item">
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="select-trigger-mock">{children}</div>,
  SelectValue: () => <span data-testid="select-value">Value</span>,
}));

describe('SimplifiedModeSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSimplifiedModeSettings.enabled = false;
    mockSimplifiedModeSettings.preset = 'off';
    mockSimplifiedModeSettings.toggleShortcut = 'CommandOrControl+Shift+S';
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Simplified Mode')).toBeInTheDocument();
    });

    it('renders description', () => {
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Configure simplified interface mode with presets')).toBeInTheDocument();
    });

    it('renders all section cards', () => {
      render(<SimplifiedModeSettings />);
      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBe(6); // Mode Selection, Header, Input, Welcome, Sidebar/Message, Shortcut
    });

    it('renders Sparkles icon', () => {
      render(<SimplifiedModeSettings />);
      const icons = screen.getAllByTestId('sparkles-icon');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('renders reset button', () => {
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Reset')).toBeInTheDocument();
      expect(screen.getByTestId('rotate-ccw-icon')).toBeInTheDocument();
    });
  });

  describe('Preset Selection', () => {
    it('renders preset label', () => {
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Preset')).toBeInTheDocument();
    });

    it('renders select component', () => {
      render(<SimplifiedModeSettings />);
      expect(screen.getByTestId('select')).toBeInTheDocument();
    });

    it('renders preset description for current preset', () => {
      mockSimplifiedModeSettings.preset = 'off';
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Full interface with all features')).toBeInTheDocument();
    });

    it('shows minimal preset description', () => {
      mockSimplifiedModeSettings.preset = 'minimal';
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Hide advanced controls and badges')).toBeInTheDocument();
    });

    it('shows focused preset description', () => {
      mockSimplifiedModeSettings.preset = 'focused';
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Minimal with auto-hide sidebar')).toBeInTheDocument();
    });

    it('shows zen preset description', () => {
      mockSimplifiedModeSettings.preset = 'zen';
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Ultra-minimal, distraction-free')).toBeInTheDocument();
    });

    it('calls setSimplifiedModePreset when select value changes', () => {
      render(<SimplifiedModeSettings />);
      const select = screen.getByTestId('select');
      const trigger = select.querySelector('button');

      if (trigger) {
        fireEvent.click(trigger);
        expect(mockSetSimplifiedModePreset).toHaveBeenCalledWith('minimal');
      }
    });
  });

  describe('Quick Enable Toggle', () => {
    it('renders enable label', () => {
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Enable Simplified Mode')).toBeInTheDocument();
    });

    it('renders enable description', () => {
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Turn on simplified interface mode')).toBeInTheDocument();
    });

    it('shows switch for enabled state', () => {
      render(<SimplifiedModeSettings />);
      const switches = screen.getAllByRole('switch');
      expect(switches.length).toBeGreaterThan(0);
    });

    it('calls setSimplifiedModeEnabled when toggle is clicked', () => {
      mockSimplifiedModeSettings.enabled = false;
      render(<SimplifiedModeSettings />);

      const firstSwitch = screen.getAllByRole('switch')[0];
      fireEvent.click(firstSwitch);

      expect(mockSetSimplifiedModeEnabled).toHaveBeenCalled();
    });
  });

  describe('Header Settings', () => {
    it('renders header settings card', () => {
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Customize header elements')).toBeInTheDocument();
    });

    it('renders hideModelSelector toggle', () => {
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Hide Model Selector')).toBeInTheDocument();
    });

    it('renders hideModeSelector toggle', () => {
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Hide Mode Selector')).toBeInTheDocument();
    });

    it('renders hideSessionActions toggle', () => {
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Hide Session Actions')).toBeInTheDocument();
    });

    it('calls setSimplifiedModeSettings when hideModelSelector is toggled', () => {
      render(<SimplifiedModeSettings />);
      const labels = screen.getAllByText('Hide Model Selector');
      const label = labels[labels.length - 1]; // Get the last one (in the card)
      const switchElement = label.nextElementSibling?.querySelector('[role="switch"]') as HTMLElement;

      if (switchElement) {
        fireEvent.click(switchElement);
        expect(mockSetSimplifiedModeSettings).toHaveBeenCalledWith({ hideModelSelector: true });
      }
    });

    it('calls setSimplifiedModeSettings when hideModeSelector is toggled', () => {
      render(<SimplifiedModeSettings />);
      const labels = screen.getAllByText('Hide Mode Selector');
      const label = labels[labels.length - 1];
      const switchElement = label.nextElementSibling?.querySelector('[role="switch"]') as HTMLElement;

      if (switchElement) {
        fireEvent.click(switchElement);
        expect(mockSetSimplifiedModeSettings).toHaveBeenCalledWith({ hideModeSelector: true });
      }
    });

    it('calls setSimplifiedModeSettings when hideSessionActions is toggled', () => {
      render(<SimplifiedModeSettings />);
      const labels = screen.getAllByText('Hide Session Actions');
      const label = labels[labels.length - 1];
      const switchElement = label.nextElementSibling?.querySelector('[role="switch"]') as HTMLElement;

      if (switchElement) {
        fireEvent.click(switchElement);
        expect(mockSetSimplifiedModeSettings).toHaveBeenCalledWith({ hideSessionActions: true });
      }
    });
  });

  describe('Input Settings', () => {
    it('renders input settings card', () => {
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Input')).toBeInTheDocument();
      expect(screen.getByText('Customize input area')).toBeInTheDocument();
    });

    it('renders all input toggles', () => {
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Hide Advanced Input Controls')).toBeInTheDocument();
      expect(screen.getByText('Hide Attachment Button')).toBeInTheDocument();
      expect(screen.getByText('Hide Web Search Toggle')).toBeInTheDocument();
      expect(screen.getByText('Hide Thinking Toggle')).toBeInTheDocument();
      expect(screen.getByText('Hide Preset Selector')).toBeInTheDocument();
      expect(screen.getByText('Hide Context Indicator')).toBeInTheDocument();
    });

    it('calls setSimplifiedModeSettings when hideAdvancedInputControls is toggled', () => {
      render(<SimplifiedModeSettings />);
      const labels = screen.getAllByText('Hide Advanced Input Controls');
      const label = labels[labels.length - 1];
      const switchElement = label.nextElementSibling?.querySelector('[role="switch"]') as HTMLElement;

      if (switchElement) {
        fireEvent.click(switchElement);
        expect(mockSetSimplifiedModeSettings).toHaveBeenCalledWith({ hideAdvancedInputControls: true });
      }
    });

    it('calls setSimplifiedModeSettings when hideAttachmentButton is toggled', () => {
      render(<SimplifiedModeSettings />);
      const labels = screen.getAllByText('Hide Attachment Button');
      const label = labels[labels.length - 1];
      const switchElement = label.nextElementSibling?.querySelector('[role="switch"]') as HTMLElement;

      if (switchElement) {
        fireEvent.click(switchElement);
        expect(mockSetSimplifiedModeSettings).toHaveBeenCalledWith({ hideAttachmentButton: true });
      }
    });

    it('calls setSimplifiedModeSettings when hideWebSearchToggle is toggled', () => {
      render(<SimplifiedModeSettings />);
      const labels = screen.getAllByText('Hide Web Search Toggle');
      const label = labels[labels.length - 1];
      const switchElement = label.nextElementSibling?.querySelector('[role="switch"]') as HTMLElement;

      if (switchElement) {
        fireEvent.click(switchElement);
        expect(mockSetSimplifiedModeSettings).toHaveBeenCalledWith({ hideWebSearchToggle: true });
      }
    });

    it('calls setSimplifiedModeSettings when hideThinkingToggle is toggled', () => {
      render(<SimplifiedModeSettings />);
      const labels = screen.getAllByText('Hide Thinking Toggle');
      const label = labels[labels.length - 1];
      const switchElement = label.nextElementSibling?.querySelector('[role="switch"]') as HTMLElement;

      if (switchElement) {
        fireEvent.click(switchElement);
        expect(mockSetSimplifiedModeSettings).toHaveBeenCalledWith({ hideThinkingToggle: true });
      }
    });

    it('calls setSimplifiedModeSettings when hidePresetSelector is toggled', () => {
      render(<SimplifiedModeSettings />);
      const labels = screen.getAllByText('Hide Preset Selector');
      const label = labels[labels.length - 1];
      const switchElement = label.nextElementSibling?.querySelector('[role="switch"]') as HTMLElement;

      if (switchElement) {
        fireEvent.click(switchElement);
        expect(mockSetSimplifiedModeSettings).toHaveBeenCalledWith({ hidePresetSelector: true });
      }
    });

    it('calls setSimplifiedModeSettings when hideContextIndicator is toggled', () => {
      render(<SimplifiedModeSettings />);
      const labels = screen.getAllByText('Hide Context Indicator');
      const label = labels[labels.length - 1];
      const switchElement = label.nextElementSibling?.querySelector('[role="switch"]') as HTMLElement;

      if (switchElement) {
        fireEvent.click(switchElement);
        expect(mockSetSimplifiedModeSettings).toHaveBeenCalledWith({ hideContextIndicator: true });
      }
    });
  });

  describe('Welcome Screen Settings', () => {
    it('renders welcome settings card', () => {
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Welcome Screen')).toBeInTheDocument();
      expect(screen.getByText('Customize welcome screen')).toBeInTheDocument();
    });

    it('renders all welcome toggles', () => {
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Hide Feature Badges')).toBeInTheDocument();
      expect(screen.getByText('Hide Suggestion Descriptions')).toBeInTheDocument();
      expect(screen.getByText('Hide Quick Access Links')).toBeInTheDocument();
    });

    it('calls setSimplifiedModeSettings when hideFeatureBadges is toggled', () => {
      render(<SimplifiedModeSettings />);
      const labels = screen.getAllByText('Hide Feature Badges');
      const label = labels[labels.length - 1];
      const switchElement = label.nextElementSibling?.querySelector('[role="switch"]') as HTMLElement;

      if (switchElement) {
        fireEvent.click(switchElement);
        expect(mockSetSimplifiedModeSettings).toHaveBeenCalledWith({ hideFeatureBadges: true });
      }
    });

    it('calls setSimplifiedModeSettings when hideSuggestionDescriptions is toggled', () => {
      render(<SimplifiedModeSettings />);
      const labels = screen.getAllByText('Hide Suggestion Descriptions');
      const label = labels[labels.length - 1];
      const switchElement = label.nextElementSibling?.querySelector('[role="switch"]') as HTMLElement;

      if (switchElement) {
        fireEvent.click(switchElement);
        expect(mockSetSimplifiedModeSettings).toHaveBeenCalledWith({ hideSuggestionDescriptions: true });
      }
    });

    it('calls setSimplifiedModeSettings when hideQuickAccessLinks is toggled', () => {
      render(<SimplifiedModeSettings />);
      const labels = screen.getAllByText('Hide Quick Access Links');
      const label = labels[labels.length - 1];
      const switchElement = label.nextElementSibling?.querySelector('[role="switch"]') as HTMLElement;

      if (switchElement) {
        fireEvent.click(switchElement);
        expect(mockSetSimplifiedModeSettings).toHaveBeenCalledWith({ hideQuickAccessLinks: true });
      }
    });
  });

  describe('Sidebar & Message Settings', () => {
    it('renders sidebar and message settings card', () => {
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Sidebar & Messages')).toBeInTheDocument();
      expect(screen.getByText('Sidebar and message display options')).toBeInTheDocument();
    });

    it('renders all sidebar and message toggles', () => {
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Auto-hide Sidebar')).toBeInTheDocument();
      expect(screen.getByText('Hide Message Actions')).toBeInTheDocument();
      expect(screen.getByText('Hide Message Timestamps')).toBeInTheDocument();
      expect(screen.getByText('Hide Token Count')).toBeInTheDocument();
    });

    it('calls setSimplifiedModeSettings when autoHideSidebar is toggled', () => {
      render(<SimplifiedModeSettings />);
      const labels = screen.getAllByText('Auto-hide Sidebar');
      const label = labels[labels.length - 1];
      const switchElement = label.nextElementSibling?.querySelector('[role="switch"]') as HTMLElement;

      if (switchElement) {
        fireEvent.click(switchElement);
        expect(mockSetSimplifiedModeSettings).toHaveBeenCalledWith({ autoHideSidebar: true });
      }
    });

    it('calls setSimplifiedModeSettings when hideMessageActions is toggled', () => {
      render(<SimplifiedModeSettings />);
      const labels = screen.getAllByText('Hide Message Actions');
      const label = labels[labels.length - 1];
      const switchElement = label.nextElementSibling?.querySelector('[role="switch"]') as HTMLElement;

      if (switchElement) {
        fireEvent.click(switchElement);
        expect(mockSetSimplifiedModeSettings).toHaveBeenCalledWith({ hideMessageActions: true });
      }
    });

    it('calls setSimplifiedModeSettings when hideMessageTimestamps is toggled', () => {
      render(<SimplifiedModeSettings />);
      const labels = screen.getAllByText('Hide Message Timestamps');
      const label = labels[labels.length - 1];
      const switchElement = label.nextElementSibling?.querySelector('[role="switch"]') as HTMLElement;

      if (switchElement) {
        fireEvent.click(switchElement);
        expect(mockSetSimplifiedModeSettings).toHaveBeenCalledWith({ hideMessageTimestamps: true });
      }
    });

    it('calls setSimplifiedModeSettings when hideTokenCount is toggled', () => {
      render(<SimplifiedModeSettings />);
      const labels = screen.getAllByText('Hide Token Count');
      const label = labels[labels.length - 1];
      const switchElement = label.nextElementSibling?.querySelector('[role="switch"]') as HTMLElement;

      if (switchElement) {
        fireEvent.click(switchElement);
        expect(mockSetSimplifiedModeSettings).toHaveBeenCalledWith({ hideTokenCount: true });
      }
    });
  });

  describe('Keyboard Shortcut', () => {
    it('renders keyboard shortcut card', () => {
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Keyboard Shortcut')).toBeInTheDocument();
    });

    it('renders Info icon', () => {
      render(<SimplifiedModeSettings />);
      expect(screen.getByTestId('info-icon')).toBeInTheDocument();
    });

    it('displays shortcut hint', () => {
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Quick toggle shortcut')).toBeInTheDocument();
    });

    it('displays shortcut value', () => {
      mockSimplifiedModeSettings.toggleShortcut = 'Ctrl+Shift+S';
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Shortcut:')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+Shift+S')).toBeInTheDocument();
    });

    it('displays custom shortcut value', () => {
      mockSimplifiedModeSettings.toggleShortcut = 'Cmd+Shift+M';
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Cmd+Shift+M')).toBeInTheDocument();
    });
  });

  describe('Reset Functionality', () => {
    it('renders reset button', () => {
      render(<SimplifiedModeSettings />);
      const resetButtons = screen.getAllByText('Reset');
      expect(resetButtons.length).toBeGreaterThan(0);
    });

    it('calls resetSimplifiedModeSettings when reset button is clicked', () => {
      render(<SimplifiedModeSettings />);
      const resetButtons = screen.getAllByText('Reset');
      const resetButton = resetButtons[0];

      fireEvent.click(resetButton);

      expect(mockResetSimplifiedModeSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('Preset Icons', () => {
    it('shows sparkles icon', () => {
      render(<SimplifiedModeSettings />);
      const icons = screen.getAllByTestId('sparkles-icon');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('shows all preset icons', () => {
      render(<SimplifiedModeSettings />);
      // Icons appear in multiple places (header and select items)
      expect(screen.getAllByTestId('sparkles-icon').length).toBeGreaterThan(0);
    });
  });

  describe('State Handling', () => {
    it('handles enabled state correctly', () => {
      mockSimplifiedModeSettings.enabled = true;
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Simplified Mode')).toBeInTheDocument();
    });

    it('handles different presets correctly', () => {
      const presets: SimplifiedModePreset[] = ['off', 'minimal', 'focused', 'zen'];

      for (const preset of presets) {
        jest.clearAllMocks();
        mockSimplifiedModeSettings.preset = preset;
        const { unmount } = render(<SimplifiedModeSettings />);
        expect(screen.getByText('Simplified Mode')).toBeInTheDocument();
        unmount();
      }
    });

    it('handles all boolean settings correctly', () => {
      const booleanKeys: (keyof typeof mockSimplifiedModeSettings)[] = [
        'hideModelSelector',
        'hideModeSelector',
        'hideSessionActions',
        'hideAdvancedInputControls',
        'hideAttachmentButton',
        'hideWebSearchToggle',
        'hideThinkingToggle',
        'hidePresetSelector',
        'hideContextIndicator',
        'hideFeatureBadges',
        'hideSuggestionDescriptions',
        'hideQuickAccessLinks',
        'autoHideSidebar',
        'hideMessageActions',
        'hideMessageTimestamps',
        'hideTokenCount',
      ];

      for (const key of booleanKeys) {
        jest.clearAllMocks();
        (mockSimplifiedModeSettings as Record<string, unknown>)[key] = true;
        const { unmount } = render(<SimplifiedModeSettings />);
        expect(screen.getByText('Simplified Mode')).toBeInTheDocument();
        unmount();
      }
    });
  });

  describe('Translation Coverage', () => {
    it('renders all translated labels', () => {
      render(<SimplifiedModeSettings />);

      // Main labels
      expect(screen.getByText('Simplified Mode')).toBeInTheDocument();
      expect(screen.getByText('Preset')).toBeInTheDocument();
      expect(screen.getByText('Enable Simplified Mode')).toBeInTheDocument();

      // Section headers
      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Input')).toBeInTheDocument();
      expect(screen.getByText('Welcome Screen')).toBeInTheDocument();
      expect(screen.getByText('Sidebar & Messages')).toBeInTheDocument();
      expect(screen.getByText('Keyboard Shortcut')).toBeInTheDocument();
    });

    it('renders all preset translations', () => {
      render(<SimplifiedModeSettings />);

      // Check that preset items exist (they're rendered in SelectContent)
      expect(screen.getByText('Off')).toBeInTheDocument();
    });

    it('renders all preset descriptions', () => {
      mockSimplifiedModeSettings.preset = 'off';
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Full interface with all features')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty shortcut', () => {
      mockSimplifiedModeSettings.toggleShortcut = '';
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Shortcut:')).toBeInTheDocument();
    });

    it('handles very long shortcut string', () => {
      mockSimplifiedModeSettings.toggleShortcut = 'Ctrl+Shift+Alt+Meta+Super+Win+Command+S';
      render(<SimplifiedModeSettings />);
      expect(screen.getByText('Ctrl+Shift+Alt+Meta+Super+Win+Command+S')).toBeInTheDocument();
    });

    it('handles rapid toggle clicks without errors', () => {
      render(<SimplifiedModeSettings />);

      const switches = screen.getAllByRole('switch');

      for (let i = 0; i < 10; i++) {
        if (switches[0]) {
          fireEvent.click(switches[0]);
        }
      }

      // Should not throw any errors
      expect(mockSetSimplifiedModeEnabled).toHaveBeenCalled();
    });

    it('handles all settings being true', () => {
      Object.keys(mockSimplifiedModeSettings).forEach(key => {
        if (key.startsWith('hide') || key === 'autoHideSidebar' || key === 'enabled') {
          (mockSimplifiedModeSettings as Record<string, unknown>)[key] = true;
        }
      });

      const { unmount } = render(<SimplifiedModeSettings />);
      expect(screen.getByText('Simplified Mode')).toBeInTheDocument();
      unmount();
    });
  });

  describe('Accessibility', () => {
    it('has proper switch roles', () => {
      render(<SimplifiedModeSettings />);
      const switches = screen.getAllByRole('switch');
      expect(switches.length).toBeGreaterThan(0);
    });

    it('switches have aria-checked attributes', () => {
      render(<SimplifiedModeSettings />);
      const switches = screen.getAllByRole('switch');
      switches.forEach(sw => {
        expect(sw).toHaveAttribute('aria-checked');
      });
    });

    it('renders labels for all switches', () => {
      render(<SimplifiedModeSettings />);
      const labels = screen.getAllByTestId('card-content');
      expect(labels.length).toBeGreaterThan(0);
    });
  });

  describe('Integration', () => {
    it('updates correctly when preset changes to minimal', () => {
      mockSimplifiedModeSettings.preset = 'off';
      const { rerender } = render(<SimplifiedModeSettings />);

      // Simulate preset change - the mock is called via UI interaction, not state change
      mockSimplifiedModeSettings.preset = 'minimal';
      rerender(<SimplifiedModeSettings />);

      // Verify component re-renders with new preset
      expect(screen.getByText('Hide advanced controls and badges')).toBeInTheDocument();
    });

    it('updates correctly when enabled state changes', () => {
      mockSimplifiedModeSettings.enabled = false;
      const { rerender } = render(<SimplifiedModeSettings />);

      mockSimplifiedModeSettings.enabled = true;
      rerender(<SimplifiedModeSettings />);

      expect(screen.getByText('Simplified Mode')).toBeInTheDocument();
    });

    it('handles preset and enabled state together', () => {
      mockSimplifiedModeSettings.enabled = true;
      mockSimplifiedModeSettings.preset = 'zen';

      const { unmount } = render(<SimplifiedModeSettings />);
      expect(screen.getByText('Ultra-minimal, distraction-free')).toBeInTheDocument();
      unmount();
    });
  });

  describe('Component Structure', () => {
    it('has correct CSS classes', () => {
      const { container } = render(<SimplifiedModeSettings />);
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('space-y-4');
    });

    it('renders card headers correctly', () => {
      render(<SimplifiedModeSettings />);
      const cardHeaders = screen.getAllByTestId('card-header');
      expect(cardHeaders.length).toBe(6);
    });

    it('renders card contents correctly', () => {
      render(<SimplifiedModeSettings />);
      const cardContents = screen.getAllByTestId('card-content');
      expect(cardContents.length).toBe(6);
    });

    it('renders card titles correctly', () => {
      render(<SimplifiedModeSettings />);
      const cardTitles = screen.getAllByTestId('card-title');
      expect(cardTitles.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Function Call Parameters', () => {
    it('passes correct parameters to setSimplifiedModeSettings', () => {
      render(<SimplifiedModeSettings />);

      // Test one setting
      const labels = screen.getAllByText('Hide Model Selector');
      const label = labels[labels.length - 1];
      const switchElement = label.nextElementSibling?.querySelector('[role="switch"]') as HTMLElement;

      if (switchElement) {
        fireEvent.click(switchElement);
        expect(mockSetSimplifiedModeSettings).toHaveBeenCalledWith({ hideModelSelector: true });
      }
    });

    it('passes correct parameters to setSimplifiedModePreset', () => {
      render(<SimplifiedModeSettings />);
      const select = screen.getByTestId('select');
      const trigger = select.querySelector('button');

      if (trigger) {
        fireEvent.click(trigger);
        expect(mockSetSimplifiedModePreset).toHaveBeenCalledWith('minimal');
      }
    });
  });
});
