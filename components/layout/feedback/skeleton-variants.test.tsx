/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  SkeletonCard,
  SkeletonMessage,
  SkeletonList,
  SkeletonStats,
  SkeletonSidebar,
  SkeletonForm,
  SkeletonChat,
  SkeletonCodeBlock,
  SkeletonHeader,
  SkeletonProject,
  SkeletonTable,
} from './skeleton-variants';

// Mock UI components
jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className || ''} />
  ),
}));

describe('SkeletonCard', () => {
  it('renders without crashing', () => {
    render(<SkeletonCard />);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('has rounded-lg border classes', () => {
    const { container } = render(<SkeletonCard />);
    const card = container.querySelector('.rounded-lg.border');
    expect(card).toBeInTheDocument();
  });

  it('has p-4 padding', () => {
    const { container } = render(<SkeletonCard />);
    const card = container.querySelector('.p-4');
    expect(card).toBeInTheDocument();
  });

  it('has space-y-3', () => {
    const { container } = render(<SkeletonCard />);
    const card = container.querySelector('.space-y-3');
    expect(card).toBeInTheDocument();
  });

  it('has flex items-center gap-3 in avatar section', () => {
    const { container } = render(<SkeletonCard />);
    const section = container.querySelector('.flex.items-center.gap-3');
    expect(section).toBeInTheDocument();
  });

  it('has h-10 w-10 rounded-full for avatar', () => {
    const { container } = render(<SkeletonCard />);
    const avatar = container.querySelector('.h-10.w-10.rounded-full');
    expect(avatar).toBeInTheDocument();
  });

  it('has space-y-2 in text section', () => {
    const { container } = render(<SkeletonCard />);
    const textSection = container.querySelectorAll('.space-y-2');
    expect(textSection.length).toBeGreaterThan(0);
  });

  it('has h-4 w-1/3 for title', () => {
    const { container } = render(<SkeletonCard />);
    const title = container.querySelector('.space-y-2 .h-4');
    expect(title).toBeInTheDocument();
  });

  it('has h-3 w-1/4 for subtitle', () => {
    const { container } = render(<SkeletonCard />);
    const subtitle = container.querySelector('.h-3');
    expect(subtitle).toBeInTheDocument();
  });

  it('has h-4 w-full for content line', () => {
    const { container } = render(<SkeletonCard />);
    const lines = container.querySelectorAll('.h-4.w-full');
    expect(lines.length).toBe(1);
  });

  it('has h-4 w-2/3 for truncated line', () => {
    const { container } = render(<SkeletonCard />);
    const lines = container.querySelectorAll('.h-4');
    // Should have multiple h-4 skeletons
    expect(lines.length).toBeGreaterThan(2);
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonCard className="custom-card" />);
    const card = container.querySelector('.custom-card');
    expect(card).toBeInTheDocument();
  });
});

describe('SkeletonMessage', () => {
  it('renders without crashing', () => {
    render(<SkeletonMessage />);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('has flex gap-3', () => {
    const { container } = render(<SkeletonMessage />);
    const flexContainer = container.querySelector('.flex.gap-3');
    expect(flexContainer).toBeInTheDocument();
  });

  it('has p-4 padding', () => {
    const { container } = render(<SkeletonMessage />);
    const wrapper = container.querySelector('.p-4');
    expect(wrapper).toBeInTheDocument();
  });

  it('has h-8 w-8 rounded-full for avatar', () => {
    const { container } = render(<SkeletonMessage />);
    const avatar = container.querySelector('.h-8.w-8.rounded-full');
    expect(avatar).toBeInTheDocument();
  });

  it('has shrink-0 on avatar', () => {
    const { container } = render(<SkeletonMessage />);
    const avatar = container.querySelector('.shrink-0');
    expect(avatar).toBeInTheDocument();
  });

  it('has space-y-2 in message content', () => {
    const { container } = render(<SkeletonMessage />);
    const content = container.querySelector('.space-y-2');
    expect(content).toBeInTheDocument();
  });

  it('has h-4 w-24 for sender name', () => {
    const { container } = render(<SkeletonMessage />);
    const sender = container.querySelector('.h-4.w-24');
    expect(sender).toBeInTheDocument();
  });

  it('has multiple message lines', () => {
    const { container } = render(<SkeletonMessage />);
    const lines = container.querySelectorAll('.h-4');
    expect(lines.length).toBe(4);
  });

  it('has flex-1 on content wrapper', () => {
    const { container } = render(<SkeletonMessage />);
    const wrapper = container.querySelector('.flex-1');
    expect(wrapper).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonMessage className="custom-message" />);
    const wrapper = container.querySelector('.custom-message');
    expect(wrapper).toBeInTheDocument();
  });
});

describe('SkeletonList', () => {
  it('renders without crashing', () => {
    render(<SkeletonList />);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('renders default count of 3 items', () => {
    const { container } = render(<SkeletonList />);
    const items = container.querySelectorAll('.space-y-3 > div');
    expect(items.length).toBe(3);
  });

  it('renders custom count of items', () => {
    const { container } = render(<SkeletonList count={5} />);
    const items = container.querySelectorAll('.space-y-3 > div');
    expect(items.length).toBe(5);
  });

  it('has space-y-3', () => {
    const { container } = render(<SkeletonList />);
    const wrapper = container.querySelector('.space-y-3');
    expect(wrapper).toBeInTheDocument();
  });

  it('has flex items-center gap-3 in each item', () => {
    const { container } = render(<SkeletonList />);
    const items = container.querySelectorAll('.flex.items-center.gap-3');
    expect(items.length).toBe(3);
  });

  it('has p-3 padding on each item', () => {
    const { container } = render(<SkeletonList />);
    const items = container.querySelectorAll('.p-3');
    expect(items.length).toBe(3);
  });

  it('has rounded-lg border on each item', () => {
    const { container } = render(<SkeletonList />);
    const items = container.querySelectorAll('.rounded-lg.border');
    expect(items.length).toBe(3);
  });

  it('has h-10 w-10 rounded-md for icon', () => {
    const { container } = render(<SkeletonList />);
    const icons = container.querySelectorAll('.h-10.w-10.rounded-md');
    expect(icons.length).toBe(3);
  });

  it('has h-8 w-20 for action button', () => {
    const { container } = render(<SkeletonList />);
    const buttons = container.querySelectorAll('.h-8.w-20');
    expect(buttons.length).toBe(3);
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonList className="custom-list" />);
    const wrapper = container.querySelector('.custom-list');
    expect(wrapper).toBeInTheDocument();
  });
});

describe('SkeletonStats', () => {
  it('renders without crashing', () => {
    render(<SkeletonStats />);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('has grid grid-cols-3', () => {
    const { container } = render(<SkeletonStats />);
    const grid = container.querySelector('.grid.grid-cols-3');
    expect(grid).toBeInTheDocument();
  });

  it('has gap-4', () => {
    const { container } = render(<SkeletonStats />);
    const grid = container.querySelector('.gap-4');
    expect(grid).toBeInTheDocument();
  });

  it('renders 3 stat cards', () => {
    const { container } = render(<SkeletonStats />);
    const cards = container.querySelectorAll('.rounded-lg.border');
    expect(cards.length).toBe(3);
  });

  it('has p-4 padding on each card', () => {
    const { container } = render(<SkeletonStats />);
    const cards = container.querySelectorAll('.p-4');
    expect(cards.length).toBe(3);
  });

  it('has h-10 w-10 rounded-full for icon', () => {
    const { container } = render(<SkeletonStats />);
    const icons = container.querySelectorAll('.h-10.w-10.rounded-full');
    expect(icons.length).toBe(3);
  });

  it('has h-6 w-12 for value', () => {
    const { container } = render(<SkeletonStats />);
    const values = container.querySelectorAll('.h-6.w-12');
    expect(values.length).toBe(3);
  });

  it('has h-3 w-20 for label', () => {
    const { container } = render(<SkeletonStats />);
    const labels = container.querySelectorAll('.h-3.w-20');
    expect(labels.length).toBe(3);
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonStats className="custom-stats" />);
    const wrapper = container.querySelector('.custom-stats');
    expect(wrapper).toBeInTheDocument();
  });
});

describe('SkeletonSidebar', () => {
  it('renders without crashing', () => {
    render(<SkeletonSidebar />);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('has space-y-2', () => {
    const { container } = render(<SkeletonSidebar />);
    const wrapper = container.querySelector('.space-y-2');
    expect(wrapper).toBeInTheDocument();
  });

  it('has p-3 padding', () => {
    const { container } = render(<SkeletonSidebar />);
    const wrapper = container.querySelector('.p-3');
    expect(wrapper).toBeInTheDocument();
  });

  it('has h-10 w-full rounded-md for search', () => {
    const { container } = render(<SkeletonSidebar />);
    const search = container.querySelector('.h-10.w-full.rounded-md');
    expect(search).toBeInTheDocument();
  });

  it('renders 5 menu items', () => {
    const { container } = render(<SkeletonSidebar />);
    const items = container.querySelectorAll('.h-9.w-full.rounded-md');
    expect(items.length).toBe(5);
  });

  it('has space-y-1 for menu items', () => {
    const { container } = render(<SkeletonSidebar />);
    const menuSection = container.querySelectorAll('.space-y-1');
    expect(menuSection.length).toBe(1);
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonSidebar className="custom-sidebar" />);
    const wrapper = container.querySelector('.custom-sidebar');
    expect(wrapper).toBeInTheDocument();
  });
});

describe('SkeletonForm', () => {
  it('renders without crashing', () => {
    render(<SkeletonForm />);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('has space-y-4', () => {
    const { container } = render(<SkeletonForm />);
    const wrapper = container.querySelector('.space-y-4');
    expect(wrapper).toBeInTheDocument();
  });

  it('has space-y-2 in form groups', () => {
    const { container } = render(<SkeletonForm />);
    const groups = container.querySelectorAll('.space-y-2');
    expect(groups.length).toBe(3);
  });

  it('has h-4 w-20 for first label', () => {
    const { container } = render(<SkeletonForm />);
    const label = container.querySelector('.h-4.w-20');
    expect(label).toBeInTheDocument();
  });

  it('has h-10 w-full for input', () => {
    const { container } = render(<SkeletonForm />);
    const inputs = container.querySelectorAll('.h-10.w-full');
    expect(inputs.length).toBe(2);
  });

  it('has h-24 w-full for textarea', () => {
    const { container } = render(<SkeletonForm />);
    const textarea = container.querySelector('.h-24.w-full');
    expect(textarea).toBeInTheDocument();
  });

  it('has h-10 w-32 for submit button', () => {
    const { container } = render(<SkeletonForm />);
    const button = container.querySelector('.h-10.w-32');
    expect(button).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonForm className="custom-form" />);
    const wrapper = container.querySelector('.custom-form');
    expect(wrapper).toBeInTheDocument();
  });
});

describe('SkeletonChat', () => {
  it('renders without crashing', () => {
    render(<SkeletonChat />);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('has space-y-4', () => {
    const { container } = render(<SkeletonChat />);
    const wrapper = container.querySelector('.space-y-4');
    expect(wrapper).toBeInTheDocument();
  });

  it('has p-4 padding', () => {
    const { container } = render(<SkeletonChat />);
    const wrapper = container.querySelector('.p-4');
    expect(wrapper).toBeInTheDocument();
  });

  it('has flex justify-end for user messages', () => {
    const { container } = render(<SkeletonChat />);
    const userMessages = container.querySelectorAll('.flex.justify-end');
    expect(userMessages.length).toBe(2);
  });

  it('has max-w-[70%] on user message content', () => {
    const { container } = render(<SkeletonChat />);
    const userContent = container.querySelectorAll('.max-w-\\[70\\%\\]');
    expect(userContent.length).toBe(2);
  });

  it('renders 2 user messages and 2 assistant messages', () => {
    const { container } = render(<SkeletonChat />);
    const userMessages = container.querySelectorAll('.justify-end');
    const assistantAvatars = container.querySelectorAll('.shrink-0');
    expect(userMessages.length).toBe(2);
    expect(assistantAvatars.length).toBe(2);
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonChat className="custom-chat" />);
    const wrapper = container.querySelector('.custom-chat');
    expect(wrapper).toBeInTheDocument();
  });
});

describe('SkeletonCodeBlock', () => {
  it('renders without crashing', () => {
    render(<SkeletonCodeBlock />);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('has rounded-lg border', () => {
    const { container } = render(<SkeletonCodeBlock />);
    const wrapper = container.querySelector('.rounded-lg.border');
    expect(wrapper).toBeInTheDocument();
  });

  it('has overflow-hidden', () => {
    const { container } = render(<SkeletonCodeBlock />);
    const wrapper = container.querySelector('.overflow-hidden');
    expect(wrapper).toBeInTheDocument();
  });

  it('has px-3 py-2 in header', () => {
    const { container } = render(<SkeletonCodeBlock />);
    const header = container.querySelector('.px-3.py-2');
    expect(header).toBeInTheDocument();
  });

  it('has border-b in header', () => {
    const { container } = render(<SkeletonCodeBlock />);
    const header = container.querySelector('.border-b');
    expect(header).toBeInTheDocument();
  });

  it('has bg-muted/30 in header', () => {
    const { container } = render(<SkeletonCodeBlock />);
    const header = container.querySelector('.bg-muted\\/30');
    expect(header).toBeInTheDocument();
  });

  it('has h-5 w-16 for language', () => {
    const { container } = render(<SkeletonCodeBlock />);
    const language = container.querySelector('.h-5.w-16');
    expect(language).toBeInTheDocument();
  });

  it('has 2 action buttons', () => {
    const { container } = render(<SkeletonCodeBlock />);
    const buttons = container.querySelectorAll('.h-6.w-6.rounded');
    expect(buttons.length).toBe(2);
  });

  it('has p-4 in code area', () => {
    const { container } = render(<SkeletonCodeBlock />);
    const codeArea = container.querySelector('.p-4');
    expect(codeArea).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonCodeBlock className="custom-code" />);
    const wrapper = container.querySelector('.custom-code');
    expect(wrapper).toBeInTheDocument();
  });
});

describe('SkeletonHeader', () => {
  it('renders without crashing', () => {
    render(<SkeletonHeader />);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('has flex items-center justify-between', () => {
    const { container } = render(<SkeletonHeader />);
    const header = container.querySelector('.flex.items-center.justify-between');
    expect(header).toBeInTheDocument();
  });

  it('has p-4 padding', () => {
    const { container } = render(<SkeletonHeader />);
    const header = container.querySelector('.p-4');
    expect(header).toBeInTheDocument();
  });

  it('has border-b', () => {
    const { container } = render(<SkeletonHeader />);
    const header = container.querySelector('.border-b');
    expect(header).toBeInTheDocument();
  });

  it('has gap-3 in left section', () => {
    const { container } = render(<SkeletonHeader />);
    const leftSection = container.querySelector('.gap-3');
    expect(leftSection).toBeInTheDocument();
  });

  it('has h-8 w-8 rounded for icon', () => {
    const { container } = render(<SkeletonHeader />);
    const icons = container.querySelectorAll('.h-8.w-8.rounded');
    expect(icons.length).toBe(4);
  });

  it('has h-5 w-32 for title', () => {
    const { container } = render(<SkeletonHeader />);
    const title = container.querySelector('.h-5.w-32');
    expect(title).toBeInTheDocument();
  });

  it('has h-3 w-24 for subtitle', () => {
    const { container } = render(<SkeletonHeader />);
    const subtitle = container.querySelector('.h-3.w-24');
    expect(subtitle).toBeInTheDocument();
  });

  it('has gap-2 in action buttons', () => {
    const { container } = render(<SkeletonHeader />);
    const actions = container.querySelector('.gap-2');
    expect(actions).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonHeader className="custom-header" />);
    const wrapper = container.querySelector('.custom-header');
    expect(wrapper).toBeInTheDocument();
  });
});

describe('SkeletonProject', () => {
  it('renders without crashing', () => {
    render(<SkeletonProject />);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('has rounded-lg border', () => {
    const { container } = render(<SkeletonProject />);
    const card = container.querySelector('.rounded-lg.border');
    expect(card).toBeInTheDocument();
  });

  it('has p-4 padding', () => {
    const { container } = render(<SkeletonProject />);
    const card = container.querySelector('.p-4');
    expect(card).toBeInTheDocument();
  });

  it('has space-y-4', () => {
    const { container } = render(<SkeletonProject />);
    const card = container.querySelector('.space-y-4');
    expect(card).toBeInTheDocument();
  });

  it('has flex items-start justify-between in header', () => {
    const { container } = render(<SkeletonProject />);
    const header = container.querySelector('.flex.items-start.justify-between');
    expect(header).toBeInTheDocument();
  });

  it('has h-12 w-12 rounded-lg for thumbnail', () => {
    const { container } = render(<SkeletonProject />);
    const thumbnail = container.querySelector('.h-12.w-12.rounded-lg');
    expect(thumbnail).toBeInTheDocument();
  });

  it('has h-5 w-40 for project name', () => {
    const { container } = render(<SkeletonProject />);
    const name = container.querySelector('.h-5.w-40');
    expect(name).toBeInTheDocument();
  });

  it('has flex gap-2 for tags', () => {
    const { container } = render(<SkeletonProject />);
    const tagsSection = container.querySelector('.flex.gap-2');
    expect(tagsSection).toBeInTheDocument();
  });

  it('has h-6 w-16 rounded-full for first tag', () => {
    const { container } = render(<SkeletonProject />);
    const tags = container.querySelectorAll('.h-6.rounded-full');
    expect(tags.length).toBe(2);
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonProject className="custom-project" />);
    const card = container.querySelector('.custom-project');
    expect(card).toBeInTheDocument();
  });
});

describe('SkeletonTable', () => {
  it('renders without crashing', () => {
    render(<SkeletonTable />);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('renders default 5 rows', () => {
    const { container } = render(<SkeletonTable />);
    const rows = container.querySelectorAll('.border-b');
    expect(rows.length).toBe(6); // 5 data rows + 1 header
  });

  it('renders custom row count', () => {
    const { container } = render(<SkeletonTable rows={3} />);
    const rows = container.querySelectorAll('.border-b');
    expect(rows.length).toBe(4); // 3 data rows + 1 header
  });

  it('has rounded-lg border', () => {
    const { container } = render(<SkeletonTable />);
    const wrapper = container.querySelector('.rounded-lg.border');
    expect(wrapper).toBeInTheDocument();
  });

  it('has overflow-hidden', () => {
    const { container } = render(<SkeletonTable />);
    const wrapper = container.querySelector('.overflow-hidden');
    expect(wrapper).toBeInTheDocument();
  });

  it('has 4 columns in header', () => {
    const { container } = render(<SkeletonTable />);
    const headerColumns = container.querySelector('.flex.items-center.gap-4.p-3');
    expect(headerColumns).toBeInTheDocument();
    const headerSkeletons = headerColumns?.querySelectorAll('[data-testid="skeleton"]');
    expect(headerSkeletons?.length).toBe(4);
  });

  it('has 4 columns in each row', () => {
    const { container } = render(<SkeletonTable />);
    const firstRow = container.querySelector('.border-b:last-of-type');
    const rowSkeletons = firstRow?.querySelectorAll('[data-testid="skeleton"]');
    expect(rowSkeletons?.length).toBe(4);
  });

  it('has p-3 padding in rows', () => {
    const { container } = render(<SkeletonTable />);
    const rows = container.querySelectorAll('.p-3');
    expect(rows.length).toBe(6);
  });

  it('has flex items-center gap-4 in rows', () => {
    const { container } = render(<SkeletonTable />);
    const row = container.querySelector('.flex.items-center.gap-4');
    expect(row).toBeInTheDocument();
  });

  it('has bg-muted/30 in header', () => {
    const { container } = render(<SkeletonTable />);
    const header = container.querySelector('.bg-muted\\/30');
    expect(header).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonTable className="custom-table" />);
    const wrapper = container.querySelector('.custom-table');
    expect(wrapper).toBeInTheDocument();
  });
});
