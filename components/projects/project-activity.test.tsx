import { render, screen, fireEvent, act } from '@testing-library/react';
import { ProjectActivity, type ProjectActivityItem } from './project-activity';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      activity: 'Activity',
      activityHistory: 'Activity History',
      filter: 'Filter',
      noActivityYet: 'No activity yet',
      'activityTypes.session_created': 'Session Created',
      'activityTypes.settings_updated': 'Settings Updated',
      'activityTypes.knowledge_added': 'Knowledge Added',
    };
    return translations[key] || key;
  },
}));

const mockActivities: ProjectActivityItem[] = [
  {
    id: '1',
    type: 'session_created',
    timestamp: new Date(),
    description: 'Created new session',
  },
  {
    id: '2',
    type: 'settings_updated',
    timestamp: new Date(Date.now() - 86400000), // Yesterday
    description: 'Updated project settings',
  },
  {
    id: '3',
    type: 'knowledge_added',
    timestamp: new Date(Date.now() - 86400000), // Yesterday
    description: 'Added knowledge file',
  },
];

describe('ProjectActivity', () => {
  it('renders trigger button', async () => {
    await act(async () => {
      render(<ProjectActivity projectId="test-project" activities={mockActivities} />);
    });
    expect(screen.getByText('Activity')).toBeInTheDocument();
  });

  it('opens sheet on click', async () => {
    await act(async () => {
      render(<ProjectActivity projectId="test-project" activities={mockActivities} />);
    });
    
    const button = screen.getByText('Activity');
    await act(async () => {
      fireEvent.click(button);
    });
    
    expect(screen.getByText('Activity History')).toBeInTheDocument();
  });

  it('displays filter button when open', async () => {
    await act(async () => {
      render(<ProjectActivity projectId="test-project" activities={mockActivities} />);
    });
    
    const button = screen.getByText('Activity');
    await act(async () => {
      fireEvent.click(button);
    });
    
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it('shows activities grouped by date', async () => {
    await act(async () => {
      render(<ProjectActivity projectId="test-project" activities={mockActivities} />);
    });
    
    const button = screen.getByText('Activity');
    await act(async () => {
      fireEvent.click(button);
    });
    
    // Activity descriptions should be visible
    expect(screen.getByText('Created new session')).toBeInTheDocument();
    expect(screen.getByText('Updated project settings')).toBeInTheDocument();
  });

  it('accepts custom trigger', async () => {
    const customTrigger = <button data-testid="custom-trigger">Custom Trigger</button>;
    
    await act(async () => {
      render(
        <ProjectActivity
          projectId="test-project"
          activities={mockActivities}
          trigger={customTrigger}
        />
      );
    });
    
    expect(screen.getByTestId('custom-trigger')).toBeInTheDocument();
  });
});

describe('ProjectActivity - Empty State', () => {
  it('shows empty state when no activities', async () => {
    await act(async () => {
      render(<ProjectActivity projectId="test-project" activities={[]} />);
    });
    
    const button = screen.getByText('Activity');
    await act(async () => {
      fireEvent.click(button);
    });
    
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
  });
});

describe('ProjectActivity - Activity Display', () => {
  it('displays activity type labels', async () => {
    await act(async () => {
      render(<ProjectActivity projectId="test-project" activities={mockActivities} />);
    });
    
    const button = screen.getByText('Activity');
    await act(async () => {
      fireEvent.click(button);
    });
    
    expect(screen.getByText('Session Created')).toBeInTheDocument();
    expect(screen.getByText('Settings Updated')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Added')).toBeInTheDocument();
  });
});
