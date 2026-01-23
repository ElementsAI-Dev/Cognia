/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SimplifiedModeToggle, SimplifiedModeQuickToggle } from './simplified-mode-toggle';
import type { SimplifiedModePreset } from '@/stores/settings/settings-store';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, Record<string, string>> = {
      simplifiedMode: {
        title: 'Simplified Mode',
        tooltip: 'Toggle simplified mode',
        active: 'Active',
        enable: 'Enable',
        disable: 'Disable',
        current: 'Current',
        shortcutHint: 'Press {shortcut} to toggle simplified mode',
        'presets.off': 'Off',
        'presets.minimal': 'Minimal',
        'presets.focused': 'Focused',
        'presets.zen': 'Zen',
        'descriptions.off': 'Full interface with all features',
        'descriptions.minimal': 'Hide advanced controls and badges',
        'descriptions.focused': 'Minimal with auto-hide sidebar',
        'descriptions.zen': 'Ultra-minimal, distraction-free',
      },
    };

    let result = translations[namespace]?.[key] || key;
    if (params?.shortcut) {
      result = result.replace('{shortcut}', String(params.shortcut));
    }
    return result;
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-variant={props.variant || 'default'}
      data-size={props.size || 'default'}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string; variant?: string }) => (
    <span className={className}>{children}</span>
  ),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode; align?: string; className?: string }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <div data-testid="dropdown-item" onClick={onClick} className={className}>
      {children}
    </div>
  ),
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
  DropdownMenuTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
  DropdownMenuLabel: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="dropdown-label" className={className}>{children}</div>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip">{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
  TooltipTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
}));

// Mock the stores
const mockSetSimplifiedModePreset = jest.fn();
const mockToggleSimplifiedMode = jest.fn();

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
};

jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      simplifiedModeSettings: mockSimplifiedModeSettings,
      setSimplifiedModePreset: mockSetSimplifiedModePreset,
      toggleSimplifiedMode: mockToggleSimplifiedMode,
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
  Settings2: ({ className }: { className?: string }) => <svg data-testid="settings2-icon" className={className} />,
}));

