/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SourceVerificationSettings } from './source-verification-settings';

// Mock stores
const mockSetSourceVerificationEnabled = jest.fn();
const mockSetSourceVerificationMode = jest.fn();
const mockSetMinimumCredibilityScore = jest.fn();
const mockSetAutoFilterLowCredibility = jest.fn();
const mockSetEnableCrossValidation = jest.fn();
const mockSetSourceVerificationSettings = jest.fn();
const mockAddTrustedDomain = jest.fn();
const mockRemoveTrustedDomain = jest.fn();
const mockAddBlockedDomain = jest.fn();
const mockRemoveBlockedDomain = jest.fn();

const createMockState = (overrides = {}) => ({
  sourceVerificationSettings: {
    enabled: true,
    mode: 'auto' as const,
    minimumCredibilityScore: 0.7,
    autoFilterLowCredibility: false,
    showVerificationBadges: true,
    trustedDomains: ['trusted.com', 'example.org'],
    blockedDomains: ['spam.com'],
    enableCrossValidation: true,
    ...overrides,
  },
  setSourceVerificationSettings: mockSetSourceVerificationSettings,
  setSourceVerificationEnabled: mockSetSourceVerificationEnabled,
  setSourceVerificationMode: mockSetSourceVerificationMode,
  setMinimumCredibilityScore: mockSetMinimumCredibilityScore,
  setAutoFilterLowCredibility: mockSetAutoFilterLowCredibility,
  setEnableCrossValidation: mockSetEnableCrossValidation,
  addTrustedDomain: mockAddTrustedDomain,
  removeTrustedDomain: mockRemoveTrustedDomain,
  addBlockedDomain: mockAddBlockedDomain,
  removeBlockedDomain: mockRemoveBlockedDomain,
});

let mockState = createMockState();

jest.mock('@/stores', () => ({
  useSettingsStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    return selector ? selector(mockState) : mockState;
  },
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      title: 'Source Verification',
      description: 'Configure how sources are verified',
      verificationMode: 'Verification Mode',
      modeAsk: 'Ask',
      modeAskDesc: 'Ask before verifying',
      modeAuto: 'Auto',
      modeAutoDesc: 'Automatically verify sources',
      modeDisabled: 'Disabled',
      modeDisabledDesc: 'Verification disabled',
      minimumThreshold: 'Minimum Credibility Threshold',
      loose: 'Loose',
      strict: 'Strict',
      autoFilterLow: 'Auto-filter Low Credibility',
      autoFilterLowDesc: 'Automatically filter low credibility sources',
      enableCrossValidation: 'Enable Cross-validation',
      enableCrossValidationDesc: 'Cross-validate sources',
      showBadges: 'Show Verification Badges',
      showBadgesDesc: 'Display badges on verified sources',
      domainManagement: 'Domain Management',
      rules: 'rules',
      trustedDomains: 'Trusted Domains',
      blockedDomains: 'Blocked Domains',
      trusted: 'trusted',
      blocked: 'blocked',
      autoFilterWarning: `Sources below ${params?.percentage || 0}% credibility will be filtered`,
      removeDomain: `Remove ${params?.domain || 'domain'}`,
    };
    return translations[key] || key;
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Shield: () => <span data-testid="icon-shield">Shield</span>,
  ShieldCheck: () => <span data-testid="icon-shield-check">ShieldCheck</span>,
  ShieldAlert: () => <span data-testid="icon-shield-alert">ShieldAlert</span>,
  ShieldQuestion: () => <span data-testid="icon-shield-question">ShieldQuestion</span>,
  Plus: () => <span data-testid="icon-plus">Plus</span>,
  Trash2: () => <span data-testid="icon-trash">Trash</span>,
  AlertTriangle: () => <span data-testid="icon-alert-triangle">AlertTriangle</span>,
  CheckCircle2: () => <span data-testid="icon-check-circle">CheckCircle</span>,
  XCircle: () => <span data-testid="icon-x-circle">XCircle</span>,
  Globe: () => <span data-testid="icon-globe">Globe</span>,
  Settings2: () => <span data-testid="icon-settings">Settings</span>,
}));

