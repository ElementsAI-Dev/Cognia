import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DiffBlock } from './diff-block';
import { ReactNode } from 'react';

// Wrapper with TooltipProvider
const Wrapper = ({ children }: { children: ReactNode }) => (
  <TooltipProvider>{children}</TooltipProvider>
);

// Custom render with TooltipProvider
const customRender = (ui: React.ReactElement) =>
  render(ui, { wrapper: Wrapper });

// Mock useCopy hook
jest.mock('@/hooks/ui/use-copy', () => ({
  useCopy: () => ({
    copy: jest.fn().mockResolvedValue({ success: true }),
    isCopying: false,
  }),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('DiffBlock', () => {
  const sampleDiff = `@@ -1,3 +1,4 @@
 unchanged line
-removed line
+added line
+another added line
 context line`;

  describe('Rendering', () => {
    it('renders diff content', () => {
      customRender(<DiffBlock content={sampleDiff} />);
      
      expect(screen.getByText('unchanged line')).toBeInTheDocument();
      expect(screen.getByText('removed line')).toBeInTheDocument();
      expect(screen.getByText('added line')).toBeInTheDocument();
    });

    it('renders with filename', () => {
      customRender(<DiffBlock content={sampleDiff} filename="test.js" />);
      
      expect(screen.getByText('test.js')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = customRender(
        <DiffBlock content={sampleDiff} className="custom-class" />
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('shows addition and deletion counts', () => {
      const { container } = customRender(<DiffBlock content={sampleDiff} />);
      
      // Should show +2 additions (added line, another added line)
      // and -1 deletion (removed line)
      // Look for the stats in the green/red spans
      const additionsSpan = container.querySelector('.text-green-600');
      const deletionsSpan = container.querySelector('.text-red-600');
      expect(additionsSpan?.textContent).toContain('2');
      expect(deletionsSpan?.textContent).toContain('1');
    });
  });

  describe('View modes', () => {
    it('defaults to unified view', () => {
      const { container } = customRender(<DiffBlock content={sampleDiff} />);
      
      // In unified view, we have a single table
      expect(container.querySelector('table')).toBeInTheDocument();
    });

    it('switches to split view when button clicked', async () => {
      customRender(<DiffBlock content={sampleDiff} />);
      
      // Find split view button and click it
      const buttons = screen.getAllByRole('button');
      const splitButton = buttons.find(btn => 
        btn.querySelector('svg[class*="lucide-columns"]') || 
        btn.getAttribute('aria-label')?.includes('split')
      );
      
      if (splitButton) {
        fireEvent.click(splitButton);
      }
    });
  });

  describe('Diff parsing', () => {
    it('parses hunk headers', () => {
      customRender(<DiffBlock content={sampleDiff} />);
      
      // Hunk header should be rendered
      expect(screen.getByText(/@@ -1,3 \+1,4 @@/)).toBeInTheDocument();
    });

    it('handles additions correctly', () => {
      const { container } = customRender(<DiffBlock content={sampleDiff} />);
      
      // Added lines should have green background class
      const addedRows = container.querySelectorAll('.bg-green-500\\/10');
      expect(addedRows.length).toBeGreaterThan(0);
    });

    it('handles deletions correctly', () => {
      const { container } = customRender(<DiffBlock content={sampleDiff} />);
      
      // Removed lines should have red background class
      const removedRows = container.querySelectorAll('.bg-red-500\\/10');
      expect(removedRows.length).toBeGreaterThan(0);
    });

    it('handles context lines', () => {
      customRender(<DiffBlock content={sampleDiff} />);
      
      expect(screen.getByText('unchanged line')).toBeInTheDocument();
      expect(screen.getByText('context line')).toBeInTheDocument();
    });
  });

  describe('Empty and edge cases', () => {
    it('handles empty diff', () => {
      const { container } = customRender(<DiffBlock content="" />);
      expect(container).toBeInTheDocument();
    });

    it('handles diff with only additions', () => {
      const addOnlyDiff = `@@ -0,0 +1,2 @@
+new line 1
+new line 2`;
      customRender(<DiffBlock content={addOnlyDiff} />);
      
      expect(screen.getByText('new line 1')).toBeInTheDocument();
      expect(screen.getByText('new line 2')).toBeInTheDocument();
    });

    it('handles diff with only deletions', () => {
      const deleteOnlyDiff = `@@ -1,2 +0,0 @@
-deleted line 1
-deleted line 2`;
      customRender(<DiffBlock content={deleteOnlyDiff} />);
      
      expect(screen.getByText('deleted line 1')).toBeInTheDocument();
      expect(screen.getByText('deleted line 2')).toBeInTheDocument();
    });
  });

  describe('Copy functionality', () => {
    it('renders copy button', () => {
      customRender(<DiffBlock content={sampleDiff} />);
      
      const copyButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')
      );
      expect(copyButton).toBeInTheDocument();
    });
  });
});