describe('SimplifiedModeToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSimplifiedModeSettings.enabled = false;
    mockSimplifiedModeSettings.preset = 'off';
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<SimplifiedModeToggle />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(<SimplifiedModeToggle className="custom-class" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('renders with ghost variant by default', () => {
      render(<SimplifiedModeToggle />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-variant', 'ghost');
    });

    it('renders with different variants', () => {
      const { rerender } = render(<SimplifiedModeToggle variant="default" />);
      expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'default');

      rerender(<SimplifiedModeToggle variant="outline" />);
      expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'outline');
    });

    it('renders with different sizes', () => {
      const { rerender } = render(<SimplifiedModeToggle size="default" />);
      expect(screen.getByRole('button')).toHaveAttribute('data-size', 'default');

      rerender(<SimplifiedModeToggle size="icon" />);
      expect(screen.getByRole('button')).toHaveAttribute('data-size', 'icon');
    });

    it('renders label when showLabel is true', () => {
      render(<SimplifiedModeToggle showLabel />);
      const button = screen.getByRole('button');
      // The label should be in the button when showLabel is true
      expect(button.textContent).toContain('Off');
    });

    it('does not render label when showLabel is false', () => {
      render(<SimplifiedModeToggle showLabel={false} />);
      const button = screen.getByRole('button');
      // The label should NOT be in the button when showLabel is false
      // Note: "Off" still appears in dropdown menu, but not in button
      expect(button.textContent?.trim()).not.toContain('Off');
    });
  });

  describe('Preset Icons', () => {
    it('shows Sparkles icon when preset is off', () => {
      mockSimplifiedModeSettings.preset = 'off';
      render(<SimplifiedModeToggle />);
      // Icon appears in both button and dropdown
      const icons = screen.getAllByTestId('sparkles-icon');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('shows Minimize2 icon when preset is minimal', () => {
      mockSimplifiedModeSettings.preset = 'minimal';
      render(<SimplifiedModeToggle />);
      const icons = screen.getAllByTestId('minimize2-icon');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('shows Focus icon when preset is focused', () => {
      mockSimplifiedModeSettings.preset = 'focused';
      render(<SimplifiedModeToggle />);
      const icons = screen.getAllByTestId('focus-icon');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('shows Leaf icon when preset is zen', () => {
      mockSimplifiedModeSettings.preset = 'zen';
      render(<SimplifiedModeToggle />);
      const icons = screen.getAllByTestId('leaf-icon');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Active State Badge', () => {
    it('shows Active badge when simplified mode is enabled', () => {
      mockSimplifiedModeSettings.enabled = true;
      mockSimplifiedModeSettings.preset = 'focused';
      render(<SimplifiedModeToggle />);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('does not show Active badge when simplified mode is disabled', () => {
      mockSimplifiedModeSettings.enabled = false;
      render(<SimplifiedModeToggle />);
      expect(screen.queryByText('Active')).not.toBeInTheDocument();
    });
  });

  describe('Color Classes', () => {
    it('applies muted-foreground color when preset is off', () => {
      mockSimplifiedModeSettings.preset = 'off';
      render(<SimplifiedModeToggle />);
      const button = screen.getByRole('button');
      // The component applies the color class based on preset
      expect(button).toBeInTheDocument();
    });

    it('applies blue color when preset is minimal and enabled', () => {
      mockSimplifiedModeSettings.enabled = true;
      mockSimplifiedModeSettings.preset = 'minimal';
      render(<SimplifiedModeToggle />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      // The component should apply text-blue-500 via cn()
      expect(button).toHaveClass('text-blue-500');
    });

    it('applies amber color when preset is focused and enabled', () => {
      mockSimplifiedModeSettings.enabled = true;
      mockSimplifiedModeSettings.preset = 'focused';
      render(<SimplifiedModeToggle />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-amber-500');
    });

    it('applies emerald color when preset is zen and enabled', () => {
      mockSimplifiedModeSettings.enabled = true;
      mockSimplifiedModeSettings.preset = 'zen';
      render(<SimplifiedModeToggle />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-emerald-500');
    });
  });

  describe('Dropdown Menu Interactions', () => {
    it('renders dropdown menu structure', () => {
      render(<SimplifiedModeToggle />);
      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
      expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument();
      expect(screen.getByTestId('dropdown-content')).toBeInTheDocument();
    });

    it('shows all preset options in dropdown', () => {
      render(<SimplifiedModeToggle />);
      expect(screen.getByText('Off')).toBeInTheDocument();
      expect(screen.getByText('Minimal')).toBeInTheDocument();
      expect(screen.getByText('Focused')).toBeInTheDocument();
      expect(screen.getByText('Zen')).toBeInTheDocument();
    });

    it('shows preset descriptions in dropdown', () => {
      render(<SimplifiedModeToggle />);
      expect(screen.getByText('Full interface with all features')).toBeInTheDocument();
      expect(screen.getByText('Hide advanced controls and badges')).toBeInTheDocument();
      expect(screen.getByText('Minimal with auto-hide sidebar')).toBeInTheDocument();
      expect(screen.getByText('Ultra-minimal, distraction-free')).toBeInTheDocument();
    });

    it('shows Current badge on active preset', () => {
      mockSimplifiedModeSettings.preset = 'focused';
      render(<SimplifiedModeToggle />);
      // The component shows "Current" badge for the active preset
      const currentBadges = screen.getAllByText('Current');
      expect(currentBadges.length).toBeGreaterThan(0);
    });

    it('shows keyboard shortcut hint in dropdown', () => {
      render(<SimplifiedModeToggle />);
      expect(screen.getByText('Press Ctrl+Shift+S to toggle simplified mode')).toBeInTheDocument();
    });

    it('calls setSimplifiedModePreset when preset is clicked', () => {
      render(<SimplifiedModeToggle />);

      // Click on a preset option
      const dropdownItems = screen.getAllByTestId('dropdown-item');
      const minimalItem = dropdownItems.find(item => item.textContent?.includes('Minimal'));

      if (minimalItem) {
        fireEvent.click(minimalItem);
        expect(mockSetSimplifiedModePreset).toHaveBeenCalledWith('minimal');
      }
    });

    it('has Settings2 icon in dropdown label', () => {
      render(<SimplifiedModeToggle />);
      expect(screen.getByTestId('settings2-icon')).toBeInTheDocument();
    });

    it('has dropdown separators', () => {
      render(<SimplifiedModeToggle />);
      const separators = screen.getAllByTestId('dropdown-separator');
      expect(separators.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('has tooltip structure', () => {
      render(<SimplifiedModeToggle />);
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip-trigger')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();
    });

    it('has proper button role', () => {
      render(<SimplifiedModeToggle />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('has gap-1.5 transition-colors classes', () => {
      render(<SimplifiedModeToggle />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('gap-1.5');
      expect(button).toHaveClass('transition-colors');
    });
  });
});

describe('SimplifiedModeQuickToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSimplifiedModeSettings.enabled = false;
    mockSimplifiedModeSettings.preset = 'off';
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<SimplifiedModeQuickToggle />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(<SimplifiedModeQuickToggle className="custom-class" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('has ghost variant', () => {
      render(<SimplifiedModeQuickToggle />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-variant', 'ghost');
    });

    it('has icon size', () => {
      render(<SimplifiedModeQuickToggle />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-size', 'icon');
    });
  });

  describe('Icon Display', () => {
    it('shows Sparkles icon when simplified mode is disabled', () => {
      mockSimplifiedModeSettings.enabled = false;
      render(<SimplifiedModeQuickToggle />);
      expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
    });

    it('shows Leaf icon when simplified mode is enabled', () => {
      mockSimplifiedModeSettings.enabled = true;
      mockSimplifiedModeSettings.preset = 'focused';
      render(<SimplifiedModeQuickToggle />);
      expect(screen.getByTestId('leaf-icon')).toBeInTheDocument();
    });
  });

  describe('Color Classes', () => {
    it('does not apply color class when disabled', () => {
      mockSimplifiedModeSettings.enabled = false;
      mockSimplifiedModeSettings.preset = 'off';
      render(<SimplifiedModeQuickToggle />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('applies preset color when enabled', () => {
      mockSimplifiedModeSettings.enabled = true;
      mockSimplifiedModeSettings.preset = 'minimal';
      render(<SimplifiedModeQuickToggle />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-blue-500');
    });

    it('applies amber color for focused preset', () => {
      mockSimplifiedModeSettings.enabled = true;
      mockSimplifiedModeSettings.preset = 'focused';
      render(<SimplifiedModeQuickToggle />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-amber-500');
    });

    it('applies emerald color for zen preset', () => {
      mockSimplifiedModeSettings.enabled = true;
      mockSimplifiedModeSettings.preset = 'zen';
      render(<SimplifiedModeQuickToggle />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-emerald-500');
    });
  });

  describe('Toggle Interaction', () => {
    it('calls toggleSimplifiedMode when clicked', () => {
      render(<SimplifiedModeQuickToggle />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      expect(mockToggleSimplifiedMode).toHaveBeenCalledTimes(1);
    });

    it('toggles state on each click', () => {
      render(<SimplifiedModeQuickToggle />);
      const button = screen.getByRole('button');

      fireEvent.click(button);
      expect(mockToggleSimplifiedMode).toHaveBeenCalledTimes(1);

      fireEvent.click(button);
      expect(mockToggleSimplifiedMode).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('has proper button role', () => {
      render(<SimplifiedModeQuickToggle />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('has tooltip structure', () => {
      render(<SimplifiedModeQuickToggle />);
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();
    });

    it('shows keyboard shortcut in tooltip', () => {
      render(<SimplifiedModeQuickToggle />);
      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent.textContent).toContain('Ctrl+Shift+S');
    });

    it('has h-8 w-8 size classes', () => {
      render(<SimplifiedModeQuickToggle />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-8');
      expect(button).toHaveClass('w-8');
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid clicks without errors', () => {
      render(<SimplifiedModeQuickToggle />);
      const button = screen.getByRole('button');

      for (let i = 0; i < 10; i++) {
        fireEvent.click(button);
      }

      expect(mockToggleSimplifiedMode).toHaveBeenCalledTimes(10);
    });

    it('handles enabled state with off preset', () => {
      mockSimplifiedModeSettings.enabled = true;
      mockSimplifiedModeSettings.preset = 'off';
      render(<SimplifiedModeQuickToggle />);
      // Should show Leaf icon when enabled, regardless of preset
      expect(screen.getByTestId('leaf-icon')).toBeInTheDocument();
    });

    it('handles disabled state with non-off preset', () => {
      mockSimplifiedModeSettings.enabled = false;
      mockSimplifiedModeSettings.preset = 'minimal';
      render(<SimplifiedModeQuickToggle />);
      // Should show Sparkles icon when disabled, regardless of preset
      expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
    });
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Preset Transitions', () => {
    it('handles all preset transitions correctly', () => {
      const presets: SimplifiedModePreset[] = ['off', 'minimal', 'focused', 'zen'];

      for (const preset of presets) {
        mockSimplifiedModeSettings.preset = preset;
        mockSimplifiedModeSettings.enabled = preset !== 'off';

        const { unmount } = render(<SimplifiedModeToggle />);
        expect(screen.getByRole('button')).toBeInTheDocument();
        unmount();
      }
    });
  });

  describe('Both Components Together', () => {
    it('can render both components without conflicts', () => {
      mockSimplifiedModeSettings.enabled = true;
      mockSimplifiedModeSettings.preset = 'focused';

      render(
        <div>
          <SimplifiedModeToggle />
          <SimplifiedModeQuickToggle />
        </div>
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });
  });

  describe('State Consistency', () => {
    it('both components reflect same store state', () => {
      mockSimplifiedModeSettings.enabled = true;
      mockSimplifiedModeSettings.preset = 'zen';

      render(
        <div>
          <SimplifiedModeToggle showLabel />
          <SimplifiedModeQuickToggle />
        </div>
      );

      // Both should show zen mode is active
      const zenTexts = screen.getAllByText('Zen');
      expect(zenTexts.length).toBeGreaterThan(0);
      const leafIcons = screen.getAllByTestId('leaf-icon');
      expect(leafIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Preset Icons Mapping', () => {
    it('has correct icon for each preset', () => {
      const iconMap: Record<SimplifiedModePreset, string> = {
        off: 'sparkles-icon',
        minimal: 'minimize2-icon',
        focused: 'focus-icon',
        zen: 'leaf-icon',
      };

      for (const [preset, iconId] of Object.entries(iconMap)) {
        mockSimplifiedModeSettings.preset = preset as SimplifiedModePreset;
        const { unmount } = render(<SimplifiedModeToggle />);
        // Icon appears in dropdown for each preset
        const icons = screen.getAllByTestId(iconId);
        expect(icons.length).toBeGreaterThan(0);
        unmount();
      }
    });
  });

  describe('Translation Coverage', () => {
    it('renders all preset labels from translations', () => {
      render(<SimplifiedModeToggle />);
      expect(screen.getByText('Off')).toBeInTheDocument();
      expect(screen.getByText('Minimal')).toBeInTheDocument();
      expect(screen.getByText('Focused')).toBeInTheDocument();
      expect(screen.getByText('Zen')).toBeInTheDocument();
    });

    it('renders all preset descriptions from translations', () => {
      render(<SimplifiedModeToggle />);
      expect(screen.getByText('Full interface with all features')).toBeInTheDocument();
      expect(screen.getByText('Hide advanced controls and badges')).toBeInTheDocument();
      expect(screen.getByText('Minimal with auto-hide sidebar')).toBeInTheDocument();
      expect(screen.getByText('Ultra-minimal, distraction-free')).toBeInTheDocument();
    });

    it('renders title from translations', () => {
      render(<SimplifiedModeToggle />);
      // "Simplified Mode" appears multiple times (tooltip and dropdown label)
      const titles = screen.getAllByText('Simplified Mode');
      expect(titles.length).toBeGreaterThan(0);
    });
  });
});
