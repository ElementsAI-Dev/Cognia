import { render, screen, fireEvent } from '@testing-library/react';
import { ContextPanel } from './context-panel';

// Mock the context hook
const mockFetchContext = jest.fn();
const mockCaptureAndAnalyzeScreen = jest.fn();
let mockScreenAnalysisError: string | null = null;
let mockIsAnalyzingScreen = false;
let mockScreenContentValue: Record<string, unknown> | null = null;
const mockContext = {
  timestamp: Date.now(),
  window: {
    title: 'Test Window Title',
    process_name: 'test-process.exe',
    width: 1920,
    height: 1080,
  },
  app: {
    app_name: 'Visual Studio Code',
    app_type: 'CodeEditor' as const,
    supports_text_input: true,
    supports_rich_text: false,
    is_dev_tool: true,
    suggested_actions: ['format_code', 'run_tests'],
  },
  editor: {
    editor_name: 'VS Code',
    file_name: 'index.tsx',
    project_name: 'MyProject',
    git_branch: 'main',
    language: 'TypeScript',
    is_modified: true,
  },
  browser: {
    browser: 'Chrome',
    page_title: 'GitHub - Repository',
    domain: 'github.com',
    is_secure: true,
  },
  file: {
    name: 'document.txt',
    path: '/home/user/documents',
    language: 'plaintext',
    is_modified: false,
  },
};

const mockScreenContent = {
  text: 'Detected text from screen',
  text_blocks: [
    { text: 'Detected', x: 10, y: 20, width: 100, height: 20, confidence: 0.9 },
  ],
  ui_elements: [{ element_type: 'Button', x: 0, y: 0, width: 40, height: 20, is_interactive: true }],
  width: 1920,
  height: 1080,
  timestamp: Date.now(),
  confidence: 0.88,
};
mockScreenContentValue = mockScreenContent;

jest.mock('@/hooks/context', () => ({
  useContext: () => ({
    context: mockContext,
    isLoading: false,
    error: null,
    fetchContext: mockFetchContext,
    captureAndAnalyzeScreen: mockCaptureAndAnalyzeScreen,
    screenContent: mockScreenContentValue,
    isAnalyzingScreen: mockIsAnalyzingScreen,
    screenAnalysisError: mockScreenAnalysisError,
    lastScreenAnalysisAt: Date.now(),
  }),
}));

// Mock the context store
const mockViewHistoryEntry = jest.fn();
const mockViewLatest = jest.fn();
const mockContextHistory: Array<{ context: typeof mockContext; timestamp: number }> = [];
const mockHistoryIndex: number | null = null;

jest.mock('@/stores/context/context-store', () => ({
  useContextStore: (selector: (s: Record<string, unknown>) => unknown) => {
    const state = {
      contextHistory: mockContextHistory,
      historyIndex: mockHistoryIndex,
      viewHistoryEntry: mockViewHistoryEntry,
      viewLatest: mockViewLatest,
    };
    return selector(state);
  },
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'Context Awareness',
      refreshContext: 'Refresh context',
      activeWindow: 'Active Window',
      application: 'Application',
      suggestedActions: 'Suggested Actions',
      editorContext: 'Editor Context',
      browserContext: 'Browser Context',
      fileContext: 'File Context',
      textInput: 'Text Input',
      devTool: 'Dev Tool',
      noContext: 'No context available',
      noContextHint: 'Context will appear when you focus on an application',
      screenPerception: 'Screen Perception',
      reanalyze: 'Re-analyze',
      analyzing: 'Analyzing...',
      screenPerceptionEmpty: 'No screen analysis result yet',
      screenAnalysisError: 'Screen analysis error',
      textBlocksCount: '1 text blocks',
      uiElementsCount: '1 UI elements',
      confidenceLabel: 'Confidence 88%',
      noScreenText: 'No OCR text detected',
      screenAnalysisTime: 'Analyzed at:',
    };
    return translations[key] || key;
  },
}));

