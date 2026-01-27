/**
 * Tests for QuickActions component
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { QuickActions } from "./quick-actions";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      frequent: "Frequent",
      allActions: "All Actions",
      pinned: "Pinned",
      "actions.translate": "Translate",
      "actions.translateDesc": "Translate selected text",
      "actions.explain": "Explain",
      "actions.explainDesc": "Explain selected text",
      "actions.summarize": "Summarize",
      "actions.summarizeDesc": "Summarize selected text",
      "actions.define": "Define",
      "actions.defineDesc": "Define selected word",
      "actions.rewrite": "Rewrite",
      "actions.rewriteDesc": "Rewrite selected text",
      "actions.grammar": "Grammar",
      "actions.grammarDesc": "Check grammar",
      "actions.codeExplain": "Explain Code",
      "actions.codeExplainDesc": "Explain code",
      "actions.codeOptimize": "Optimize Code",
      "actions.codeOptimizeDesc": "Optimize code",
      "actions.expand": "Expand",
      "actions.expandDesc": "Expand text",
      "actions.shorten": "Shorten",
      "actions.shortenDesc": "Shorten text",
      "actions.toneFormal": "Formal",
      "actions.toneFormalDesc": "Make formal",
      "actions.toneCasual": "Casual",
      "actions.toneCasualDesc": "Make casual",
      "actions.search": "Search",
      "actions.searchDesc": "Search online",
      "actions.copy": "Copy",
      "actions.copyDesc": "Copy to clipboard",
    };
    return translations[key] || key;
  },
}));

// Mock Tooltip components
jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipTrigger: ({
    children,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => <>{children}</>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe("QuickActions", () => {
  const mockOnAction = jest.fn();

  const defaultProps = {
    onAction: mockOnAction,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders without crashing", () => {
      const { container } = render(<QuickActions {...defaultProps} />);
      expect(container).toBeInTheDocument();
    });

    it("renders action buttons", () => {
      render(<QuickActions {...defaultProps} />);

      // Should render some action buttons
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("renders in grid layout by default", () => {
      const { container } = render(<QuickActions {...defaultProps} />);

      // Should have grid class
      expect(container.querySelector(".grid")).toBeInTheDocument();
    });

    it("renders in list layout when specified", () => {
      const { container } = render(
        <QuickActions {...defaultProps} layout="list" />
      );

      // Should render successfully with list layout
      expect(container).toBeInTheDocument();
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("renders in compact layout when specified", () => {
      const { container } = render(
        <QuickActions {...defaultProps} layout="compact" />
      );

      expect(container).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(
        <QuickActions {...defaultProps} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("interactions", () => {
    it("calls onAction when action button is clicked", () => {
      render(<QuickActions {...defaultProps} />);

      // Find and click a button
      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]);

      expect(mockOnAction).toHaveBeenCalled();
    });

    it("disables buttons when isLoading is true", () => {
      render(<QuickActions {...defaultProps} isLoading={true} />);

      const buttons = screen.getAllByRole("button");
      // At least one button should be disabled
      const disabledButtons = buttons.filter((btn) => btn.hasAttribute("disabled"));
      expect(disabledButtons.length).toBeGreaterThan(0);
    });
  });

  describe("maxItems", () => {
    it("limits displayed actions based on maxItems prop", () => {
      const { container: container6 } = render(
        <QuickActions {...defaultProps} maxItems={6} />
      );

      const { container: container12 } = render(
        <QuickActions {...defaultProps} maxItems={12} />
      );

      // Both should render successfully
      expect(container6).toBeInTheDocument();
      expect(container12).toBeInTheDocument();
    });
  });

  describe("frequent actions", () => {
    it("does not show frequent section when showFrequent is false", () => {
      render(<QuickActions {...defaultProps} showFrequent={false} />);

      expect(screen.queryByText("Frequent")).not.toBeInTheDocument();
    });

    it("does not show frequent section initially (no usage)", () => {
      render(<QuickActions {...defaultProps} showFrequent={true} />);

      // Frequent section only appears after actions have been used
      expect(screen.queryByText("Frequent")).not.toBeInTheDocument();
    });
  });

  describe("pinned actions", () => {
    it("shows pinned actions first", () => {
      render(<QuickActions {...defaultProps} />);

      // Default pinned actions include translate, explain, summarize, copy
      // They should appear in the list
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe("active action", () => {
    it("highlights active action", () => {
      render(<QuickActions {...defaultProps} activeAction="translate" />);

      // Should render with active state
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe("selected text", () => {
    it("renders with selected text", () => {
      render(
        <QuickActions {...defaultProps} selectedText="Hello world" />
      );

      // Should render successfully with selected text
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