// Mock lib/settings/tools
jest.mock('@/lib/settings/tools', () => ({
  VERIFICATION_MODE_KEYS: {
    ask: { label: 'modeAsk', description: 'modeAskDesc' },
    auto: { label: 'modeAuto', description: 'modeAutoDesc' },
    disabled: { label: 'modeDisabled', description: 'modeDisabledDesc' },
  },
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="card-description">{children}</p>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3 data-testid="card-title">{children}</h3>
  ),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({
    id,
    checked,
    onCheckedChange,
  }: {
    id?: string;
    checked?: boolean;
    onCheckedChange?: (v: boolean) => void;
  }) => (
    <button
      role="switch"
      aria-checked={checked ? 'true' : 'false'}
      onClick={() => onCheckedChange?.(!checked)}
      data-testid={id ? `switch-${id}` : 'switch'}
    >
      Switch
    </button>
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({
    children,
    htmlFor,
    className,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
    className?: string;
  }) => (
    <label htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ),
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({
    value,
    onValueChange,
    min,
    max,
    step,
  }: {
    value?: number[];
    onValueChange?: (v: number[]) => void;
    min?: number;
    max?: number;
    step?: number;
  }) => (
    <input
      type="range"
      data-testid="slider"
      aria-label="Credibility threshold"
      value={value?.[0] || 0}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
    />
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    size,
    className,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    onKeyDown,
    placeholder,
    className,
  }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={className}
      data-testid="input"
    />
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => (
    <div data-testid="select" data-value={value}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<{ onValueChange?: (v: string) => void }>, {
              onValueChange,
            })
          : child
      )}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange?: (v: string) => void;
  }) => (
    <button data-testid={`select-item-${value}`} data-value={value} onClick={() => onValueChange?.(value)}>
      {children}
    </button>
  ),
  SelectTrigger: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <button data-testid="select-trigger" className={className}>
      {children}
    </button>
  ),
  SelectValue: () => <span data-testid="select-value" />,
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-testid="collapsible" data-open={open}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<{ onOpenChange?: (open: boolean) => void }>, {
              onOpenChange,
            })
          : child
      )}
    </div>
  ),
  CollapsibleContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="collapsible-content" className={className}>
      {children}
    </div>
  ),
  CollapsibleTrigger: ({
    children,
    asChild,
    onOpenChange,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-testid="collapsible-trigger" data-as-child={asChild} onClick={() => onOpenChange?.(true)}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip">{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="tooltip-trigger" data-as-child={asChild}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>
      {children}
    </div>
  ),
}));

// Mock cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' '),
}));

