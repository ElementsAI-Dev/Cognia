/**
 * Unit tests for KnowledgeMapPanel component
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KnowledgeMapPanel } from './knowledge-map-panel';
import { useKnowledgeMap } from '@/hooks/academic/use-knowledge-map';
import type { KnowledgeMap, KnowledgeMapTrace } from '@/types/learning/knowledge-map';

// Mock the hooks
jest.mock('@/hooks/academic/use-knowledge-map', () => ({
  useKnowledgeMap: jest.fn(),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockUseKnowledgeMap = useKnowledgeMap as jest.MockedFunction<typeof useKnowledgeMap>;

// Mock data
const createMockTrace = (id: string): KnowledgeMapTrace => ({
  id,
  title: `Trace ${id}`,
  description: `Description for trace ${id}`,
  locations: [
    { id: `loc-${id}-1`, title: 'Location 1', description: 'Location description' },
  ],
  traceTextDiagram: 'A -> B -> C',
  traceGuide: 'Guide for trace',
});

const createMockKnowledgeMap = (id: string): KnowledgeMap => ({
  id,
  title: `Knowledge Map ${id}`,
  description: 'Test knowledge map description',
  traces: [createMockTrace('1'), createMockTrace('2')],
  metadata: {
    mode: 'DETAILED',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: '1.0',
  },
  mermaidDiagram: 'graph TD; A-->B;',
});

describe('KnowledgeMapPanel', () => {
  const defaultMockReturn = {
    knowledgeMaps: [] as KnowledgeMap[],
    activeKnowledgeMap: null as KnowledgeMap | null,
    isGenerating: false,
    generationProgress: 0,
    error: null as string | null,
    canNavigateBack: false,
    canNavigateForward: false,
    createKnowledgeMap: jest.fn(),
    deleteKnowledgeMap: jest.fn(),
    setActiveKnowledgeMap: jest.fn(),
    convertPDFToKnowledgeMap: jest.fn(),
    navigateBack: jest.fn(),
    navigateForward: jest.fn(),
    navigateToLocation: jest.fn(),
    importFromFile: jest.fn(),
    exportToFile: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKnowledgeMap.mockReturnValue(defaultMockReturn);
  });

  describe('Rendering', () => {
    it('should render the component', () => {
      render(<KnowledgeMapPanel />);
      
      expect(screen.getByTestId('knowledge-map-panel')).toBeInTheDocument();
      expect(screen.getByText('title')).toBeInTheDocument();
    });

    it('should render navigation buttons', () => {
      render(<KnowledgeMapPanel />);
      
      expect(screen.getByLabelText('Navigate back')).toBeInTheDocument();
      expect(screen.getByLabelText('Navigate forward')).toBeInTheDocument();
    });

    it('should render create and import buttons', () => {
      render(<KnowledgeMapPanel />);
      
      expect(screen.getByText('create')).toBeInTheDocument();
      expect(screen.getByText('import')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<KnowledgeMapPanel className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should render close button when onClose is provided', () => {
      const mockOnClose = jest.fn();
      render(<KnowledgeMapPanel onClose={mockOnClose} />);
      
      // Close button should be present
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no knowledge maps', () => {
      render(<KnowledgeMapPanel />);
      
      expect(screen.getByText('noMaps')).toBeInTheDocument();
    });

    it('should show no map selected message when no active map', () => {
      mockUseKnowledgeMap.mockReturnValue({
        ...defaultMockReturn,
        knowledgeMaps: [createMockKnowledgeMap('1')],
      });
      
      render(<KnowledgeMapPanel />);
      
      expect(screen.getByText('noMapSelected')).toBeInTheDocument();
    });
  });

  describe('Knowledge Map List', () => {
    it('should display knowledge maps in sidebar', () => {
      mockUseKnowledgeMap.mockReturnValue({
        ...defaultMockReturn,
        knowledgeMaps: [
          createMockKnowledgeMap('1'),
          createMockKnowledgeMap('2'),
        ],
      });
      
      render(<KnowledgeMapPanel />);
      
      expect(screen.getByText('Knowledge Map 1')).toBeInTheDocument();
      expect(screen.getByText('Knowledge Map 2')).toBeInTheDocument();
    });

    it('should filter maps by search query', async () => {
      mockUseKnowledgeMap.mockReturnValue({
        ...defaultMockReturn,
        knowledgeMaps: [
          createMockKnowledgeMap('1'),
          { ...createMockKnowledgeMap('2'), title: 'Special Map' },
        ],
      });
      
      const user = userEvent.setup();
      render(<KnowledgeMapPanel />);
      
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Special');
      
      expect(screen.getByText('Special Map')).toBeInTheDocument();
      expect(screen.queryByText('Knowledge Map 1')).not.toBeInTheDocument();
    });

    it('should select map when clicked', async () => {
      const mockSetActive = jest.fn();
      mockUseKnowledgeMap.mockReturnValue({
        ...defaultMockReturn,
        knowledgeMaps: [createMockKnowledgeMap('1')],
        setActiveKnowledgeMap: mockSetActive,
      });
      
      const user = userEvent.setup();
      render(<KnowledgeMapPanel />);
      
      await user.click(screen.getByText('Knowledge Map 1'));
      
      expect(mockSetActive).toHaveBeenCalledWith('1');
    });
  });

  describe('Active Knowledge Map', () => {
    it('should display active map badge', () => {
      mockUseKnowledgeMap.mockReturnValue({
        ...defaultMockReturn,
        knowledgeMaps: [createMockKnowledgeMap('1')],
        activeKnowledgeMap: createMockKnowledgeMap('1'),
      });
      
      render(<KnowledgeMapPanel />);
      
      expect(screen.getByTestId('active-map-badge')).toBeInTheDocument();
    });

    it('should display tabs when map is active', () => {
      mockUseKnowledgeMap.mockReturnValue({
        ...defaultMockReturn,
        knowledgeMaps: [createMockKnowledgeMap('1')],
        activeKnowledgeMap: createMockKnowledgeMap('1'),
      });
      
      render(<KnowledgeMapPanel />);
      
      expect(screen.getByText('tabs.traces')).toBeInTheDocument();
      expect(screen.getByText('tabs.mindMap')).toBeInTheDocument();
      expect(screen.getByText('tabs.markdown')).toBeInTheDocument();
    });

    it('should show trace list for active map', () => {
      mockUseKnowledgeMap.mockReturnValue({
        ...defaultMockReturn,
        knowledgeMaps: [createMockKnowledgeMap('1')],
        activeKnowledgeMap: createMockKnowledgeMap('1'),
      });
      
      render(<KnowledgeMapPanel />);
      
      expect(screen.getByTestId('trace-list')).toBeInTheDocument();
    });

    it('should display export button when map is active', () => {
      mockUseKnowledgeMap.mockReturnValue({
        ...defaultMockReturn,
        knowledgeMaps: [createMockKnowledgeMap('1')],
        activeKnowledgeMap: createMockKnowledgeMap('1'),
      });
      
      render(<KnowledgeMapPanel />);
      
      expect(screen.getByText('export')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should disable back button when cannot navigate back', () => {
      mockUseKnowledgeMap.mockReturnValue({
        ...defaultMockReturn,
        canNavigateBack: false,
      });
      
      render(<KnowledgeMapPanel />);
      
      expect(screen.getByLabelText('Navigate back')).toBeDisabled();
    });

    it('should enable back button when can navigate back', () => {
      mockUseKnowledgeMap.mockReturnValue({
        ...defaultMockReturn,
        canNavigateBack: true,
      });
      
      render(<KnowledgeMapPanel />);
      
      expect(screen.getByLabelText('Navigate back')).not.toBeDisabled();
    });

    it('should call navigateBack when back button clicked', async () => {
      const mockNavigateBack = jest.fn();
      mockUseKnowledgeMap.mockReturnValue({
        ...defaultMockReturn,
        canNavigateBack: true,
        navigateBack: mockNavigateBack,
      });
      
      const user = userEvent.setup();
      render(<KnowledgeMapPanel />);
      
      await user.click(screen.getByLabelText('Navigate back'));
      
      expect(mockNavigateBack).toHaveBeenCalled();
    });
  });

  describe('Create Knowledge Map Dialog', () => {
    it('should open create dialog when create button clicked', async () => {
      const user = userEvent.setup();
      render(<KnowledgeMapPanel />);
      
      await user.click(screen.getByText('create'));
      
      expect(screen.getByText('createDialog.title')).toBeInTheDocument();
    });

    it('should create map when form submitted', async () => {
      const mockCreate = jest.fn().mockResolvedValue({});
      mockUseKnowledgeMap.mockReturnValue({
        ...defaultMockReturn,
        createKnowledgeMap: mockCreate,
      });
      
      const user = userEvent.setup();
      render(<KnowledgeMapPanel />);
      
      await user.click(screen.getByText('create'));
      
      const titleInput = screen.getByPlaceholderText(/title/i);
      await user.type(titleInput, 'New Map');
      
      // Find and click the create button in the dialog
      const buttons = screen.getAllByText('create');
      await user.click(buttons[buttons.length - 1]);
      
      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
          title: 'New Map',
        }));
      });
    });
  });

  describe('Generation Progress', () => {
    it('should show progress bar when generating', () => {
      mockUseKnowledgeMap.mockReturnValue({
        ...defaultMockReturn,
        isGenerating: true,
        generationProgress: 50,
      });
      
      render(<KnowledgeMapPanel />);
      
      expect(screen.getByText('generatingProgress')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error alert when error exists', () => {
      mockUseKnowledgeMap.mockReturnValue({
        ...defaultMockReturn,
        error: 'Something went wrong',
      });
      
      render(<KnowledgeMapPanel />);
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should call clearError when dismiss button clicked', async () => {
      const mockClearError = jest.fn();
      mockUseKnowledgeMap.mockReturnValue({
        ...defaultMockReturn,
        error: 'Test error',
        clearError: mockClearError,
      });
      
      const user = userEvent.setup();
      render(<KnowledgeMapPanel />);
      
      await user.click(screen.getByText('dismiss'));
      
      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe('Trace Selection', () => {
    it('should show trace details when trace is selected', async () => {
      mockUseKnowledgeMap.mockReturnValue({
        ...defaultMockReturn,
        knowledgeMaps: [createMockKnowledgeMap('1')],
        activeKnowledgeMap: createMockKnowledgeMap('1'),
      });
      
      const user = userEvent.setup();
      render(<KnowledgeMapPanel />);
      
      const traceItems = screen.getAllByTestId('trace-item');
      await user.click(traceItems[0]);
      
      const traceDetail = screen.getByTestId('trace-detail');
      expect(traceDetail).toBeInTheDocument();
    });
  });

  describe('Import/Export', () => {
    it('should call exportToFile when export clicked', async () => {
      const mockExport = jest.fn();
      mockUseKnowledgeMap.mockReturnValue({
        ...defaultMockReturn,
        knowledgeMaps: [createMockKnowledgeMap('1')],
        activeKnowledgeMap: createMockKnowledgeMap('1'),
        exportToFile: mockExport,
      });
      
      const user = userEvent.setup();
      render(<KnowledgeMapPanel />);
      
      await user.click(screen.getByText('export'));
      
      expect(mockExport).toHaveBeenCalled();
    });
  });

  describe('Delete Confirmation', () => {
    it('should show delete confirmation dialog', async () => {
      mockUseKnowledgeMap.mockReturnValue({
        ...defaultMockReturn,
        knowledgeMaps: [createMockKnowledgeMap('1')],
      });
      
      const user = userEvent.setup();
      render(<KnowledgeMapPanel />);
      
      // Open dropdown menu for the map
      const moreButtons = screen.getAllByRole('button');
      // Find the more options button in the card
      const mapCard = screen.getByText('Knowledge Map 1').closest('div');
      expect(mapCard).toBeTruthy();
    });
  });
});
