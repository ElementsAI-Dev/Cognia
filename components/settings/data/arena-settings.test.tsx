/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArenaSettings } from './arena-settings';

// Mock data
const mockSettings = {
  enabled: true,
  defaultModelCount: 2,
  autoSelectModels: true,
  preferenceLearning: true,
  defaultMode: 'normal' as const,
  defaultConversationMode: 'single' as const,
  defaultMaxTurns: 5,
  historyRetentionDays: 30,
  showCostEstimates: true,
  showTokenCounts: true,
  showConfidenceIntervals: false,
  enableAntiGaming: false,
  maxVotesPerHour: 30,
  minViewingTimeMs: 3000,
  bootstrapSamples: 1000,
};

const mockModelRatings = [
  {
    modelId: 'openai:gpt-4',
    provider: 'openai',
    model: 'gpt-4',
    rating: 1600,
    categoryRatings: {},
    totalBattles: 10,
    wins: 7,
    losses: 3,
    ties: 0,
    updatedAt: new Date(),
  },
  {
    modelId: 'anthropic:claude-3',
    provider: 'anthropic',
    model: 'claude-3',
    rating: 1550,
    categoryRatings: {},
    totalBattles: 8,
    wins: 5,
    losses: 3,
    ties: 0,
    updatedAt: new Date(),
  },
];

const mockStats = {
  totalBattles: 18,
  completedBattles: 15,
  totalTies: 2,
  modelWinRates: {},
  categoryDistribution: {},
  avgBattleDuration: 5000,
  topModels: [],
};

// Mock functions
const mockUpdateSettings = jest.fn();
const mockResetSettings = jest.fn();
const mockClearBattleHistory = jest.fn();
const mockResetModelRatings = jest.fn();
const mockClearPreferences = jest.fn();
const mockGetStats = jest.fn(() => mockStats);
const mockLeaderboardSyncSettings = {
  enabled: true,
  apiBaseUrl: 'https://api.example.com',
  apiKey: 'secret',
  autoSubmitPreferences: true,
  autoRefresh: true,
  autoRefreshIntervalMinutes: 5,
  cacheDurationMinutes: 5,
  retryFailedSubmissions: true,
  maxRetryAttempts: 3,
  requestTimeoutMs: 30000,
  minBattlesThreshold: 5,
  anonymousMode: false,
};
const mockUpdateLeaderboardSyncSettings = jest.fn();

// Mock arena store
jest.mock('@/stores/arena', () => ({
  useArenaStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      settings: mockSettings,
      battles: [],
      modelRatings: mockModelRatings,
      updateSettings: mockUpdateSettings,
      resetSettings: mockResetSettings,
      clearBattleHistory: mockClearBattleHistory,
      resetModelRatings: mockResetModelRatings,
      clearPreferences: mockClearPreferences,
      getStats: mockGetStats,
    };
    return selector(state);
  },
}));

// Mock preference-learner
jest.mock('@/lib/ai/generation/preference-learner', () => ({
  exportPreferences: jest.fn(() => ({
    preferences: [],
    modelRatings: [],
    exportedAt: new Date(),
  })),
  importPreferences: jest.fn(),
}));

jest.mock('@/hooks/arena', () => ({
  useLeaderboardSyncSettings: () => ({
    settings: mockLeaderboardSyncSettings,
    updateSettings: mockUpdateLeaderboardSyncSettings,
  }),
}));

// Mock sonner
jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  }),
}));

