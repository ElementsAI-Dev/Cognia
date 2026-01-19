/**
 * Slide Editor Component Tests
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SlideEditor } from './slide-editor';
import type { SlideEditorProps } from '../types';
import type { PPTSlide, PPTTheme } from '@/types/workflow';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock the store
const mockStore = {
  updateSlide: jest.fn(),
  addElement: jest.fn(),
  updateElement: jest.fn(),
  deleteElement: jest.fn(),
  selection: { elementIds: [] as string[] },
  selectElement: jest.fn(),
  clearSelection: jest.fn(),
  startEditing: jest.fn(),
  stopEditing: jest.fn(),
};

jest.mock('@/stores/tools/ppt-editor-store', () => ({
  usePPTEditorStore: () => mockStore,
}));

const mockTheme: PPTTheme = {
  id: 'modern-light',
  name: 'Modern Light',
  primaryColor: '#2563EB',
  secondaryColor: '#1D4ED8',
  accentColor: '#3B82F6',
  backgroundColor: '#FFFFFF',
  textColor: '#1E293B',
  headingFont: 'Inter',
  bodyFont: 'Inter',
  codeFont: 'JetBrains Mono',
};

const createMockSlide = (overrides: Partial<PPTSlide> = {}): PPTSlide => ({
  id: 'slide-1',
  order: 0,
  layout: 'title-content',
  title: 'Test Title',
  subtitle: 'Test Subtitle',
  content: 'Test content here',
  bullets: ['Bullet 1', 'Bullet 2', 'Bullet 3'],
  notes: 'Speaker notes',
  elements: [],
  ...overrides,
});

const renderSlideEditor = (props: Partial<SlideEditorProps> = {}) => {
  const defaultProps: SlideEditorProps = {
    slide: createMockSlide(),
    theme: mockTheme,
    isEditing: true,
    ...props,
  };
  return render(<SlideEditor {...defaultProps} />);
};

describe('SlideEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.selection = { elementIds: [] };
  });

  describe('Rendering', () => {
    it('should render slide title', () => {
      renderSlideEditor();
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('should render slide subtitle for supported layouts', () => {
      renderSlideEditor({ slide: createMockSlide({ layout: 'title' }) });
      expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    });

    it('should render content for content layouts', () => {
      renderSlideEditor({ slide: createMockSlide({ layout: 'title-content' }) });
      expect(screen.getByText('Test content here')).toBeInTheDocument();
    });

    it('should render bullet points', () => {
      renderSlideEditor();
      expect(screen.getByText('Bullet 1')).toBeInTheDocument();
      expect(screen.getByText('Bullet 2')).toBeInTheDocument();
      expect(screen.getByText('Bullet 3')).toBeInTheDocument();
    });

    it('should render add bullet button when editing', () => {
      renderSlideEditor({ isEditing: true });
      expect(screen.getByText('addBullet')).toBeInTheDocument();
    });

    it('should not render add bullet button when not editing', () => {
      renderSlideEditor({ isEditing: false });
      expect(screen.queryByText('addBullet')).not.toBeInTheDocument();
    });

    it('should render add element button when editing', () => {
      renderSlideEditor({ isEditing: true });
      expect(screen.getByText('addElement')).toBeInTheDocument();
    });

    it('should not render add element button when not editing', () => {
      renderSlideEditor({ isEditing: false });
      expect(screen.queryByText('addElement')).not.toBeInTheDocument();
    });

    it('should render layout indicator', () => {
      renderSlideEditor({ slide: createMockSlide({ layout: 'bullets' }) });
      // Layout name should be shown - actual text is "Bullet Points"
      expect(screen.getByText(/Bullet Points/i)).toBeInTheDocument();
    });

    it('should apply theme background color', () => {
      const { container } = renderSlideEditor();
      const slideContainer = container.firstChild;
      expect(slideContainer).toHaveStyle({ backgroundColor: mockTheme.backgroundColor });
    });

    it('should apply slide background color when specified', () => {
      const { container } = renderSlideEditor({
        slide: createMockSlide({ backgroundColor: '#FF0000' }),
      });
      const slideContainer = container.firstChild;
      expect(slideContainer).toHaveStyle({ backgroundColor: '#FF0000' });
    });
  });

  describe('Title Editing', () => {
    it('should show placeholder when title is empty', () => {
      renderSlideEditor({ slide: createMockSlide({ title: undefined }) });
      expect(screen.getByText('clickToAddTitle')).toBeInTheDocument();
    });

    it('should enter edit mode when title is clicked', async () => {
      renderSlideEditor();
      
      const title = screen.getByText('Test Title');
      await userEvent.click(title);
      
      // Input should appear
      const input = screen.getByDisplayValue('Test Title');
      expect(input).toBeInTheDocument();
    });

    it('should update title on change', async () => {
      renderSlideEditor();
      
      const title = screen.getByText('Test Title');
      await userEvent.click(title);
      
      const input = screen.getByDisplayValue('Test Title');
      await userEvent.clear(input);
      await userEvent.type(input, 'New Title');
      
      expect(mockStore.updateSlide).toHaveBeenCalledWith(
        'slide-1',
        expect.objectContaining({ title: expect.any(String) })
      );
    });
  });

  describe('Subtitle Editing', () => {
    it('should show placeholder when subtitle is empty', () => {
      renderSlideEditor({ slide: createMockSlide({ subtitle: undefined, layout: 'title' }) });
      expect(screen.getByText('clickToAddSubtitle')).toBeInTheDocument();
    });

    it('should enter edit mode when subtitle is clicked', async () => {
      renderSlideEditor({ slide: createMockSlide({ layout: 'title' }) });
      
      const subtitle = screen.getByText('Test Subtitle');
      await userEvent.click(subtitle);
      
      const input = screen.getByDisplayValue('Test Subtitle');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Content Editing', () => {
    it('should show placeholder when content is empty', () => {
      renderSlideEditor({ 
        slide: createMockSlide({ content: undefined, layout: 'title-content' }) 
      });
      expect(screen.getByText('clickToAddContent')).toBeInTheDocument();
    });

    it('should enter edit mode when content is clicked', async () => {
      renderSlideEditor({ slide: createMockSlide({ layout: 'title-content' }) });
      
      const content = screen.getByText('Test content here');
      await userEvent.click(content);
      
      // Textarea should appear
      const textarea = screen.getByDisplayValue('Test content here');
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('Bullet Editing', () => {
    it('should enter edit mode when bullet is clicked', async () => {
      renderSlideEditor();
      
      const bullet = screen.getByText('Bullet 1');
      await userEvent.click(bullet);
      
      const input = screen.getByDisplayValue('Bullet 1');
      expect(input).toBeInTheDocument();
    });

    it('should add new bullet when add button is clicked', async () => {
      renderSlideEditor();
      
      const addButton = screen.getByText('addBullet');
      await userEvent.click(addButton);
      
      expect(mockStore.updateSlide).toHaveBeenCalledWith(
        'slide-1',
        expect.objectContaining({ bullets: expect.any(Array) })
      );
    });

    it('should show delete button on bullet hover', async () => {
      renderSlideEditor();
      
      // Click to edit bullet first
      const bullet = screen.getByText('Bullet 1');
      await userEvent.click(bullet);
      
      // Delete button should be visible
      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(btn => 
        btn.querySelector('svg.lucide-trash-2')
      );
      expect(deleteButton).toBeInTheDocument();
    });
  });

  describe('Element Management', () => {
    it('should open add element popover when button is clicked', async () => {
      renderSlideEditor();
      
      const addButton = screen.getByText('addElement');
      await userEvent.click(addButton);
      
      // Element type options should appear
      expect(screen.getByText('text')).toBeInTheDocument();
      expect(screen.getByText('image')).toBeInTheDocument();
      expect(screen.getByText('shape')).toBeInTheDocument();
    });

    it('should add text element', async () => {
      renderSlideEditor();
      
      const addButton = screen.getByText('addElement');
      await userEvent.click(addButton);
      
      const textOption = screen.getByText('text');
      await userEvent.click(textOption);
      
      expect(mockStore.addElement).toHaveBeenCalledWith(
        'slide-1',
        expect.objectContaining({ type: 'text' })
      );
    });

    it('should add image element', async () => {
      renderSlideEditor();
      
      const addButton = screen.getByText('addElement');
      await userEvent.click(addButton);
      
      const imageOption = screen.getByText('image');
      await userEvent.click(imageOption);
      
      expect(mockStore.addElement).toHaveBeenCalledWith(
        'slide-1',
        expect.objectContaining({ type: 'image' })
      );
    });

    it('should add shape element', async () => {
      renderSlideEditor();
      
      const addButton = screen.getByText('addElement');
      await userEvent.click(addButton);
      
      const shapeOption = screen.getByText('shape');
      await userEvent.click(shapeOption);
      
      expect(mockStore.addElement).toHaveBeenCalledWith(
        'slide-1',
        expect.objectContaining({ type: 'shape' })
      );
    });

    it('should add chart element', async () => {
      renderSlideEditor();
      
      const addButton = screen.getByText('addElement');
      await userEvent.click(addButton);
      
      const chartOption = screen.getByText('chart');
      await userEvent.click(chartOption);
      
      expect(mockStore.addElement).toHaveBeenCalledWith(
        'slide-1',
        expect.objectContaining({ type: 'chart' })
      );
    });

    it('should add table element', async () => {
      renderSlideEditor();
      
      const addButton = screen.getByText('addElement');
      await userEvent.click(addButton);
      
      const tableOption = screen.getByText('table');
      await userEvent.click(tableOption);
      
      expect(mockStore.addElement).toHaveBeenCalledWith(
        'slide-1',
        expect.objectContaining({ type: 'table' })
      );
    });

    it('should add code element', async () => {
      renderSlideEditor();
      
      const addButton = screen.getByText('addElement');
      await userEvent.click(addButton);
      
      const codeOption = screen.getByText('code');
      await userEvent.click(codeOption);
      
      expect(mockStore.addElement).toHaveBeenCalledWith(
        'slide-1',
        expect.objectContaining({ type: 'code' })
      );
    });

    it('should render existing elements', () => {
      const slide = createMockSlide({
        elements: [
          { id: 'el-1', type: 'text', content: 'Custom Text', position: { x: 10, y: 10, width: 20, height: 10 } },
        ],
      });
      
      renderSlideEditor({ slide });
      
      expect(screen.getByText('Custom Text')).toBeInTheDocument();
    });
  });

  describe('Selection and Click Handling', () => {
    it('should clear selection when background is clicked', async () => {
      const { container } = renderSlideEditor();
      
      const slideContainer = container.firstChild as HTMLElement;
      await userEvent.click(slideContainer);
      
      expect(mockStore.clearSelection).toHaveBeenCalled();
      expect(mockStore.stopEditing).toHaveBeenCalled();
    });

    it('should select element when clicked', async () => {
      const slide = createMockSlide({
        elements: [
          { id: 'el-1', type: 'text', content: 'Click me', position: { x: 10, y: 10, width: 20, height: 10 } },
        ],
      });
      
      renderSlideEditor({ slide });
      
      const element = screen.getByText('Click me');
      await userEvent.click(element);
      
      expect(mockStore.selectElement).toHaveBeenCalledWith('el-1');
    });
  });

  describe('Layout-specific Rendering', () => {
    it('should render title layout with centered text', () => {
      renderSlideEditor({ slide: createMockSlide({ layout: 'title' }) });
      
      // Title should be present
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    });

    it('should render section layout', () => {
      renderSlideEditor({ slide: createMockSlide({ layout: 'section' }) });
      
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    });

    it('should render quote layout', () => {
      renderSlideEditor({ 
        slide: createMockSlide({ layout: 'quote', content: 'Famous quote here' }) 
      });
      
      expect(screen.getByText('Famous quote here')).toBeInTheDocument();
    });

    it('should render numbered layout with numbers', () => {
      renderSlideEditor({ slide: createMockSlide({ layout: 'numbered' }) });
      
      // Should show numbered bullets
      expect(screen.getByText('1.')).toBeInTheDocument();
      expect(screen.getByText('2.')).toBeInTheDocument();
      expect(screen.getByText('3.')).toBeInTheDocument();
    });

    it('should not render title for blank layout', () => {
      renderSlideEditor({ slide: createMockSlide({ layout: 'blank' }) });
      
      // Title should not be rendered for blank layout
      expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
    });
  });

  describe('Background Image', () => {
    it('should render background image when specified', () => {
      const { container } = renderSlideEditor({
        slide: createMockSlide({ backgroundImage: 'https://example.com/bg.jpg' }),
      });
      
      const slideContainer = container.firstChild as HTMLElement;
      expect(slideContainer.style.backgroundImage).toContain('https://example.com/bg.jpg');
    });

    it('should render overlay for background image', () => {
      const { container } = renderSlideEditor({
        slide: createMockSlide({ backgroundImage: 'https://example.com/bg.jpg' }),
      });
      
      // Should have overlay div
      const overlay = container.querySelector('.bg-black\\/20');
      expect(overlay).toBeInTheDocument();
    });
  });

  describe('Not Editing Mode', () => {
    it('should not show edit UI when not editing', () => {
      renderSlideEditor({ isEditing: false });
      
      // Click on title should not trigger edit mode
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('should not show add buttons when not editing', () => {
      renderSlideEditor({ isEditing: false });
      
      expect(screen.queryByText('addBullet')).not.toBeInTheDocument();
      expect(screen.queryByText('addElement')).not.toBeInTheDocument();
    });
  });
});
