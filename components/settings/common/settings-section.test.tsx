/**
 * Settings Section components tests
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  SettingsCard,
  SettingsRow,
  SettingsToggle,
  SettingsGrid,
  SettingsDivider,
  SettingsGroup,
  SaveButton,
  SettingsPageHeader,
  SettingsAlert,
  SettingsEmptyState,
} from './settings-section';

describe('SettingsCard', () => {
  it('renders title and children', () => {
    render(
      <SettingsCard title="Test Card">
        <div>Card content</div>
      </SettingsCard>
    );
    
    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders with icon', () => {
    render(
      <SettingsCard title="Card with Icon" icon={<span data-testid="icon">🔧</span>}>
        <div>Content</div>
      </SettingsCard>
    );
    
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders with description', () => {
    render(
      <SettingsCard title="Card" description="This is a description">
        <div>Content</div>
      </SettingsCard>
    );
    
    expect(screen.getByText('This is a description')).toBeInTheDocument();
  });

  it('renders with badge', () => {
    render(
      <SettingsCard title="Card" badge="New">
        <div>Content</div>
      </SettingsCard>
    );
    
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('renders with header action', () => {
    render(
      <SettingsCard title="Card" headerAction={<button>Action</button>}>
        <div>Content</div>
      </SettingsCard>
    );
    
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });
});

describe('SettingsRow', () => {
  it('renders label and children', () => {
    render(
      <SettingsRow label="Test Row">
        <span>Child element</span>
      </SettingsRow>
    );
    
    expect(screen.getByText('Test Row')).toBeInTheDocument();
    expect(screen.getByText('Child element')).toBeInTheDocument();
  });

  it('renders with description', () => {
    render(
      <SettingsRow label="Row" description="Row description">
        <span>Content</span>
      </SettingsRow>
    );
    
    expect(screen.getByText('Row description')).toBeInTheDocument();
  });

  it('renders with icon', () => {
    render(
      <SettingsRow label="Row" icon={<span data-testid="row-icon">📝</span>}>
        <span>Content</span>
      </SettingsRow>
    );
    
    expect(screen.getByTestId('row-icon')).toBeInTheDocument();
  });

  it('applies disabled styling', () => {
    const { container } = render(
      <SettingsRow label="Disabled Row" disabled>
        <span>Content</span>
      </SettingsRow>
    );
    
    const row = container.firstChild;
    expect(row).toHaveClass('opacity-50');
  });
});

describe('SettingsToggle', () => {
  it('renders toggle with label', () => {
    const handleChange = jest.fn();
    render(
      <SettingsToggle
        id="test-toggle"
        label="Toggle Label"
        checked={false}
        onCheckedChange={handleChange}
      />
    );
    
    expect(screen.getByText('Toggle Label')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('calls onCheckedChange when toggled', () => {
    const handleChange = jest.fn();
    render(
      <SettingsToggle
        id="test-toggle"
        label="Toggle"
        checked={false}
        onCheckedChange={handleChange}
      />
    );
    
    fireEvent.click(screen.getByRole('switch'));
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders in checked state', () => {
    render(
      <SettingsToggle
        id="test-toggle"
        label="Toggle"
        checked={true}
        onCheckedChange={() => {}}
      />
    );
    
    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('renders disabled state', () => {
    render(
      <SettingsToggle
        id="test-toggle"
        label="Toggle"
        checked={false}
        onCheckedChange={() => {}}
        disabled
      />
    );
    
    expect(screen.getByRole('switch')).toBeDisabled();
  });
});

describe('SettingsGrid', () => {
  it('renders children in grid', () => {
    render(
      <SettingsGrid>
        <div>Item 1</div>
        <div>Item 2</div>
      </SettingsGrid>
    );
    
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('applies correct column classes', () => {
    const { container } = render(
      <SettingsGrid columns={3}>
        <div>Item</div>
      </SettingsGrid>
    );
    
    expect(container.firstChild).toHaveClass('lg:grid-cols-3');
  });
});

describe('SettingsDivider', () => {
  it('renders simple divider', () => {
    const { container } = render(<SettingsDivider />);
    
    // Separator uses data-orientation attribute for responsive height
    expect(container.querySelector('[data-slot="separator"]')).toBeInTheDocument();
  });

  it('renders divider with label', () => {
    render(<SettingsDivider label="Section" />);
    
    expect(screen.getByText('Section')).toBeInTheDocument();
  });
});

describe('SettingsGroup', () => {
  it('renders group title', () => {
    render(
      <SettingsGroup title="Group Title">
        <div>Group content</div>
      </SettingsGroup>
    );
    
    expect(screen.getByText('Group Title')).toBeInTheDocument();
  });

  it('renders with badge', () => {
    render(
      <SettingsGroup title="Group" badge="3">
        <div>Content</div>
      </SettingsGroup>
    );
    
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('toggles content visibility', () => {
    render(
      <SettingsGroup title="Collapsible Group" defaultOpen={false}>
        <div>Hidden content</div>
      </SettingsGroup>
    );
    
    // Group title should be visible
    expect(screen.getByText('Collapsible Group')).toBeInTheDocument();
    
    // Click to open
    fireEvent.click(screen.getByText('Collapsible Group'));
    
    // After clicking, content should be visible
    expect(screen.getByText('Hidden content')).toBeInTheDocument();
  });
});

describe('SaveButton', () => {
  it('renders with default text', () => {
    render(<SaveButton onClick={() => {}} />);
    
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('renders with custom text', () => {
    render(<SaveButton onClick={() => {}}>Submit</SaveButton>);
    
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('shows loading state when clicked', async () => {
    const mockOnClick = jest.fn((): Promise<void> => new Promise(resolve => setTimeout(resolve, 100)));
    render(<SaveButton onClick={mockOnClick} />);
    
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    
    expect(mockOnClick).toHaveBeenCalled();
  });

  it('is disabled when disabled prop is true', () => {
    render(<SaveButton onClick={() => {}} disabled />);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('SettingsPageHeader', () => {
  it('renders title', () => {
    render(<SettingsPageHeader title="Page Title" />);
    
    expect(screen.getByText('Page Title')).toBeInTheDocument();
  });

  it('renders with description', () => {
    render(
      <SettingsPageHeader
        title="Title"
        description="Page description"
      />
    );
    
    expect(screen.getByText('Page description')).toBeInTheDocument();
  });

  it('renders with actions', () => {
    render(
      <SettingsPageHeader
        title="Title"
        actions={<button>Action Button</button>}
      />
    );
    
    expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument();
  });
});

describe('SettingsAlert', () => {
  it('renders alert content', () => {
    render(
      <SettingsAlert>
        Alert message
      </SettingsAlert>
    );
    
    expect(screen.getByText('Alert message')).toBeInTheDocument();
  });

  it('renders with title', () => {
    render(
      <SettingsAlert title="Alert Title">
        Content
      </SettingsAlert>
    );
    
    expect(screen.getByText('Alert Title')).toBeInTheDocument();
  });

  it('renders with action', () => {
    render(
      <SettingsAlert action={<button>Dismiss</button>}>
        Content
      </SettingsAlert>
    );
    
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  it('applies variant styles', () => {
    const { container } = render(
      <SettingsAlert variant="destructive">
        Error message
      </SettingsAlert>
    );
    
    // Using @ui/alert, check for the alert role and data-slot
    expect(container.querySelector('[data-slot="alert"]')).toBeInTheDocument();
  });
});

describe('SettingsEmptyState', () => {
  it('renders title', () => {
    render(<SettingsEmptyState title="No items" />);
    
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('renders with description', () => {
    render(
      <SettingsEmptyState
        title="Empty"
        description="No items found"
      />
    );
    
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders with action', () => {
    render(
      <SettingsEmptyState
        title="Empty"
        action={<button>Add Item</button>}
      />
    );
    
    expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
  });

  it('renders with icon', () => {
    render(
      <SettingsEmptyState
        title="Empty"
        icon={<span data-testid="empty-icon">📭</span>}
      />
    );
    
    expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
  });
});
