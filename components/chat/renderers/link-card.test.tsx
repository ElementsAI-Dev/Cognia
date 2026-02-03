import { render, screen } from '@testing-library/react';
import { LinkCard, LinkCardSkeleton, LinkGroup } from './link-card';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ReactNode } from 'react';

// Wrapper with providers
const Wrapper = ({ children }: { children: ReactNode }) => (
  <TooltipProvider>{children}</TooltipProvider>
);

// Custom render
const customRender = (ui: React.ReactElement) =>
  render(ui, { wrapper: Wrapper });

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock useLinkMetadata hook
const mockUseLinkMetadata = jest.fn();
jest.mock('@/hooks/ui', () => ({
  useLinkMetadata: (...args: unknown[]) => mockUseLinkMetadata(...args),
}));

describe('LinkCard', () => {
  const defaultProps = {
    href: 'https://example.com',
  };

  beforeEach(() => {
    mockUseLinkMetadata.mockReturnValue({
      metadata: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  describe('Inline variant', () => {
    it('renders link with href', () => {
      customRender(<LinkCard {...defaultProps}>Example Link</LinkCard>);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('renders children as link text', () => {
      customRender(<LinkCard {...defaultProps}>Click me</LinkCard>);
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('opens external links in new tab', () => {
      customRender(<LinkCard {...defaultProps}>Link</LinkCard>);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('shows external link icon for http links', () => {
      const { container } = customRender(
        <LinkCard {...defaultProps}>Link</LinkCard>
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = customRender(
        <LinkCard {...defaultProps} className="custom-class">
          Link
        </LinkCard>
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Compact variant', () => {
    it('renders compact style', () => {
      const { container } = customRender(
        <LinkCard {...defaultProps} variant="compact">
          Compact Link
        </LinkCard>
      );
      expect(container.querySelector('.rounded-md')).toBeInTheDocument();
    });

    it('shows link text in compact variant', () => {
      customRender(
        <LinkCard {...defaultProps} variant="compact">
          Link
        </LinkCard>
      );
      // Compact variant shows the children text (or title from metadata)
      expect(screen.getByText('Link')).toBeInTheDocument();
    });

    it('shows favicon when metadata provided', () => {
      const { container } = customRender(
        <LinkCard
          {...defaultProps}
          variant="compact"
          metadata={{
            url: 'https://example.com',
            favicon: 'https://example.com/favicon.ico',
          }}
        >
          Link
        </LinkCard>
      );
      // Favicon has alt="" so it's role=presentation, use querySelector instead
      const favicon = container.querySelector('img');
      expect(favicon).toHaveAttribute('src', 'https://example.com/favicon.ico');
    });
  });

  describe('Card variant', () => {
    it('renders full card', () => {
      const { container } = customRender(
        <LinkCard {...defaultProps} variant="card">
          Card Link
        </LinkCard>
      );
      expect(container.querySelector('.rounded-lg.border')).toBeInTheDocument();
    });

    it('shows image when metadata has image', () => {
      customRender(
        <LinkCard
          {...defaultProps}
          variant="card"
          metadata={{
            url: 'https://example.com',
            title: 'Example Site',
            image: 'https://example.com/og-image.jpg',
          }}
        >
          Link
        </LinkCard>
      );
      const images = screen.getAllByRole('img');
      expect(images.length).toBeGreaterThan(0);
    });

    it('shows title from metadata', () => {
      customRender(
        <LinkCard
          {...defaultProps}
          variant="card"
          metadata={{
            url: 'https://example.com',
            title: 'Example Site Title',
          }}
        >
          Link
        </LinkCard>
      );
      expect(screen.getByText('Example Site Title')).toBeInTheDocument();
    });

    it('shows description from metadata', () => {
      customRender(
        <LinkCard
          {...defaultProps}
          variant="card"
          metadata={{
            url: 'https://example.com',
            description: 'This is a description',
          }}
        >
          Link
        </LinkCard>
      );
      expect(screen.getByText('This is a description')).toBeInTheDocument();
    });
  });

  describe('Internal links', () => {
    it('does not add target for internal links', () => {
      customRender(<LinkCard href="/internal-page">Internal</LinkCard>);
      const link = screen.getByRole('link');
      expect(link).not.toHaveAttribute('target');
    });
  });
});

describe('LinkCardSkeleton', () => {
  it('renders skeleton for card variant', () => {
    const { container } = render(<LinkCardSkeleton variant="card" />);
    expect(container.querySelector('.rounded-lg')).toBeInTheDocument();
  });

  it('renders skeleton for compact variant', () => {
    const { container } = render(<LinkCardSkeleton variant="compact" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <LinkCardSkeleton className="custom-class" />
    );
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});

describe('LinkGroup', () => {
  it('renders children', () => {
    customRender(
      <LinkGroup>
        <LinkCard href="https://a.com">Link A</LinkCard>
        <LinkCard href="https://b.com">Link B</LinkCard>
      </LinkGroup>
    );
    
    expect(screen.getByText('Link A')).toBeInTheDocument();
    expect(screen.getByText('Link B')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    customRender(
      <LinkGroup title="Related Links">
        <LinkCard href="https://example.com">Link</LinkCard>
      </LinkGroup>
    );
    
    expect(screen.getByText('Related Links')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = customRender(
      <LinkGroup className="custom-class">
        <LinkCard href="https://example.com">Link</LinkCard>
      </LinkGroup>
    );
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('renders flex container for links', () => {
    const { container } = customRender(
      <LinkGroup>
        <LinkCard href="https://example.com">Link</LinkCard>
      </LinkGroup>
    );
    expect(container.querySelector('.flex')).toBeInTheDocument();
  });
});

describe('LinkCard auto-fetch', () => {
  beforeEach(() => {
    mockUseLinkMetadata.mockClear();
  });

  it('auto-fetches metadata for card variant by default', () => {
    mockUseLinkMetadata.mockReturnValue({
      metadata: { url: 'https://example.com', title: 'Fetched Title' },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    customRender(
      <LinkCard href="https://example.com" variant="card">
        Link
      </LinkCard>
    );

    expect(mockUseLinkMetadata).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({ enabled: true })
    );
    expect(screen.getByText('Fetched Title')).toBeInTheDocument();
  });

  it('does not auto-fetch for inline variant by default', () => {
    mockUseLinkMetadata.mockReturnValue({
      metadata: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    customRender(
      <LinkCard href="https://example.com" variant="inline">
        Link
      </LinkCard>
    );

    expect(mockUseLinkMetadata).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({ enabled: false })
    );
  });

  it('respects autoFetch prop override', () => {
    mockUseLinkMetadata.mockReturnValue({
      metadata: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    customRender(
      <LinkCard href="https://example.com" variant="inline" autoFetch>
        Link
      </LinkCard>
    );

    expect(mockUseLinkMetadata).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({ enabled: true })
    );
  });

  it('skips fetch when metadata is provided', () => {
    const providedMetadata = {
      url: 'https://example.com',
      title: 'Provided Title',
    };

    mockUseLinkMetadata.mockReturnValue({
      metadata: providedMetadata,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    customRender(
      <LinkCard href="https://example.com" variant="card" metadata={providedMetadata}>
        Link
      </LinkCard>
    );

    expect(mockUseLinkMetadata).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        enabled: false,
        initialMetadata: providedMetadata,
      })
    );
  });

  it('shows skeleton while loading for card variant', () => {
    mockUseLinkMetadata.mockReturnValue({
      metadata: null,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    const { container } = customRender(
      <LinkCard href="https://example.com" variant="card">
        Link
      </LinkCard>
    );

    // Should show skeleton (which has rounded-lg class)
    expect(container.querySelector('.rounded-lg')).toBeInTheDocument();
  });
});
