/**
 * Tests for CollabUserList component
 */

import { render, screen } from '@testing-library/react';
import { CollabUserList } from './user-list';
import type { CollabUserState } from '@/lib/designer/collaboration/collab-awareness';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      you: 'You',
      online: 'Online',
      offline: 'Offline',
      moreUsers: `+${params?.count} more users`,
    };
    return translations[key] || key;
  },
}));

describe('CollabUserList', () => {
  const mockUsers: CollabUserState[] = [
    {
      id: 'user-1',
      name: 'Alice Smith',
      color: '#3b82f6',
      lastActive: new Date(),
      isOnline: true,
    },
    {
      id: 'user-2',
      name: 'Bob Jones',
      color: '#10b981',
      lastActive: new Date(),
      isOnline: true,
    },
    {
      id: 'user-3',
      name: 'Charlie Brown',
      color: '#f59e0b',
      lastActive: new Date(),
      isOnline: false,
    },
  ];

  it('should render nothing when no users', () => {
    const { container } = render(<CollabUserList users={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render user avatars', () => {
    render(<CollabUserList users={mockUsers} />);

    expect(screen.getByText('AS')).toBeInTheDocument();
    expect(screen.getByText('BJ')).toBeInTheDocument();
    expect(screen.getByText('CB')).toBeInTheDocument();
  });

  it('should show online status indicator', () => {
    const { container } = render(<CollabUserList users={mockUsers} showStatus={true} />);

    // Status indicators are rendered (green for online, gray for offline)
    const allIndicators = container.querySelectorAll('[class*="bg-green"], [class*="bg-gray"]');
    expect(allIndicators.length).toBeGreaterThan(0);
  });

  it('should hide status when showStatus is false', () => {
    const { container } = render(<CollabUserList users={mockUsers} showStatus={false} />);

    // Check that status indicator spans are not rendered
    const statusSpans = container.querySelectorAll('span[class*="bg-green-500"], span[class*="bg-gray-400"]');
    // When showStatus is false, these small indicator spans should not exist
    expect(statusSpans.length).toBe(0);
  });

  it('should respect maxVisible prop', () => {
    render(<CollabUserList users={mockUsers} maxVisible={2} />);

    expect(screen.getByText('AS')).toBeInTheDocument();
    expect(screen.getByText('BJ')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('should mark local user', () => {
    const { container } = render(
      <CollabUserList users={mockUsers} localUserId="user-1" />
    );

    // Local user indicator should exist
    const localIndicator = container.querySelector('[class*="bg-blue"]');
    expect(localIndicator).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CollabUserList users={mockUsers} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should use different sizes', () => {
    const { rerender, container } = render(
      <CollabUserList users={mockUsers} size="sm" />
    );
    expect(container.querySelector('[class*="h-6"]')).toBeInTheDocument();

    rerender(<CollabUserList users={mockUsers} size="md" />);
    expect(container.querySelector('[class*="h-8"]')).toBeInTheDocument();

    rerender(<CollabUserList users={mockUsers} size="lg" />);
    expect(container.querySelector('[class*="h-10"]')).toBeInTheDocument();
  });

  it('should show name when showNames and single user', () => {
    render(
      <CollabUserList
        users={[mockUsers[0]]}
        showNames={true}
      />
    );

    // Name appears in the main list (not just tooltip)
    expect(screen.getAllByText('Alice Smith').length).toBeGreaterThan(0);
  });

  it('should not show names when multiple users', () => {
    const { container } = render(
      <CollabUserList users={mockUsers} showNames={true} />
    );

    // When multiple users, the inline name should not be shown (only in tooltip)
    // Check that there's no span with the name as direct child of the main container
    const mainContainer = container.querySelector('.flex.items-center');
    const nameSpan = mainContainer?.querySelector(':scope > span.ml-2');
    expect(nameSpan).toBeNull();
  });

  it('should show avatar image when provided', () => {
    const userWithAvatar: CollabUserState[] = [
      {
        ...mockUsers[0],
        avatarUrl: 'https://example.com/avatar.jpg',
      },
    ];

    const { container } = render(<CollabUserList users={userWithAvatar} />);

    // Avatar component is rendered (image loads asynchronously with fallback)
    const avatar = container.querySelector('[data-slot="avatar"]');
    expect(avatar).toBeInTheDocument();
  });

  it('should sort online users first', () => {
    const mixedUsers: CollabUserState[] = [
      { ...mockUsers[2], isOnline: false },
      { ...mockUsers[0], isOnline: true },
    ];

    render(<CollabUserList users={mixedUsers} />);

    const avatars = screen.getAllByText(/[A-Z]{2}/);
    expect(avatars[0]).toHaveTextContent('AS');
  });

  it('should generate correct initials', () => {
    const singleNameUser: CollabUserState[] = [
      {
        id: 'user-x',
        name: 'Alice',
        color: '#3b82f6',
        lastActive: new Date(),
        isOnline: true,
      },
    ];

    render(<CollabUserList users={singleNameUser} />);

    expect(screen.getByText('AL')).toBeInTheDocument();
  });
});
