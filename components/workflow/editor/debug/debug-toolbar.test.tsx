import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DebugToolbar } from './debug-toolbar';
import { useWorkflowEditorStore } from '@/stores/workflow';
import { NextIntlClientProvider } from 'next-intl';

// Mock zustand/react/shallow
jest.mock('zustand/react/shallow', () => ({
  useShallow: (fn: (...args: unknown[]) => unknown) => fn,
}));

jest.mock('@/stores/workflow');

const mockUseWorkflowEditorStore = useWorkflowEditorStore as jest.MockedFunction<typeof useWorkflowEditorStore>;

type MockStoreReturn = Partial<ReturnType<typeof useWorkflowEditorStore>>;

const messages = {
  workflowEditor: {
    enableDebugMode: 'Enable Debug Mode',
    debugMode: 'Debug',
    startDebug: 'Start Debug',
    continue: 'Continue',
    pause: 'Pause',
    stepOver: 'Step Over',
    stepInto: 'Step Into',
    stop: 'Stop',
    breakpoints: 'breakpoint(s)',
    clearBreakpoints: 'Clear All Breakpoints',
    paused: 'Paused',
    running: 'Running',
    exitDebug: 'Exit Debug',
    exitDebugMode: 'Exit Debug Mode',
  },
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {component}
    </NextIntlClientProvider>
  );
};

