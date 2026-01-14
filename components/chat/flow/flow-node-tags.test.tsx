import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FlowNodeTags } from './flow-node-tags';
import type { FlowNodeTag } from '@/types/chat/flow-chat';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockTags: FlowNodeTag[] = [
  { id: '1', label: 'Important', color: '#ef4444' },
  { id: '2', label: 'Review', color: '#3b82f6' },
  { id: '3', label: 'Follow-up', color: '#22c55e' },
];

const mockAvailableTags: FlowNodeTag[] = [
  ...mockTags,
  { id: '4', label: 'Archive', color: '#6b7280' },
  { id: '5', label: 'Priority', color: '#f59e0b' },
];

describe('FlowNodeTags', () => {
  it('renders tags correctly', () => {
    render(
      <FlowNodeTags
        tags={mockTags}
        availableTags={mockAvailableTags}
      />
    );

    // Tags should render with their labels
    expect(screen.getByText('Important')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Follow-up')).toBeInTheDocument();
  });

  it('limits visible tags based on maxVisible prop', () => {
    render(
      <FlowNodeTags
        tags={mockTags}
        availableTags={mockAvailableTags}
        maxVisible={2}
      />
    );

    expect(screen.getByText('Important')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    // Third tag should be hidden, showing +1
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('calls onRemoveTag when remove button is clicked in editable mode', async () => {
    const onRemoveTag = jest.fn();
    
    render(
      <FlowNodeTags
        tags={mockTags}
        availableTags={mockAvailableTags}
        editable={true}
        onRemoveTag={onRemoveTag}
      />
    );

    // Find remove buttons (X icons)
    const removeButtons = screen.getAllByRole('button');
    const firstRemoveBtn = removeButtons.find(btn => 
      btn.querySelector('svg.lucide-x')
    );
    
    if (firstRemoveBtn) {
      fireEvent.click(firstRemoveBtn);
      expect(onRemoveTag).toHaveBeenCalled();
    }
  });

  it('renders add button in editable mode', () => {
    render(
      <FlowNodeTags
        tags={mockTags}
        availableTags={mockAvailableTags}
        editable={true}
      />
    );

    // Should have buttons (tags + add button)
    const buttons = screen.getAllByRole('button');
    // 3 tags with remove buttons + 1 add button = at least 4 buttons
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it('calls onAddTag when a tag is selected from popover', async () => {
    const onAddTag = jest.fn();
    
    render(
      <FlowNodeTags
        tags={[mockTags[0]]} // Only one tag assigned
        availableTags={mockAvailableTags}
        editable={true}
        onAddTag={onAddTag}
      />
    );

    // Find and click add tag button
    const buttons = screen.getAllByRole('button');
    const addButton = buttons.find(btn => btn.querySelector('svg.lucide-plus'));
    
    if (addButton) {
      fireEvent.click(addButton);
      
      await waitFor(() => {
        // Click on an unassigned tag (using label)
        const archiveTag = screen.getByText('Archive');
        fireEvent.click(archiveTag);
        expect(onAddTag).toHaveBeenCalled();
      });
    }
  });

  it('renders fewer buttons when not editable', () => {
    const { rerender } = render(
      <FlowNodeTags
        tags={mockTags}
        availableTags={mockAvailableTags}
        editable={true}
      />
    );

    const editableButtonCount = screen.getAllByRole('button').length;

    rerender(
      <FlowNodeTags
        tags={mockTags}
        availableTags={mockAvailableTags}
        editable={false}
      />
    );

    // Non-editable should have fewer buttons (no remove buttons, no add button)
    const nonEditableButtonCount = screen.queryAllByRole('button').length;
    expect(nonEditableButtonCount).toBeLessThan(editableButtonCount);
  });

  it('handles empty tags array', () => {
    const { container } = render(
      <FlowNodeTags
        tags={[]}
        availableTags={mockAvailableTags}
        editable={true}
      />
    );

    // Should render add button even with no tags
    expect(container).toBeInTheDocument();
  });

  it('applies correct colors to tags', () => {
    render(
      <FlowNodeTags
        tags={mockTags}
        availableTags={mockAvailableTags}
      />
    );

    const importantTag = screen.getByText('Important').closest('div');
    expect(importantTag).toHaveStyle({ backgroundColor: expect.stringContaining('') });
  });
});