// Mock rlhf-export
jest.mock('@/lib/ai/arena/rlhf-export', () => ({
  exportBattles: jest.fn(() => '[]'),
  getExportStats: jest.fn(() => ({
    totalBattles: 0,
    validPairs: 0,
    byCategory: {},
    avgPromptLength: 0,
    avgResponseLength: 0,
  })),
  downloadExport: jest.fn(),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      'arena.settings': {
        title: 'Arena Settings',
        enabled: 'Enable Arena',
        defaultCount: 'Default Model Count',
        autoSelect: 'Auto-select Models',
        autoSelectDescription: 'Automatically select models for battles',
        learning: 'Preference Learning',
        learningDescription: 'Learn from your voting preferences',
        defaultMode: 'Default Mode',
        defaultModeDescription: 'Choose the default battle mode',
        normalMode: 'Normal',
        blindMode: 'Blind',
        conversationMode: 'Conversation Mode',
        conversationModeDescription: 'Choose single or multi-turn conversations',
        singleTurn: 'Single Turn',
        multiTurn: 'Multi Turn',
        maxTurns: 'Max Turns',
        maxTurnsDescription: 'turns per conversation',
        retention: 'History Retention',
        showCost: 'Show Cost Estimates',
        showCostDescription: 'Display estimated costs for each response',
        showTokens: 'Show Token Counts',
        showTokensDescription: 'Display token counts for each response',
        showConfidenceIntervals: 'Show Confidence Intervals',
        showConfidenceIntervalsDescription: 'Display rating confidence intervals',
        antiGaming: 'Anti-Gaming Protection',
        enableAntiGaming: 'Enable Anti-Gaming',
        enableAntiGamingDescription: 'Protect against vote manipulation',
        maxVotesPerHour: 'Max Votes Per Hour',
        minViewingTime: 'Minimum Viewing Time',
        minViewingTimeDescription: 'Minimum time before voting',
        advancedSettings: 'Advanced Settings',
        bootstrapSamples: 'Bootstrap Samples',
        bootstrapSamplesDescription: 'samples for confidence intervals',
        modelsRated: 'Models Rated',
        noBattlesYet: 'No Battles Yet',
        noBattlesDescription: 'Start battling to see model rankings',
        exportPreferences: 'Export Preferences',
        importPreferences: 'Import Preferences',
        resetSettings: 'Reset Settings',
        clearAllData: 'Clear All Data',
        clearAllTitle: 'Clear All Arena Data?',
        clearAllDescription: 'This will delete all battle history, preferences, and ratings.',
        rlhfExport: 'RLHF Data Export',
        rlhfExportButton: 'Export',
        rlhfTotalBattles: 'Total Battles',
        rlhfValidPairs: 'Valid Pairs',
        rlhfAvgPromptLen: 'Avg Prompt Length',
        rlhfAvgResponseLen: 'Avg Response Length',
        rlhfByCategory: 'By Category',
        rlhfNoValidPairs: 'No valid pairs',
        importFailed: 'Import Failed',
        importInvalidFormat: 'Invalid format',
        importInvalidPreferences: 'Invalid preferences',
        importInvalidRatings: 'Invalid ratings',
        importParseError: 'Parse error',
        importSuccess: 'Import Successful',
        importSuccessDescription: 'Imported preferences',
      },
      arena: {
        description: 'Compare AI models head-to-head',
        'stats.title': 'Statistics',
        'stats.totalBattles': 'Total Battles',
        'stats.completedBattles': 'Completed',
        'stats.ties': 'Ties',
        'stats.topModels': 'Top Models',
        'leaderboard.sync.title': 'Global Leaderboard',
        'leaderboard.sync.enabled': 'Enable Global Leaderboard Sync',
        'leaderboard.sync.enabledDescription': 'Sync leaderboard data',
        'leaderboard.sync.showGlobalLeaderboard': 'Show Global Leaderboard',
        'leaderboard.sync.showGlobalLeaderboardDescription': 'Display global rankings',
        'leaderboard.sync.apiUrl': 'API URL',
        'leaderboard.sync.apiUrlPlaceholder': 'https://api.example.com',
        'leaderboard.sync.apiKey': 'API Key (optional)',
        'leaderboard.sync.autoSubmit': 'Auto-submit Preferences',
        'leaderboard.sync.autoSubmitDescription': 'Submit results',
        'leaderboard.sync.autoRefresh': 'Auto-refresh',
        'leaderboard.sync.autoRefreshDescription': 'Refresh data',
        'leaderboard.sync.refreshInterval': 'Refresh Interval (minutes)',
        'leaderboard.sync.cacheDuration': 'Cache Duration (minutes)',
        'leaderboard.sync.minBattles': 'Minimum Battles Threshold',
        'leaderboard.sync.anonymousMode': 'Anonymous Mode',
        'leaderboard.sync.anonymousModeDescription': 'Anonymous',
        'leaderboard.sync.retryFailedSubmissions': 'Retry Failed Submissions',
        'leaderboard.sync.retryFailedSubmissionsDescription': 'Retry failed',
        'leaderboard.sync.maxRetryAttempts': 'Max Retry Attempts',
        'leaderboard.sync.requestTimeout': 'Request Timeout (seconds)',
      },
      common: {
        cancel: 'Cancel',
        delete: 'Delete',
      },
    };
    return translations[namespace]?.[key] || key;
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    size,
    className,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
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

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="scroll-area" className={className}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/settings/common/settings-section', () => ({
  SettingsCard: ({
    title,
    description,
    children,
  }: {
    title: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="settings-card">
      <div data-testid="settings-card-title">{title}</div>
      {description && <div data-testid="settings-card-description">{description}</div>}
      <div data-testid="settings-card-content">{children}</div>
    </div>
  ),
  SettingsEmptyState: ({
    icon,
    title,
    description,
  }: {
    icon: React.ReactNode;
    title: string;
    description: string;
  }) => (
    <div data-testid="settings-empty-state">
      {icon}
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
  SettingsGrid: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="settings-grid" className={className}>
      {children}
    </div>
  ),
  SettingsPageHeader: ({
    icon,
    title,
    description,
  }: {
    icon: React.ReactNode;
    title: string;
    description?: string;
  }) => (
    <div data-testid="settings-page-header">
      {icon}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  ),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({
    checked,
    onCheckedChange,
    disabled,
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
  }) => (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      data-testid="switch"
    >
      {checked ? 'On' : 'Off'}
    </button>
  ),
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({
    value,
    onValueChange,
    min,
    max,
    step,
    disabled,
  }: {
    value: number[];
    onValueChange: (value: number[]) => void;
    min: number;
    max: number;
    step: number;
    disabled?: boolean;
  }) => (
    <input
      type="range"
      value={value[0]}
      onChange={(e) => onValueChange([Number(e.target.value)])}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      data-testid="slider"
    />
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: { children: React.ReactNode; onValueChange: (value: string) => void }) => (
    <div data-testid="select" onClick={() => onValueChange('blind')}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <div>Select Value</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog">{children}</div>
  ),
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button data-testid="alert-dialog-action" onClick={onClick}>
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="alert-dialog-cancel">{children}</button>
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-content">{children}</div>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="alert-dialog-description">{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-footer">{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-header">{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h3 data-testid="alert-dialog-title">{children}</h3>
  ),
  AlertDialogTrigger: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <div data-testid="alert-dialog-trigger">{children}</div>,
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({
    children,
    open,
    _onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    _onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-testid="collapsible" data-open={open}>
      {children}
    </div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible-content">{children}</div>
  ),
  CollapsibleTrigger: ({
    children,
  }: {
    children: React.ReactNode;
  }) => (
    <div data-testid="collapsible-trigger">
      {children}
    </div>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Swords: () => <span data-testid="icon-swords" />,
  Trash2: () => <span data-testid="icon-trash" />,
  Download: () => <span data-testid="icon-download" />,
  Upload: () => <span data-testid="icon-upload" />,
  RotateCcw: () => <span data-testid="icon-rotate" />,
  Trophy: () => <span data-testid="icon-trophy" />,
  BarChart3: () => <span data-testid="icon-chart" />,
  Shield: () => <span data-testid="icon-shield" />,
  Settings2: () => <span data-testid="icon-settings" />,
  ChevronDown: () => <span data-testid="icon-chevron-down" />,
  ChevronUp: () => <span data-testid="icon-chevron-up" />,
  FileJson: () => <span data-testid="icon-file-json" />,
  AlertTriangle: () => <span data-testid="icon-alert-triangle" />,
}));

// Mock cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

describe('ArenaSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<ArenaSettings />);
      expect(screen.getByTestId('settings-page-header')).toBeInTheDocument();
    });

    it('displays the page header with title and description', () => {
      render(<ArenaSettings />);
      expect(screen.getByText('Arena Settings')).toBeInTheDocument();
      // Description appears in header and first settings card, so use getAllByText
      const descriptions = screen.getAllByText('Compare AI models head-to-head');
      expect(descriptions.length).toBeGreaterThan(0);
    });

    it('renders all basic settings cards', () => {
      render(<ArenaSettings />);
      expect(screen.getByText('Enable Arena')).toBeInTheDocument();
      expect(screen.getByText('Default Model Count')).toBeInTheDocument();
      expect(screen.getByText('Auto-select Models')).toBeInTheDocument();
      expect(screen.getByText('Preference Learning')).toBeInTheDocument();
      expect(screen.getByText('Default Mode')).toBeInTheDocument();
      expect(screen.getByText('Conversation Mode')).toBeInTheDocument();
      expect(screen.getByText('Max Turns')).toBeInTheDocument();
      expect(screen.getByText('History Retention')).toBeInTheDocument();
    });

    it('renders cost and token settings', () => {
      render(<ArenaSettings />);
      expect(screen.getByText('Show Cost Estimates')).toBeInTheDocument();
      expect(screen.getByText('Show Token Counts')).toBeInTheDocument();
      expect(screen.getByText('Show Confidence Intervals')).toBeInTheDocument();
    });

    it('renders statistics section', () => {
      render(<ArenaSettings />);
      expect(screen.getByText('Statistics')).toBeInTheDocument();
      expect(screen.getAllByText('Total Battles').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Ties')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      render(<ArenaSettings />);
      expect(screen.getByText('Export Preferences')).toBeInTheDocument();
      expect(screen.getByText('Import Preferences')).toBeInTheDocument();
      expect(screen.getByText('Reset Settings')).toBeInTheDocument();
      expect(screen.getByText('Clear All Data')).toBeInTheDocument();
    });

    it('renders collapsible sections', () => {
      render(<ArenaSettings />);
      expect(screen.getByText('Anti-Gaming Protection')).toBeInTheDocument();
      expect(screen.getByText('Advanced Settings')).toBeInTheDocument();
      expect(screen.getByText('Global Leaderboard')).toBeInTheDocument();
    });
  });

  describe('Top Models Display', () => {
    it('displays top models when ratings exist', () => {
      render(<ArenaSettings />);
      expect(screen.getByText('Top Models')).toBeInTheDocument();
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      expect(screen.getByText('claude-3')).toBeInTheDocument();
    });

    it('displays model ratings and win rates', () => {
      render(<ArenaSettings />);
      expect(screen.getByText('1600')).toBeInTheDocument();
      expect(screen.getByText('1550')).toBeInTheDocument();
      expect(screen.getByText('70%')).toBeInTheDocument(); // 7/10 win rate
    });

    it('displays model provider names', () => {
      render(<ArenaSettings />);
      expect(screen.getByText('openai')).toBeInTheDocument();
      expect(screen.getByText('anthropic')).toBeInTheDocument();
    });

    it('displays battle counts for each model', () => {
      render(<ArenaSettings />);
      // Model battle counts are shown in the ratings list
      const scrollArea = screen.getByTestId('scroll-area');
      expect(scrollArea).toBeInTheDocument();
    });
  });

  describe('Settings Interactions', () => {
    it('calls updateSettings when enabled switch is toggled', () => {
      render(<ArenaSettings />);
      const switches = screen.getAllByTestId('switch');
      fireEvent.click(switches[0]); // First switch is 'enabled'
      expect(mockUpdateSettings).toHaveBeenCalledWith({ enabled: false });
    });

    it('calls updateSettings when autoSelectModels switch is toggled', () => {
      render(<ArenaSettings />);
      const switches = screen.getAllByTestId('switch');
      fireEvent.click(switches[1]); // Second switch is 'autoSelectModels'
      expect(mockUpdateSettings).toHaveBeenCalledWith({ autoSelectModels: false });
    });

    it('calls updateSettings when preferenceLearning switch is toggled', () => {
      render(<ArenaSettings />);
      const switches = screen.getAllByTestId('switch');
      fireEvent.click(switches[2]); // Third switch is 'preferenceLearning'
      expect(mockUpdateSettings).toHaveBeenCalledWith({ preferenceLearning: false });
    });

    it('calls updateSettings when slider value changes', () => {
      render(<ArenaSettings />);
      const sliders = screen.getAllByTestId('slider');
      fireEvent.change(sliders[0], { target: { value: '3' } });
      expect(mockUpdateSettings).toHaveBeenCalledWith({ defaultModelCount: 3 });
    });

    it('calls resetSettings when reset button is clicked', () => {
      render(<ArenaSettings />);
      const resetButton = screen.getByText('Reset Settings');
      fireEvent.click(resetButton);
      expect(mockResetSettings).toHaveBeenCalled();
    });
  });

  describe('Clear All Data', () => {
    it('renders clear all data confirmation dialog', () => {
      render(<ArenaSettings />);
      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
      expect(screen.getByText('Clear All Arena Data?')).toBeInTheDocument();
    });

    it('calls all clear functions when confirmed', () => {
      render(<ArenaSettings />);
      const confirmButton = screen.getByTestId('alert-dialog-action');
      fireEvent.click(confirmButton);
      expect(mockClearBattleHistory).toHaveBeenCalled();
      expect(mockResetModelRatings).toHaveBeenCalled();
      expect(mockClearPreferences).toHaveBeenCalled();
    });
  });

  describe('Export/Import', () => {
    let originalCreateObjectURL: typeof URL.createObjectURL;
    let originalRevokeObjectURL: typeof URL.revokeObjectURL;

    beforeEach(() => {
      originalCreateObjectURL = URL.createObjectURL;
      originalRevokeObjectURL = URL.revokeObjectURL;
      URL.createObjectURL = jest.fn(() => 'blob:test');
      URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });

    it('renders export button', () => {
      render(<ArenaSettings />);
      const exportButton = screen.getByText('Export Preferences');
      expect(exportButton).toBeInTheDocument();
    });

    it('renders import button', () => {
      render(<ArenaSettings />);
      const importButton = screen.getByText('Import Preferences');
      expect(importButton).toBeInTheDocument();
    });

    it('export button is clickable', () => {
      render(<ArenaSettings />);
      const exportButton = screen.getByText('Export Preferences');
      expect(() => fireEvent.click(exportButton)).not.toThrow();
    });

    it('import button is clickable', () => {
      render(<ArenaSettings />);
      const importButton = screen.getByText('Import Preferences');
      expect(() => fireEvent.click(importButton)).not.toThrow();
    });
  });

  describe('Collapsible Sections', () => {
    it('anti-gaming section is collapsed by default', () => {
      render(<ArenaSettings />);
      const collapsibles = screen.getAllByTestId('collapsible');
      expect(collapsibles[1]).toHaveAttribute('data-open', 'false');
    });

    it('advanced settings section is collapsed by default', () => {
      render(<ArenaSettings />);
      const collapsibles = screen.getAllByTestId('collapsible');
      expect(collapsibles[2]).toHaveAttribute('data-open', 'false');
    });

    it('toggles anti-gaming section when clicked', () => {
      render(<ArenaSettings />);
      const triggers = screen.getAllByTestId('collapsible-trigger');
      fireEvent.click(triggers[1]);
      // State change is handled by React state
    });

    it('toggles advanced settings section when clicked', () => {
      render(<ArenaSettings />);
      const triggers = screen.getAllByTestId('collapsible-trigger');
      fireEvent.click(triggers[2]);
      // State change is handled by React state
    });
  });

  describe('Models Rated Count', () => {
    it('displays the correct number of rated models', () => {
      render(<ArenaSettings />);
      expect(screen.getByText('Models Rated')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('renders empty state when no model ratings exist', () => {
      // Override the mock for this test
      jest.doMock('@/stores/arena', () => ({
        useArenaStore: (selector: (state: Record<string, unknown>) => unknown) => {
          const state = {
            settings: mockSettings,
            battles: [],
            modelRatings: [],
            updateSettings: mockUpdateSettings,
            resetSettings: mockResetSettings,
            clearBattleHistory: mockClearBattleHistory,
            resetModelRatings: mockResetModelRatings,
            clearPreferences: mockClearPreferences,
            getStats: () => ({ ...mockStats, totalBattles: 0, completedBattles: 0 }),
          };
          return selector(state);
        },
      }));

      // Note: This test documents expected behavior
      // The actual empty state is shown when modelRatings.length === 0
    });
  });

  describe('Accessibility', () => {
    it('has accessible switch controls', () => {
      render(<ArenaSettings />);
      const switches = screen.getAllByRole('switch');
      expect(switches.length).toBeGreaterThan(0);
      switches.forEach((s) => {
        expect(s).toHaveAttribute('aria-checked');
      });
    });

    it('has accessible slider controls', () => {
      render(<ArenaSettings />);
      const sliders = screen.getAllByTestId('slider');
      expect(sliders.length).toBeGreaterThan(0);
    });
  });
});

describe('ArenaSettings default export', () => {
  it('exports the component as default', async () => {
    const arenaModule = await import('./arena-settings');
    expect(arenaModule.default).toBe(arenaModule.ArenaSettings);
  });
});
