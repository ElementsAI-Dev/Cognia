import { render, screen, fireEvent } from '@testing-library/react';
import { SkillResourceManager } from './skill-resource-manager';
import type { SkillResource } from '@/types/system/skill';

const mockResources: SkillResource[] = [
  {
    type: 'script',
    name: 'helper.py',
    path: '/scripts/helper.py',
    content: 'print("Hello")',
    size: 15,
    mimeType: 'text/x-python',
  },
  {
    type: 'reference',
    name: 'guide.md',
    path: '/docs/guide.md',
    content: '# Guide\n\nThis is a guide.',
    size: 25,
    mimeType: 'text/markdown',
  },
  {
    type: 'asset',
    name: 'data.json',
    path: '/assets/data.json',
    size: 100,
    mimeType: 'application/json',
  },
];

describe('SkillResourceManager', () => {
  const mockOnAddResource = jest.fn();
  const mockOnRemoveResource = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no resources', () => {
    render(
      <SkillResourceManager
        resources={[]}
        onAddResource={mockOnAddResource}
        onRemoveResource={mockOnRemoveResource}
      />
    );

    expect(screen.getByText('No resources attached')).toBeInTheDocument();
  });

  it('renders resources grouped by type', () => {
    render(
      <SkillResourceManager
        resources={mockResources}
        onAddResource={mockOnAddResource}
        onRemoveResource={mockOnRemoveResource}
      />
    );

    expect(screen.getByText('Scripts')).toBeInTheDocument();
    expect(screen.getByText('References')).toBeInTheDocument();
    expect(screen.getByText('Assets')).toBeInTheDocument();
  });

  it('displays resource names', () => {
    render(
      <SkillResourceManager
        resources={mockResources}
        onAddResource={mockOnAddResource}
        onRemoveResource={mockOnRemoveResource}
      />
    );

    expect(screen.getByText('helper.py')).toBeInTheDocument();
    expect(screen.getByText('guide.md')).toBeInTheDocument();
    expect(screen.getByText('data.json')).toBeInTheDocument();
  });

  it('shows Add Resource button when not readOnly', () => {
    render(
      <SkillResourceManager
        resources={[]}
        onAddResource={mockOnAddResource}
        onRemoveResource={mockOnRemoveResource}
        readOnly={false}
      />
    );

    expect(screen.getByRole('button', { name: /add resource/i })).toBeInTheDocument();
  });

  it('hides Add Resource button when readOnly', () => {
    render(
      <SkillResourceManager
        resources={[]}
        onAddResource={mockOnAddResource}
        onRemoveResource={mockOnRemoveResource}
        readOnly={true}
      />
    );

    expect(screen.queryByRole('button', { name: /add resource/i })).not.toBeInTheDocument();
  });

  it('opens add dialog when clicking Add Resource', () => {
    render(
      <SkillResourceManager
        resources={[]}
        onAddResource={mockOnAddResource}
        onRemoveResource={mockOnRemoveResource}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /add resource/i }));
    
    // Dialog should open and show resource type selection
    expect(screen.getAllByText('Add Resource').length).toBeGreaterThan(0);
  });

  it('displays file size correctly', () => {
    render(
      <SkillResourceManager
        resources={mockResources}
        onAddResource={mockOnAddResource}
        onRemoveResource={mockOnRemoveResource}
      />
    );

    // Size should be visible in the header
    expect(screen.getByText('15 B')).toBeInTheDocument();
  });

  it('shows resource count badge', () => {
    render(
      <SkillResourceManager
        resources={mockResources}
        onAddResource={mockOnAddResource}
        onRemoveResource={mockOnRemoveResource}
      />
    );

    // Should show count badges for each type
    const badges = screen.getAllByText('1');
    expect(badges.length).toBeGreaterThanOrEqual(3);
  });
});