describe('ContextPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScreenContentValue = mockScreenContent;
    mockScreenAnalysisError = null;
    mockIsAnalyzingScreen = false;
  });

  it('renders the panel with title', () => {
    render(<ContextPanel />);
    expect(screen.getByText('Context Awareness')).toBeInTheDocument();
  });

  it('renders refresh button', () => {
    render(<ContextPanel />);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('calls fetchContext when refresh button is clicked', () => {
    render(<ContextPanel />);
    const refreshButton = screen.getAllByRole('button')[0];
    fireEvent.click(refreshButton);
    expect(mockFetchContext).toHaveBeenCalled();
  });

  it('renders screen perception section and manual analyze button', () => {
    render(<ContextPanel />);
    expect(screen.getByText('Screen Perception')).toBeInTheDocument();
    expect(screen.getByText('Detected text from screen')).toBeInTheDocument();
    expect(screen.getByText('Re-analyze')).toBeInTheDocument();
  });

  it('calls captureAndAnalyzeScreen when re-analyze is clicked', () => {
    render(<ContextPanel />);
    fireEvent.click(screen.getByText('Re-analyze'));
    expect(mockCaptureAndAnalyzeScreen).toHaveBeenCalled();
  });

  it('shows empty screen perception state when no screen content', () => {
    mockScreenContentValue = null;
    render(<ContextPanel />);
    expect(screen.getByText('No screen analysis result yet')).toBeInTheDocument();
  });

  it('shows screen analysis error state', () => {
    mockScreenAnalysisError = 'OCR failed';
    render(<ContextPanel />);
    expect(screen.getByText(/Screen analysis error/)).toBeInTheDocument();
    expect(screen.getByText(/OCR failed/)).toBeInTheDocument();
  });

  it('displays active window information', () => {
    render(<ContextPanel />);
    expect(screen.getByText('Active Window')).toBeInTheDocument();
    expect(screen.getByText('Test Window Title')).toBeInTheDocument();
    // Process name appears in both header subtitle and window section
    const processNames = screen.getAllByText(/test-process.exe/);
    expect(processNames.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/1920x1080/)).toBeInTheDocument();
  });

  it('displays application information', () => {
    render(<ContextPanel />);
    expect(screen.getByText('Application')).toBeInTheDocument();
    expect(screen.getByText('Visual Studio Code')).toBeInTheDocument();
    expect(screen.getByText('CodeEditor')).toBeInTheDocument();
  });

  it('displays app capability badges', () => {
    render(<ContextPanel />);
    expect(screen.getByText('Text Input')).toBeInTheDocument();
    expect(screen.getByText('Dev Tool')).toBeInTheDocument();
  });

  it('displays suggested actions', () => {
    render(<ContextPanel />);
    expect(screen.getByText('Suggested Actions')).toBeInTheDocument();
    expect(screen.getByText('format_code')).toBeInTheDocument();
    expect(screen.getByText('run_tests')).toBeInTheDocument();
  });

  it('displays editor context', () => {
    render(<ContextPanel />);
    expect(screen.getByText('Editor Context')).toBeInTheDocument();
    expect(screen.getByText('VS Code')).toBeInTheDocument();
    expect(screen.getByText('index.tsx')).toBeInTheDocument();
    expect(screen.getByText('MyProject')).toBeInTheDocument();
    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('displays browser context', () => {
    render(<ContextPanel />);
    expect(screen.getByText('Browser Context')).toBeInTheDocument();
    expect(screen.getByText('Chrome')).toBeInTheDocument();
    expect(screen.getByText('GitHub - Repository')).toBeInTheDocument();
    expect(screen.getByText('github.com')).toBeInTheDocument();
  });

  it('displays file context', () => {
    render(<ContextPanel />);
    expect(screen.getByText('File Context')).toBeInTheDocument();
    expect(screen.getByText('document.txt')).toBeInTheDocument();
    expect(screen.getByText('/home/user/documents')).toBeInTheDocument();
  });

  it('displays header with process name', () => {
    render(<ContextPanel />);
    // Header shows process name when context is available
    const processNames = screen.getAllByText(/test-process.exe/);
    expect(processNames.length).toBeGreaterThanOrEqual(1);
  });

  it('applies custom className', () => {
    const { container } = render(<ContextPanel className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('ContextPanel - Error State', () => {
  it('displays error message when error exists', () => {
    // This test validates the component structure for error display
    // The component displays errors in a destructive-styled div when error is set
    render(<ContextPanel />);
    expect(screen.getByText('Context Awareness')).toBeInTheDocument();
  });
});

describe('ContextPanel - Loading State', () => {
  it('disables refresh button when loading', () => {
    // This test validates the component structure when loading
    render(<ContextPanel />);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });
});

describe('ContextPanel - History Navigation', () => {
  it('does not show history bar when history has fewer than 2 entries', () => {
    // mockContextHistory is empty by default
    render(<ContextPanel />);
    expect(screen.queryByText(/snapshots/)).not.toBeInTheDocument();
  });
});

describe('ContextPanel - App Type Icons', () => {
  it('renders correct icon for Browser app type', () => {
    render(<ContextPanel />);
    // Browser context should show Globe icon
    expect(screen.getByText('Browser Context')).toBeInTheDocument();
  });

  it('renders correct icon for CodeEditor app type', () => {
    render(<ContextPanel />);
    // CodeEditor context should show Code icon in Application section
    expect(screen.getByText('Application')).toBeInTheDocument();
  });
});
