import { render, screen, fireEvent } from '@testing-library/react';
import { DetailsBlock, DetailsGroup } from './details-block';

describe('DetailsBlock', () => {
  describe('Rendering', () => {
    it('renders summary text', () => {
      render(
        <DetailsBlock summary="Click to expand">
          Hidden content
        </DetailsBlock>
      );
      
      expect(screen.getByText('Click to expand')).toBeInTheDocument();
    });

    it('renders children content', () => {
      render(
        <DetailsBlock summary="Summary" defaultOpen>
          <span>Child content</span>
        </DetailsBlock>
      );
      
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <DetailsBlock summary="Summary" className="custom-class">
          Content
        </DetailsBlock>
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Expand/Collapse', () => {
    it('is collapsed by default', () => {
      render(
        <DetailsBlock summary="Summary">
          Content
        </DetailsBlock>
      );
      
      // Content is not rendered when collapsed (Radix Collapsible behavior)
      const content = screen.queryByText('Content');
      expect(content).not.toBeInTheDocument();
    });

    it('is expanded when defaultOpen is true', () => {
      render(
        <DetailsBlock summary="Summary" defaultOpen>
          Visible content
        </DetailsBlock>
      );
      
      expect(screen.getByText('Visible content')).toBeInTheDocument();
    });

    it('toggles content when clicked', () => {
      render(
        <DetailsBlock summary="Click me">
          Toggle content
        </DetailsBlock>
      );
      
      const trigger = screen.getByText('Click me');
      fireEvent.click(trigger);
      
      // Content should be visible after click
      expect(screen.getByText('Toggle content')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('renders default variant', () => {
      const { container } = render(
        <DetailsBlock summary="Summary" variant="default">
          Content
        </DetailsBlock>
      );
      expect(container.firstChild).not.toHaveClass('border');
    });

    it('renders bordered variant', () => {
      const { container } = render(
        <DetailsBlock summary="Summary" variant="bordered">
          Content
        </DetailsBlock>
      );
      expect(container.querySelector('.border')).toBeInTheDocument();
    });

    it('renders filled variant', () => {
      const { container } = render(
        <DetailsBlock summary="Summary" variant="filled">
          Content
        </DetailsBlock>
      );
      expect(container.querySelector('.bg-muted\\/30')).toBeInTheDocument();
    });
  });

  describe('Chevron icon', () => {
    it('renders chevron icon', () => {
      const { container } = render(
        <DetailsBlock summary="Summary">Content</DetailsBlock>
      );
      
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('rotates chevron when expanded', () => {
      const { container } = render(
        <DetailsBlock summary="Summary" defaultOpen>
          Content
        </DetailsBlock>
      );
      
      const chevron = container.querySelector('svg');
      expect(chevron).toHaveClass('rotate-90');
    });
  });

  describe('Complex content', () => {
    it('renders nested elements', () => {
      render(
        <DetailsBlock summary="Summary" defaultOpen>
          <div>
            <p>Paragraph 1</p>
            <p>Paragraph 2</p>
          </div>
        </DetailsBlock>
      );
      
      expect(screen.getByText('Paragraph 1')).toBeInTheDocument();
      expect(screen.getByText('Paragraph 2')).toBeInTheDocument();
    });

    it('renders React nodes as summary', () => {
      render(
        <DetailsBlock
          summary={<span data-testid="custom-summary">Custom Summary</span>}
          defaultOpen
        >
          Content
        </DetailsBlock>
      );
      
      expect(screen.getByTestId('custom-summary')).toBeInTheDocument();
    });
  });
});

describe('DetailsGroup', () => {
  describe('Rendering', () => {
    it('renders children', () => {
      render(
        <DetailsGroup>
          <DetailsBlock summary="Item 1">Content 1</DetailsBlock>
          <DetailsBlock summary="Item 2">Content 2</DetailsBlock>
        </DetailsGroup>
      );
      
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <DetailsGroup className="custom-class">
          <DetailsBlock summary="Item">Content</DetailsBlock>
        </DetailsGroup>
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('applies spacing between items', () => {
      const { container } = render(
        <DetailsGroup>
          <DetailsBlock summary="Item 1">Content 1</DetailsBlock>
          <DetailsBlock summary="Item 2">Content 2</DetailsBlock>
        </DetailsGroup>
      );
      expect(container.querySelector('.space-y-2')).toBeInTheDocument();
    });
  });

  describe('Multiple expansion', () => {
    it('allows multiple items expanded when allowMultiple is true', () => {
      render(
        <DetailsGroup allowMultiple>
          <DetailsBlock summary="Item 1" defaultOpen>Content 1</DetailsBlock>
          <DetailsBlock summary="Item 2" defaultOpen>Content 2</DetailsBlock>
        </DetailsGroup>
      );
      
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });
});
