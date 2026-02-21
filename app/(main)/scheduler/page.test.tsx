/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SchedulerPage from './page';

const mockConfirmPending = jest.fn();
const createSchedulerState = () => ({
  tasks: [],
  executions: [],
  statistics: {
    totalTasks: 0,
    activeTasks: 0,
    pausedTasks: 0,
    upcomingExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    totalExecutions: 0,
    averageDuration: 0,
  },
  selectedTask: null,
  isLoading: false,
  isInitialized: true,
  createTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
  pauseTask: jest.fn(),
  resumeTask: jest.fn(),
  runTaskNow: jest.fn(),
  selectTask: jest.fn(),
  refresh: jest.fn(),
  activeTasks: [],
  pausedTasks: [],
  upcomingTasks: [],
  recentExecutions: [],
  schedulerStatus: 'idle',
  filter: {},
  setFilter: jest.fn(),
  clearFilter: jest.fn(),
  loadRecentExecutions: jest.fn(),
  loadUpcomingTasks: jest.fn(),
  cleanupOldExecutions: jest.fn().mockResolvedValue(0),
  getActivePluginCount: jest.fn().mockReturnValue(0),
  cancelPluginExecution: jest.fn(),
  isPluginExecutionActive: jest.fn().mockReturnValue(false),
  bulkPause: jest.fn(),
  bulkResume: jest.fn(),
  bulkDelete: jest.fn(),
});
const mockUseScheduler = jest.fn(() => createSchedulerState());

const createSystemSchedulerState = () => ({
  capabilities: { can_elevate: false },
  isAvailable: false,
  isElevated: false,
  tasks: [],
  pendingConfirmation: null as { confirmation_id: string } | null,
  loading: false,
  error: null,
  refresh: jest.fn(),
  createTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
  enableTask: jest.fn(),
  disableTask: jest.fn(),
  runTaskNow: jest.fn(),
  confirmPending: mockConfirmPending,
  cancelPending: jest.fn(),
  validateTask: jest.fn().mockResolvedValue({
    valid: true,
    errors: [],
    warnings: [],
    risk_level: 'low',
    requires_admin: false,
  }),
  requestElevation: jest.fn(),
  clearError: jest.fn(),
});
const mockUseSystemScheduler = jest.fn(() => createSystemSchedulerState());

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/hooks/scheduler', () => ({
  useScheduler: () => mockUseScheduler(),
  useSystemScheduler: () => mockUseSystemScheduler(),
}));

jest.mock('./scheduler-dialogs', () => ({
  SchedulerDialogs: ({
    pendingConfirmation,
    onConfirmPending,
  }: {
    pendingConfirmation: unknown;
    onConfirmPending: () => void;
  }) => (
    <div>
      {pendingConfirmation ? (
        <button type="button" onClick={onConfirmPending}>
          confirm-pending
        </button>
      ) : null}
    </div>
  ),
}));

jest.mock('@/components/scheduler', () => ({
  TaskList: () => <div data-testid="task-list" />,
  TaskDetails: () => <div data-testid="task-details" />,
  TaskForm: () => <div data-testid="task-form" />,
  SystemTaskForm: () => <div data-testid="system-task-form" />,
  StatsOverview: () => <div data-testid="stats-overview" />,
  WorkflowScheduleDialog: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
  BackupScheduleDialog: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
  TaskConfirmationDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="task-confirmation-dialog" /> : null,
  AdminElevationDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="admin-elevation-dialog" /> : null,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  AlertDialogAction: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/tabs', () => {
  const TabsContext = React.createContext({
    value: '',
    onValueChange: (_value: string) => {},
  });

  const Tabs = ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) => (
    <TabsContext.Provider value={{ value, onValueChange }}>{children}</TabsContext.Provider>
  );
  const TabsList = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const TabsTrigger = ({ value, children }: { value: string; children: React.ReactNode }) => {
    const ctx = React.useContext(TabsContext);
    return (
      <button type="button" onClick={() => ctx.onValueChange(value)}>
        {children}
      </button>
    );
  };
  const TabsContent = ({ value, children }: { value: string; children: React.ReactNode }) => {
    const ctx = React.useContext(TabsContext);
    return ctx.value === value ? <div>{children}</div> : null;
  };
  return { Tabs, TabsList, TabsTrigger, TabsContent };
});

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
}));


describe('SchedulerPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseScheduler.mockImplementation(() => createSchedulerState());
    mockUseSystemScheduler.mockImplementation(() => createSystemSchedulerState());
  });

  it('renders app and system tabs', () => {
    mockUseSystemScheduler.mockReturnValue({
      ...createSystemSchedulerState(),
      pendingConfirmation: null,
    });
    render(<SchedulerPage />);

    expect(screen.getByText('appScheduler')).toBeInTheDocument();
    expect(screen.getByText('systemScheduler')).toBeInTheDocument();
  });

  it('shows unavailable message when system tab is selected', () => {
    mockUseSystemScheduler.mockReturnValue({
      ...createSystemSchedulerState(),
      isAvailable: false,
      pendingConfirmation: null,
    });
    render(<SchedulerPage />);

    fireEvent.click(screen.getByText('systemScheduler'));
    expect(screen.getByText('systemSchedulerUnavailable')).toBeInTheDocument();
  });

  it('routes pending confirmation action to confirmPending', () => {
    mockUseSystemScheduler.mockReturnValue({
      capabilities: { can_elevate: false },
      isAvailable: true,
      isElevated: false,
      tasks: [],
      pendingConfirmation: { confirmation_id: 'confirm-1' },
      loading: false,
      error: null,
      refresh: jest.fn(),
      createTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      enableTask: jest.fn(),
      disableTask: jest.fn(),
      runTaskNow: jest.fn(),
      confirmPending: mockConfirmPending,
      cancelPending: jest.fn(),
      validateTask: jest.fn().mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
        risk_level: 'low',
        requires_admin: false,
      }),
      requestElevation: jest.fn(),
      clearError: jest.fn(),
    });

    render(<SchedulerPage />);
    fireEvent.click(screen.getByText('confirm-pending'));

    expect(mockConfirmPending).toHaveBeenCalledTimes(1);
  });
});