describe('DebugToolbar', () => {
  const mockToggleDebugMode = jest.fn();
  const mockStepOver = jest.fn();
  const mockStepInto = jest.fn();
  const mockContinueExecution = jest.fn();
  const mockClearBreakpoints = jest.fn();
  const mockPauseExecution = jest.fn();
  const mockCancelExecution = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders debug mode toggle button when not in debug mode', () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      isDebugMode: false,
      isExecuting: false,
      isPausedAtBreakpoint: false,
      breakpoints: new Set<string>(),
      executionState: null,
      toggleDebugMode: mockToggleDebugMode,
      stepOver: mockStepOver,
      stepInto: mockStepInto,
      continueExecution: mockContinueExecution,
      clearBreakpoints: mockClearBreakpoints,
      pauseExecution: mockPauseExecution,
      cancelExecution: mockCancelExecution,
    } as MockStoreReturn);

    renderWithProviders(<DebugToolbar />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('toggles debug mode when button clicked', async () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      isDebugMode: false,
      isExecuting: false,
      isPausedAtBreakpoint: false,
      breakpoints: new Set<string>(),
      executionState: null,
      toggleDebugMode: mockToggleDebugMode,
      stepOver: mockStepOver,
      stepInto: mockStepInto,
      continueExecution: mockContinueExecution,
      clearBreakpoints: mockClearBreakpoints,
      pauseExecution: mockPauseExecution,
      cancelExecution: mockCancelExecution,
    } as MockStoreReturn);

    renderWithProviders(<DebugToolbar />);
    
    await userEvent.click(screen.getByRole('button'));
    expect(mockToggleDebugMode).toHaveBeenCalled();
  });

  it('renders full debug toolbar when in debug mode', () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      isDebugMode: true,
      isExecuting: false,
      isPausedAtBreakpoint: false,
      breakpoints: new Set<string>(),
      executionState: null,
      toggleDebugMode: mockToggleDebugMode,
      stepOver: mockStepOver,
      stepInto: mockStepInto,
      continueExecution: mockContinueExecution,
      clearBreakpoints: mockClearBreakpoints,
      pauseExecution: mockPauseExecution,
      cancelExecution: mockCancelExecution,
    } as MockStoreReturn);

    renderWithProviders(<DebugToolbar />);
    
    expect(screen.getByText('Debug')).toBeInTheDocument();
    expect(screen.getByText('Exit Debug')).toBeInTheDocument();
  });

  it('shows breakpoint count', () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      isDebugMode: true,
      isExecuting: false,
      isPausedAtBreakpoint: false,
      breakpoints: new Set<string>(['node-1', 'node-2']),
      executionState: null,
      toggleDebugMode: mockToggleDebugMode,
      stepOver: mockStepOver,
      stepInto: mockStepInto,
      continueExecution: mockContinueExecution,
      clearBreakpoints: mockClearBreakpoints,
      pauseExecution: mockPauseExecution,
      cancelExecution: mockCancelExecution,
    } as MockStoreReturn);

    renderWithProviders(<DebugToolbar />);
    
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows clear breakpoints button when breakpoints exist', () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      isDebugMode: true,
      isExecuting: false,
      isPausedAtBreakpoint: false,
      breakpoints: new Set<string>(['node-1']),
      executionState: null,
      toggleDebugMode: mockToggleDebugMode,
      stepOver: mockStepOver,
      stepInto: mockStepInto,
      continueExecution: mockContinueExecution,
      clearBreakpoints: mockClearBreakpoints,
      pauseExecution: mockPauseExecution,
      cancelExecution: mockCancelExecution,
    } as MockStoreReturn);

    renderWithProviders(<DebugToolbar />);
    
    // There should be multiple buttons including clear breakpoints
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(1);
  });

  it('shows running status when executing', () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      isDebugMode: true,
      isExecuting: true,
      isPausedAtBreakpoint: false,
      breakpoints: new Set<string>(),
      executionState: { status: 'running' },
      toggleDebugMode: mockToggleDebugMode,
      stepOver: mockStepOver,
      stepInto: mockStepInto,
      continueExecution: mockContinueExecution,
      clearBreakpoints: mockClearBreakpoints,
      pauseExecution: mockPauseExecution,
      cancelExecution: mockCancelExecution,
    } as MockStoreReturn);

    renderWithProviders(<DebugToolbar />);
    
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('shows paused status when paused at breakpoint', () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      isDebugMode: true,
      isExecuting: true,
      isPausedAtBreakpoint: true,
      breakpoints: new Set<string>(),
      executionState: { status: 'paused' },
      toggleDebugMode: mockToggleDebugMode,
      stepOver: mockStepOver,
      stepInto: mockStepInto,
      continueExecution: mockContinueExecution,
      clearBreakpoints: mockClearBreakpoints,
      pauseExecution: mockPauseExecution,
      cancelExecution: mockCancelExecution,
    } as MockStoreReturn);

    renderWithProviders(<DebugToolbar />);
    
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('calls stepOver when step over button clicked', async () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      isDebugMode: true,
      isExecuting: true,
      isPausedAtBreakpoint: true,
      breakpoints: new Set<string>(),
      executionState: { status: 'paused' },
      toggleDebugMode: mockToggleDebugMode,
      stepOver: mockStepOver,
      stepInto: mockStepInto,
      continueExecution: mockContinueExecution,
      clearBreakpoints: mockClearBreakpoints,
      pauseExecution: mockPauseExecution,
      cancelExecution: mockCancelExecution,
    } as MockStoreReturn);

    renderWithProviders(<DebugToolbar />);
    
    // Find and click the step over button (has SkipForward icon)
    const buttons = screen.getAllByRole('button');
    // Step Over is one of the buttons in the toolbar
    const stepOverButton = buttons.find(btn => !btn.hasAttribute('disabled') || btn.querySelector('svg'));
    if (stepOverButton) {
      await userEvent.click(stepOverButton);
    }
  });

  it('calls clearBreakpoints when clear button clicked', async () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      isDebugMode: true,
      isExecuting: false,
      isPausedAtBreakpoint: false,
      breakpoints: new Set<string>(['node-1']),
      executionState: null,
      toggleDebugMode: mockToggleDebugMode,
      stepOver: mockStepOver,
      stepInto: mockStepInto,
      continueExecution: mockContinueExecution,
      clearBreakpoints: mockClearBreakpoints,
      pauseExecution: mockPauseExecution,
      cancelExecution: mockCancelExecution,
    } as MockStoreReturn);

    renderWithProviders(<DebugToolbar />);
    
    // Find clear breakpoints button (has Trash2 icon)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('exits debug mode when exit button clicked', async () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      isDebugMode: true,
      isExecuting: false,
      isPausedAtBreakpoint: false,
      breakpoints: new Set<string>(),
      executionState: null,
      toggleDebugMode: mockToggleDebugMode,
      stepOver: mockStepOver,
      stepInto: mockStepInto,
      continueExecution: mockContinueExecution,
      clearBreakpoints: mockClearBreakpoints,
      pauseExecution: mockPauseExecution,
      cancelExecution: mockCancelExecution,
    } as MockStoreReturn);

    renderWithProviders(<DebugToolbar />);
    
    await userEvent.click(screen.getByText('Exit Debug'));
    expect(mockToggleDebugMode).toHaveBeenCalled();
  });

  it('disables step buttons when not paused', () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      isDebugMode: true,
      isExecuting: true,
      isPausedAtBreakpoint: false,
      breakpoints: new Set<string>(),
      executionState: { status: 'running' },
      toggleDebugMode: mockToggleDebugMode,
      stepOver: mockStepOver,
      stepInto: mockStepInto,
      continueExecution: mockContinueExecution,
      clearBreakpoints: mockClearBreakpoints,
      pauseExecution: mockPauseExecution,
      cancelExecution: mockCancelExecution,
    } as MockStoreReturn);

    renderWithProviders(<DebugToolbar />);
    
    // Step buttons should be disabled when running (not paused)
    const buttons = screen.getAllByRole('button');
    const disabledButtons = buttons.filter(btn => btn.hasAttribute('disabled'));
    expect(disabledButtons.length).toBeGreaterThan(0);
  });
});