describe('SourceVerificationSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = createMockState();
  });

  describe('Full Mode Rendering', () => {
    it('renders without crashing', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('displays title', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByText('Source Verification')).toBeInTheDocument();
    });

    it('displays description', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByText('Configure how sources are verified')).toBeInTheDocument();
    });

    it('renders main enable switch', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByTestId('switch-source-verification-enabled-full')).toBeInTheDocument();
    });

    it('shows card content when verification is enabled', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByTestId('card-content')).toBeInTheDocument();
    });

    it('hides card content when verification is disabled', () => {
      mockState = createMockState({ enabled: false });
      render(<SourceVerificationSettings />);
      expect(screen.queryByTestId('card-content')).not.toBeInTheDocument();
    });
  });

  describe('Compact Mode Rendering', () => {
    it('renders in compact mode', () => {
      render(<SourceVerificationSettings compact={true} />);
      expect(screen.getByTestId('switch-source-verification-enabled')).toBeInTheDocument();
    });

    it('shows mode selector in compact mode when enabled', () => {
      render(<SourceVerificationSettings compact={true} />);
      expect(screen.getByTestId('select')).toBeInTheDocument();
    });

    it('shows domain count badges in compact mode', () => {
      render(<SourceVerificationSettings compact={true} />);
      expect(screen.getByText(/2.*trusted/)).toBeInTheDocument();
      expect(screen.getByText(/1.*blocked/)).toBeInTheDocument();
    });

    it('hides mode selector when disabled in compact mode', () => {
      mockState = createMockState({ enabled: false });
      render(<SourceVerificationSettings compact={true} />);
      expect(screen.queryByTestId('select')).not.toBeInTheDocument();
    });
  });

  describe('Verification Toggle', () => {
    it('calls setSourceVerificationEnabled when toggle is clicked', () => {
      render(<SourceVerificationSettings />);
      const switchEl = screen.getByTestId('switch-source-verification-enabled-full');
      fireEvent.click(switchEl);
      expect(mockSetSourceVerificationEnabled).toHaveBeenCalledWith(false);
    });

    it('calls setSourceVerificationEnabled with true when enabling', () => {
      mockState = createMockState({ enabled: false });
      render(<SourceVerificationSettings />);
      const switchEl = screen.getByTestId('switch-source-verification-enabled-full');
      fireEvent.click(switchEl);
      expect(mockSetSourceVerificationEnabled).toHaveBeenCalledWith(true);
    });
  });

  describe('Verification Mode Selection', () => {
    it('displays verification mode section', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByText('Verification Mode')).toBeInTheDocument();
    });

    it('renders mode buttons for each mode', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByText('Ask')).toBeInTheDocument();
      expect(screen.getByText('Auto')).toBeInTheDocument();
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });

    it('renders mode icons', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByTestId('icon-shield-question')).toBeInTheDocument();
      expect(screen.getByTestId('icon-shield-check')).toBeInTheDocument();
      expect(screen.getByTestId('icon-shield-alert')).toBeInTheDocument();
    });
  });

  describe('Credibility Slider', () => {
    it('displays credibility threshold section', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByText('Minimum Credibility Threshold')).toBeInTheDocument();
    });

    it('displays current credibility percentage', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByText('70%')).toBeInTheDocument();
    });

    it('renders slider component', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByTestId('slider')).toBeInTheDocument();
    });

    it('calls setMinimumCredibilityScore when slider changes', () => {
      render(<SourceVerificationSettings />);
      const slider = screen.getByTestId('slider');
      fireEvent.change(slider, { target: { value: '80' } });
      expect(mockSetMinimumCredibilityScore).toHaveBeenCalledWith(0.8);
    });

    it('displays loose and strict labels', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByText('Loose')).toBeInTheDocument();
      expect(screen.getByText('Strict')).toBeInTheDocument();
    });
  });

  describe('Auto Filter Toggle', () => {
    it('displays auto filter toggle', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByText('Auto-filter Low Credibility')).toBeInTheDocument();
    });

    it('displays auto filter description', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByText('Automatically filter low credibility sources')).toBeInTheDocument();
    });

    it('calls setAutoFilterLowCredibility when toggled', () => {
      render(<SourceVerificationSettings />);
      const switches = screen.getAllByRole('switch');
      // Find the auto filter switch (not the main enable switch)
      const autoFilterSwitch = switches.find(
        (s) => s.getAttribute('aria-checked') === 'false' && s.getAttribute('data-testid') !== 'switch-source-verification-enabled-full'
      );
      if (autoFilterSwitch) {
        fireEvent.click(autoFilterSwitch);
        expect(mockSetAutoFilterLowCredibility).toHaveBeenCalledWith(true);
      }
    });
  });

  describe('Cross Validation Toggle', () => {
    it('displays cross validation toggle', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByText('Enable Cross-validation')).toBeInTheDocument();
    });

    it('displays cross validation description', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByText('Cross-validate sources')).toBeInTheDocument();
    });
  });

  describe('Show Badges Toggle', () => {
    it('displays show badges toggle', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByText('Show Verification Badges')).toBeInTheDocument();
    });

    it('displays show badges description', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByText('Display badges on verified sources')).toBeInTheDocument();
    });
  });

  describe('Domain Management', () => {
    it('renders domain management collapsible', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByTestId('collapsible')).toBeInTheDocument();
    });

    it('displays domain management label', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByText('Domain Management')).toBeInTheDocument();
    });

    it('shows total domain count badge', () => {
      render(<SourceVerificationSettings />);
      // 2 trusted + 1 blocked = 3 total
      expect(screen.getByText(/3.*rules/)).toBeInTheDocument();
    });

    it('renders collapsible content with domain sections', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByTestId('collapsible-content')).toBeInTheDocument();
    });
  });

  describe('Trusted Domain Management', () => {
    it('displays trusted domains section', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByText('Trusted Domains')).toBeInTheDocument();
    });

    it('displays existing trusted domains', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByText('trusted.com')).toBeInTheDocument();
      expect(screen.getByText('example.org')).toBeInTheDocument();
    });

    it('renders input for adding trusted domain', () => {
      render(<SourceVerificationSettings />);
      const inputs = screen.getAllByTestId('input');
      expect(inputs.length).toBeGreaterThan(0);
      expect(inputs[0]).toHaveAttribute(
        'placeholder',
        expect.stringMatching(/example\.com|trustedDomainPlaceholder/i)
      );
    });

    it('renders add button for trusted domains', () => {
      render(<SourceVerificationSettings />);
      const buttons = screen.getAllByTestId('icon-plus');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('calls addTrustedDomain when add button is clicked', () => {
      render(<SourceVerificationSettings />);
      const inputs = screen.getAllByTestId('input');
      const trustedInput = inputs[0];

      fireEvent.change(trustedInput, { target: { value: 'newdomain.com' } });

      // Find add button for trusted domains (first Plus icon button)
      const addButtons = screen.getAllByTestId('icon-plus');
      const addButton = addButtons[0].closest('button');
      if (addButton) {
        fireEvent.click(addButton);
        expect(mockAddTrustedDomain).toHaveBeenCalledWith('newdomain.com');
      }
    });

    it('calls removeTrustedDomain when remove button is clicked', () => {
      render(<SourceVerificationSettings />);
      // Find remove buttons for trusted domains
      const removeButtons = screen.getAllByTestId('icon-trash');
      if (removeButtons[0]) {
        const removeBtn = removeButtons[0].closest('button');
        if (removeBtn) {
          fireEvent.click(removeBtn);
          expect(mockRemoveTrustedDomain).toHaveBeenCalledWith('trusted.com');
        }
      }
    });

    it('normalizes domain URL by removing http://', () => {
      render(<SourceVerificationSettings />);
      const inputs = screen.getAllByTestId('input');
      const trustedInput = inputs[0];

      fireEvent.change(trustedInput, { target: { value: 'https://example.com' } });

      const addButtons = screen.getAllByTestId('icon-plus');
      const addButton = addButtons[0].closest('button');
      if (addButton) {
        fireEvent.click(addButton);
        expect(mockAddTrustedDomain).toHaveBeenCalledWith('example.com');
      }
    });

    it('normalizes domain URL by removing www.', () => {
      render(<SourceVerificationSettings />);
      const inputs = screen.getAllByTestId('input');
      const trustedInput = inputs[0];

      fireEvent.change(trustedInput, { target: { value: 'www.example.com' } });

      const addButtons = screen.getAllByTestId('icon-plus');
      const addButton = addButtons[0].closest('button');
      if (addButton) {
        fireEvent.click(addButton);
        expect(mockAddTrustedDomain).toHaveBeenCalledWith('example.com');
      }
    });

    it('adds trusted domain on Enter key press', () => {
      render(<SourceVerificationSettings />);
      const inputs = screen.getAllByTestId('input');
      const trustedInput = inputs[0];

      fireEvent.change(trustedInput, { target: { value: 'enter-domain.com' } });
      fireEvent.keyDown(trustedInput, { key: 'Enter' });

      expect(mockAddTrustedDomain).toHaveBeenCalledWith('enter-domain.com');
    });

    it('does not add duplicate trusted domain', () => {
      render(<SourceVerificationSettings />);
      const inputs = screen.getAllByTestId('input');
      const trustedInput = inputs[0];

      fireEvent.change(trustedInput, { target: { value: 'trusted.com' } });
      fireEvent.keyDown(trustedInput, { key: 'Enter' });

      expect(mockAddTrustedDomain).not.toHaveBeenCalled();
    });

    it('does not add empty trusted domain', () => {
      render(<SourceVerificationSettings />);
      const inputs = screen.getAllByTestId('input');
      const trustedInput = inputs[0];

      fireEvent.change(trustedInput, { target: { value: '   ' } });
      fireEvent.keyDown(trustedInput, { key: 'Enter' });

      expect(mockAddTrustedDomain).not.toHaveBeenCalled();
    });
  });

  describe('Blocked Domain Management', () => {
    it('displays blocked domains section', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByText('Blocked Domains')).toBeInTheDocument();
    });

    it('displays existing blocked domains', () => {
      render(<SourceVerificationSettings />);
      expect(screen.getByText('spam.com')).toBeInTheDocument();
    });

    it('calls addBlockedDomain when add button is clicked', () => {
      render(<SourceVerificationSettings />);
      const inputs = screen.getAllByTestId('input');
      const blockedInput = inputs[1];

      fireEvent.change(blockedInput, { target: { value: 'malicious.com' } });

      const addButtons = screen.getAllByTestId('icon-plus');
      const addButton = addButtons[1].closest('button');
      if (addButton) {
        fireEvent.click(addButton);
        expect(mockAddBlockedDomain).toHaveBeenCalledWith('malicious.com');
      }
    });

    it('calls removeBlockedDomain when remove button is clicked', () => {
      render(<SourceVerificationSettings />);
      // Find remove buttons - blocked domain remove is after trusted domains
      const removeButtons = screen.getAllByTestId('icon-trash');
      // Last remove button should be for blocked domain
      const lastRemoveBtn = removeButtons[removeButtons.length - 1].closest('button');
      if (lastRemoveBtn) {
        fireEvent.click(lastRemoveBtn);
        expect(mockRemoveBlockedDomain).toHaveBeenCalledWith('spam.com');
      }
    });

    it('adds blocked domain on Enter key press', () => {
      render(<SourceVerificationSettings />);
      const inputs = screen.getAllByTestId('input');
      const blockedInput = inputs[1];

      fireEvent.change(blockedInput, { target: { value: 'new-blocked.com' } });
      fireEvent.keyDown(blockedInput, { key: 'Enter' });

      expect(mockAddBlockedDomain).toHaveBeenCalledWith('new-blocked.com');
    });

    it('does not add duplicate blocked domain', () => {
      render(<SourceVerificationSettings />);
      const inputs = screen.getAllByTestId('input');
      const blockedInput = inputs[1];

      fireEvent.change(blockedInput, { target: { value: 'spam.com' } });
      fireEvent.keyDown(blockedInput, { key: 'Enter' });

      expect(mockAddBlockedDomain).not.toHaveBeenCalled();
    });
  });

  describe('Warning Alert', () => {
    it('shows warning when auto mode and auto filter are enabled', () => {
      mockState = createMockState({
        mode: 'auto',
        autoFilterLowCredibility: true,
      });
      render(<SourceVerificationSettings />);
      expect(screen.getByTestId('icon-alert-triangle')).toBeInTheDocument();
    });

    it('hides warning when not in auto mode', () => {
      mockState = createMockState({
        mode: 'ask',
        autoFilterLowCredibility: true,
      });
      render(<SourceVerificationSettings />);
      expect(screen.queryByTestId('icon-alert-triangle')).not.toBeInTheDocument();
    });

    it('hides warning when auto filter is disabled', () => {
      mockState = createMockState({
        mode: 'auto',
        autoFilterLowCredibility: false,
      });
      render(<SourceVerificationSettings />);
      expect(screen.queryByTestId('icon-alert-triangle')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('renders with empty trusted domains list', () => {
      mockState = createMockState({
        trustedDomains: [],
      });
      render(<SourceVerificationSettings />);
      expect(screen.queryByText('trusted.com')).not.toBeInTheDocument();
    });

    it('renders with empty blocked domains list', () => {
      mockState = createMockState({
        blockedDomains: [],
      });
      render(<SourceVerificationSettings />);
      expect(screen.queryByText('spam.com')).not.toBeInTheDocument();
    });

    it('handles 0% credibility score', () => {
      mockState = createMockState({
        minimumCredibilityScore: 0,
      });
      render(<SourceVerificationSettings />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('handles 100% credibility score', () => {
      mockState = createMockState({
        minimumCredibilityScore: 1,
      });
      render(<SourceVerificationSettings />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('applies className prop', () => {
      render(<SourceVerificationSettings className="custom-class" />);
      expect(screen.getByTestId('card')).toHaveClass('custom-class');
    });
  });
});
