/**
 * Tests for PromptAnalyticsPanel component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PromptAnalyticsPanel } from './prompt-analytics-panel';
import type { PromptTemplate, PromptFeedback } from '@/types/content/prompt-template';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'Analytics & Insights',
      description: 'View performance metrics and optimization history',
      totalUses: 'Total Uses',
      avgRating: 'Avg Rating',
      successRate: 'Success Rate',
      avgResponseTime: 'Avg Response',
      effectivenessBreakdown: 'Effectiveness Breakdown',
      'effectivenessOptions.excellent': 'Excellent',
      'effectivenessOptions.good': 'Good',
      'effectivenessOptions.average': 'Average',
      'effectivenessOptions.poor': 'Poor',
      versionHistory: 'Version History',
      recentFeedback: 'Recent Feedback',
      noData: 'No analytics data yet',
      startCollecting: 'Use this prompt and collect feedback to see insights',
    };
    return translations[key] || key;
  },
}));

// Mock feedback data
const mockFeedback: PromptFeedback[] = [
  {
    id: '1',
    templateId: 'test-template',
    rating: 5,
    effectiveness: 'excellent',
    comment: 'Great prompt!',
    context: { model: 'gpt-4', responseTime: 1500 },
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    templateId: 'test-template',
    rating: 4,
    effectiveness: 'good',
    comment: 'Good results',
    context: { model: 'gpt-4', responseTime: 2000 },
    createdAt: new Date('2024-01-14'),
  },
  {
    id: '3',
    templateId: 'test-template',
    rating: 3,
    effectiveness: 'average',
    createdAt: new Date('2024-01-13'),
  },
  {
    id: '4',
    templateId: 'test-template',
    rating: 2,
    effectiveness: 'poor',
    comment: 'Needs improvement',
    createdAt: new Date('2024-01-12'),
  },
];

// Mock usePromptOptimizer hook
jest.mock('@/hooks/ai/use-prompt-optimizer', () => ({
  usePromptOptimizer: jest.fn(() => ({
    feedback: mockFeedback,
  })),
}));

import { usePromptOptimizer } from '@/hooks/ai/use-prompt-optimizer';
const mockUsePromptOptimizer = usePromptOptimizer as jest.MockedFunction<typeof usePromptOptimizer>;

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => 
    <h3 data-testid="card-title" className={className}>{children}</h3>,
  CardDescription: ({ children }: { children: React.ReactNode }) => 
    <p data-testid="card-description">{children}</p>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => 
    <span data-testid="badge" data-variant={variant} className={className}>{children}</span>,
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: { value?: number; className?: string }) => 
    <div data-testid="progress" data-value={value} className={className} role="progressbar" aria-valuenow={value} />,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => 
    <div data-testid="scroll-area" className={className}>{children}</div>,
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | boolean)[]) => classes.filter(c => typeof c === 'string' && c).join(' '),
}));

describe('PromptAnalyticsPanel', () => {
  const mockTemplate: PromptTemplate = {
    id: 'test-template',
    name: 'Test Template',
    content: 'Test content',
    description: 'Test description',
    tags: [],
    variables: [],
    source: 'user',
    usageCount: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    versionHistory: [
      {
        id: 'v1',
        version: 1,
        content: 'Original content',
        createdAt: new Date('2024-01-01'),
        changelog: 'Initial version',
        variables: [],
      },
      {
        id: 'v2',
        version: 2,
        content: 'Updated content',
        createdAt: new Date('2024-01-10'),
        changelog: 'Improved clarity',
        variables: [],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePromptOptimizer.mockReturnValue({
      feedback: mockFeedback,
    } as ReturnType<typeof usePromptOptimizer>);
  });

  describe('rendering', () => {
    it('should render the panel with title', () => {
      render(<PromptAnalyticsPanel template={mockTemplate} />);
      
      expect(screen.getByTestId('card-title')).toHaveTextContent('Analytics & Insights');
    });

    it('should render description', () => {
      render(<PromptAnalyticsPanel template={mockTemplate} />);
      
      expect(screen.getByTestId('card-description')).toHaveTextContent('View performance metrics');
    });
  });

  describe('key metrics', () => {
    it('should display total uses', () => {
      render(<PromptAnalyticsPanel template={mockTemplate} />);
      
      expect(screen.getByText('Total Uses')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument(); // 4 feedback items
    });

    it('should display average rating', () => {
      render(<PromptAnalyticsPanel template={mockTemplate} />);
      
      expect(screen.getByText('Avg Rating')).toBeInTheDocument();
      // Average of 5+4+3+2 = 14/4 = 3.5
      expect(screen.getByText('3.5')).toBeInTheDocument();
    });

    it('should display success rate', () => {
      render(<PromptAnalyticsPanel template={mockTemplate} />);
      
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
      // 2 successful (excellent + good) out of 4 = 50%
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should display average response time', () => {
      render(<PromptAnalyticsPanel template={mockTemplate} />);
      
      expect(screen.getByText('Avg Response')).toBeInTheDocument();
      // Average of 1500 + 2000 = 3500/2 = 1750ms = 1.8s
      expect(screen.getByText('1.8s')).toBeInTheDocument();
    });
  });

  describe('effectiveness breakdown', () => {
    it('should display effectiveness breakdown section', () => {
      render(<PromptAnalyticsPanel template={mockTemplate} />);
      
      expect(screen.getByText('Effectiveness Breakdown')).toBeInTheDocument();
    });

    it('should display all effectiveness categories', () => {
      render(<PromptAnalyticsPanel template={mockTemplate} />);
      
      // Multiple instances of these labels exist (in breakdown and feedback badges)
      expect(screen.getAllByText('Excellent').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Good').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Average').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Poor').length).toBeGreaterThan(0);
    });

    it('should render progress bars', () => {
      render(<PromptAnalyticsPanel template={mockTemplate} />);
      
      const progressBars = screen.getAllByTestId('progress');
      expect(progressBars.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('version history', () => {
    it('should display version history section when versions exist', () => {
      render(<PromptAnalyticsPanel template={mockTemplate} />);
      
      expect(screen.getByText('Version History')).toBeInTheDocument();
    });

    it('should display version badges', () => {
      render(<PromptAnalyticsPanel template={mockTemplate} />);
      
      const badges = screen.getAllByTestId('badge');
      expect(badges.some(b => b.textContent?.includes('v1') || b.textContent?.includes('v2'))).toBe(true);
    });

    it('should not display version history when no versions', () => {
      const templateWithoutHistory: PromptTemplate = {
        ...mockTemplate,
        versionHistory: undefined,
      };
      
      render(<PromptAnalyticsPanel template={templateWithoutHistory} />);
      
      expect(screen.queryByText('Version History')).not.toBeInTheDocument();
    });
  });

  describe('recent feedback', () => {
    it('should display recent feedback section', () => {
      render(<PromptAnalyticsPanel template={mockTemplate} />);
      
      expect(screen.getByText('Recent Feedback')).toBeInTheDocument();
    });

    it('should display feedback comments', () => {
      render(<PromptAnalyticsPanel template={mockTemplate} />);
      
      expect(screen.getByText('Great prompt!')).toBeInTheDocument();
      expect(screen.getByText('Good results')).toBeInTheDocument();
    });

    it('should display feedback ratings', () => {
      render(<PromptAnalyticsPanel template={mockTemplate} />);
      
      // Ratings should be displayed as badges
      const badges = screen.getAllByTestId('badge');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('empty state', () => {
    it('should display empty state when no feedback', () => {
      mockUsePromptOptimizer.mockReturnValue({
        feedback: [],
      } as unknown as ReturnType<typeof usePromptOptimizer>);

      render(<PromptAnalyticsPanel template={mockTemplate} />);
      
      expect(screen.getByText('No analytics data yet')).toBeInTheDocument();
      expect(screen.getByText('Use this prompt and collect feedback to see insights')).toBeInTheDocument();
    });

    it('should display zero metrics when no feedback', () => {
      mockUsePromptOptimizer.mockReturnValue({
        feedback: [],
      } as unknown as ReturnType<typeof usePromptOptimizer>);

      render(<PromptAnalyticsPanel template={mockTemplate} />);
      
      // Should show 0 for total uses (multiple 0s exist for different metrics)
      const zeroElements = screen.getAllByText('0');
      expect(zeroElements.length).toBeGreaterThan(0);
    });
  });

  describe('context information', () => {
    it('should display model information in feedback', () => {
      render(<PromptAnalyticsPanel template={mockTemplate} />);
      
      const modelElements = screen.getAllByText(/gpt-4/);
      expect(modelElements.length).toBeGreaterThan(0);
    });
  });
});
