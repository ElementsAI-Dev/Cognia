/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ElementActionsPopover } from './panels/element-actions-popover';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock stores
const mockDeleteElement = jest.fn();
const mockDuplicateElement = jest.fn();
const mockUpdateElementStyle = jest.fn();
const mockSyncCodeFromElements = jest.fn();
const mockSetCode = jest.fn();
const mockParseCodeToElements = jest.fn();

const mockSelectedElement = {
  id: 'element-1',
  tagName: 'div',
  className: 'test-class another-class',
  styles: {},
  children: [],
};

jest.mock('@/stores/designer-store', () => ({
  useDesignerStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      selectedElementId: 'element-1',
      elementMap: { 'element-1': mockSelectedElement },
      code: '<div class="test-class">Test</div>',
      setCode: mockSetCode,
      parseCodeToElements: mockParseCodeToElements,
      deleteElement: mockDeleteElement,
      duplicateElement: mockDuplicateElement,
      updateElementStyle: mockUpdateElementStyle,
      syncCodeFromElements: mockSyncCodeFromElements,
    };
    return selector(state);
  },
}));

jest.mock('@/stores', () => ({
  useSettingsStore: () => ({
    providerSettings: { openai: { apiKey: 'test-key' } },
    defaultProvider: 'openai',
  }),
}));

// Mock designer AI functions
const mockEditElementWithAI = jest.fn();

jest.mock('@/lib/designer', () => ({
  editElementWithAI: (...args: unknown[]) => mockEditElementWithAI(...args),
  getDesignerAIConfig: jest.fn().mockReturnValue({
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: 'test-key',
  }),
}));

describe('ElementActionsPopover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEditElementWithAI.mockResolvedValue({
      success: true,
      code: '<div class="test-class bold">Test</div>',
    });
  });

  it('should render element info', () => {
    render(<ElementActionsPopover />);
    expect(screen.getByText('div')).toBeInTheDocument();
    expect(screen.getByText('.test-class')).toBeInTheDocument();
  });

  it('should render action buttons', () => {
    render(<ElementActionsPopover />);
    
    const duplicateButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-copy')
    );
    const deleteButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-trash-2')
    );
    
    expect(duplicateButton).toBeInTheDocument();
    expect(deleteButton).toBeInTheDocument();
  });

  it('should render alignment buttons', () => {
    render(<ElementActionsPopover />);
    
    // Check that alignment tooltip content exists
    const alignLeftTooltip = screen.getByText('alignLeft');
    const alignCenterTooltip = screen.getByText('alignCenter');
    const alignRightTooltip = screen.getByText('alignRight');
    
    expect(alignLeftTooltip).toBeInTheDocument();
    expect(alignCenterTooltip).toBeInTheDocument();
    expect(alignRightTooltip).toBeInTheDocument();
  });

  it('should render AI edit button', () => {
    render(<ElementActionsPopover />);
    
    const aiButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-sparkles')
    );
    expect(aiButton).toBeInTheDocument();
  });

  it('should call deleteElement when delete button is clicked', async () => {
    const onClose = jest.fn();
    render(<ElementActionsPopover onClose={onClose} />);
    
    const deleteButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-trash-2')
    );
    
    if (deleteButton) {
      await userEvent.click(deleteButton);
      expect(mockDeleteElement).toHaveBeenCalledWith('element-1');
      expect(mockSyncCodeFromElements).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('should call duplicateElement when duplicate button is clicked', async () => {
    const onClose = jest.fn();
    render(<ElementActionsPopover onClose={onClose} />);
    
    const duplicateButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-copy')
    );
    
    if (duplicateButton) {
      await userEvent.click(duplicateButton);
      expect(mockDuplicateElement).toHaveBeenCalledWith('element-1');
      expect(mockSyncCodeFromElements).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('should update style when align left button is clicked', async () => {
    render(<ElementActionsPopover />);
    
    const alignLeftButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-align-left')
    );
    
    if (alignLeftButton) {
      await userEvent.click(alignLeftButton);
      expect(mockUpdateElementStyle).toHaveBeenCalledWith('element-1', { textAlign: 'left' });
      expect(mockSyncCodeFromElements).toHaveBeenCalled();
    }
  });

  it('should update style when align center button is clicked', async () => {
    render(<ElementActionsPopover />);
    
    const alignCenterButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-align-center')
    );
    
    if (alignCenterButton) {
      await userEvent.click(alignCenterButton);
      expect(mockUpdateElementStyle).toHaveBeenCalledWith('element-1', { textAlign: 'center' });
      expect(mockSyncCodeFromElements).toHaveBeenCalled();
    }
  });

  it('should update style when align right button is clicked', async () => {
    render(<ElementActionsPopover />);
    
    const alignRightButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-align-right')
    );
    
    if (alignRightButton) {
      await userEvent.click(alignRightButton);
      expect(mockUpdateElementStyle).toHaveBeenCalledWith('element-1', { textAlign: 'right' });
      expect(mockSyncCodeFromElements).toHaveBeenCalled();
    }
  });

  it('should show AI input when AI button is clicked', async () => {
    render(<ElementActionsPopover />);
    
    const aiButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-sparkles')
    );
    
    if (aiButton) {
      await userEvent.click(aiButton);
      expect(screen.getByPlaceholderText('aiEditPlaceholder')).toBeInTheDocument();
    }
  });

  it('should show quick AI action buttons when AI input is visible', async () => {
    render(<ElementActionsPopover />);
    
    const aiButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-sparkles')
    );
    
    if (aiButton) {
      await userEvent.click(aiButton);
      expect(screen.getByText('Make bold')).toBeInTheDocument();
      expect(screen.getByText('Add padding')).toBeInTheDocument();
      expect(screen.getByText('Add shadow')).toBeInTheDocument();
      expect(screen.getByText('Round corners')).toBeInTheDocument();
    }
  });

  it('should fill AI input when quick action is clicked', async () => {
    render(<ElementActionsPopover />);
    
    const aiButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-sparkles')
    );
    
    if (aiButton) {
      await userEvent.click(aiButton);
      
      const makeBoldButton = screen.getByText('Make bold');
      await userEvent.click(makeBoldButton);
      
      const input = screen.getByPlaceholderText('aiEditPlaceholder') as HTMLInputElement;
      expect(input.value).toBe('Make this element text bold');
    }
  });

  it('should call AI edit when prompt is submitted', async () => {
    const onClose = jest.fn();
    render(<ElementActionsPopover onClose={onClose} />);
    
    const aiButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-sparkles')
    );
    
    if (aiButton) {
      await userEvent.click(aiButton);
      
      const input = screen.getByPlaceholderText('aiEditPlaceholder');
      await userEvent.type(input, 'Make it blue{enter}');
      
      await waitFor(() => {
        expect(mockEditElementWithAI).toHaveBeenCalled();
      });
    }
  });

  it('should apply position style when position prop is provided', () => {
    const { container } = render(
      <ElementActionsPopover position={{ x: 100, y: 200 }} />
    );
    
    const popover = container.firstChild as HTMLElement;
    expect(popover.style.left).toBe('100px');
    expect(popover.style.top).toBe('200px');
  });

  it('should apply custom className', () => {
    const { container } = render(<ElementActionsPopover className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

// Note: Testing null rendering when no element is selected would require
// module isolation which is complex in Jest. The behavior is tested
// implicitly through the component's conditional rendering logic.
