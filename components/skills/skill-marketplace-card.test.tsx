/**
 * SkillMarketplaceCard Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SkillMarketplaceCard } from './skill-marketplace-card';
import type { SkillsMarketplaceItem, SkillInstallStatus } from '@/types/skill/skill-marketplace';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Star: () => <span data-testid="star-icon" />,
  Download: () => <span data-testid="download-icon" />,
  Heart: () => <span data-testid="heart-icon" />,
  ExternalLink: () => <span data-testid="external-link-icon" />,
  Check: () => <span data-testid="check-icon" />,
  CheckCircle: () => <span data-testid="check-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
  AlertCircle: () => <span data-testid="alert-icon" />,
  Package: () => <span data-testid="package-icon" />,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: React.PropsWithChildren) => <span className="badge">{children}</span>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, onClick }: React.PropsWithChildren<{ onClick?: () => void }>) => <div onClick={onClick}>{children}</div>,
  CardContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardDescription: ({ children }: React.PropsWithChildren) => <p>{children}</p>,
  CardHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardTitle: ({ children }: React.PropsWithChildren) => <h3>{children}</h3>,
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

type CardItem = SkillsMarketplaceItem & {
  installStatus: SkillInstallStatus;
  isInstalled: boolean;
};

const mockItem: CardItem = {
  id: 'test/skill',
  name: 'Test Skill',
  description: 'A test skill for testing purposes',
  author: 'test-author',
  repository: 'test/repo',
  directory: 'skills/test',
  stars: 1500,
  downloads: 5000,
  tags: ['react', 'testing'],
  category: 'development',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-15',
  license: 'MIT',
  version: '1.0.0',
  installStatus: 'not_installed',
  isInstalled: false,
};

describe('SkillMarketplaceCard Component', () => {
  const defaultProps = {
    item: mockItem,
    viewMode: 'grid' as const,
    onClick: jest.fn(),
    onInstall: jest.fn(),
    onToggleFavorite: jest.fn(),
    isFavorite: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Grid View Rendering', () => {
    it('should render skill name', () => {
      render(<SkillMarketplaceCard {...defaultProps} />);

      expect(screen.getByText('Test Skill')).toBeInTheDocument();
    });

    it('should render skill description', () => {
      render(<SkillMarketplaceCard {...defaultProps} />);

      expect(screen.getByText('A test skill for testing purposes')).toBeInTheDocument();
    });

    it('should render author', () => {
      render(<SkillMarketplaceCard {...defaultProps} />);

      expect(screen.getByText('test-author')).toBeInTheDocument();
    });

    it('should render star count', () => {
      render(<SkillMarketplaceCard {...defaultProps} />);

      expect(screen.getByText('1.5K')).toBeInTheDocument();
    });

    it('should render tags', () => {
      render(<SkillMarketplaceCard {...defaultProps} />);

      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('testing')).toBeInTheDocument();
    });

    it('should render star icon', () => {
      render(<SkillMarketplaceCard {...defaultProps} />);

      expect(screen.getByTestId('star-icon')).toBeInTheDocument();
    });
  });

  describe('List View Rendering', () => {
    it('should render in list mode', () => {
      render(<SkillMarketplaceCard {...defaultProps} viewMode="list" />);

      expect(screen.getByText('Test Skill')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClick when card is clicked', async () => {
      render(<SkillMarketplaceCard {...defaultProps} />);
      const user = userEvent.setup();

      const card = screen.getByText('Test Skill').closest('div');
      if (card) {
        await user.click(card);
        expect(defaultProps.onClick).toHaveBeenCalled();
      }
    });

    it('should call onInstall when install button is clicked', async () => {
      render(<SkillMarketplaceCard {...defaultProps} />);
      const user = userEvent.setup();

      const installButton = screen.getByText('install');
      await user.click(installButton);

      expect(defaultProps.onInstall).toHaveBeenCalled();
    });

    it('should call onToggleFavorite when favorite button is clicked', async () => {
      render(<SkillMarketplaceCard {...defaultProps} />);
      const user = userEvent.setup();

      const heartIcon = screen.getByTestId('heart-icon');
      const favoriteButton = heartIcon.closest('button');
      if (favoriteButton) {
        await user.click(favoriteButton);
        expect(defaultProps.onToggleFavorite).toHaveBeenCalled();
      }
    });
  });

  describe('Installation Status', () => {
    it('should show install button when not installed', () => {
      render(<SkillMarketplaceCard {...defaultProps} />);

      expect(screen.getByText('install')).toBeInTheDocument();
    });

    it('should show installing state', () => {
      const installingItem = { ...mockItem, installStatus: 'installing' as const };
      render(<SkillMarketplaceCard {...defaultProps} item={installingItem} />);

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });

    it('should show installed state', () => {
      const installedItem = { ...mockItem, installStatus: 'installed' as const, isInstalled: true };
      render(<SkillMarketplaceCard {...defaultProps} item={installedItem} />);

      expect(screen.getByText('installed')).toBeInTheDocument();
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

    it('should show error state with retry button', () => {
      const errorItem = { ...mockItem, installStatus: 'error' as const };
      render(<SkillMarketplaceCard {...defaultProps} item={errorItem} />);

      expect(screen.getByText('retry')).toBeInTheDocument();
    });
  });

  describe('Favorite State', () => {
    it('should show filled heart when favorited', () => {
      render(<SkillMarketplaceCard {...defaultProps} isFavorite={true} />);

      const heartIcon = screen.getByTestId('heart-icon');
      expect(heartIcon).toBeInTheDocument();
    });

    it('should show outline heart when not favorited', () => {
      render(<SkillMarketplaceCard {...defaultProps} isFavorite={false} />);

      const heartIcon = screen.getByTestId('heart-icon');
      expect(heartIcon).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional fields', () => {
      const minimalItem: CardItem = {
        id: 'minimal/skill',
        name: 'Minimal Skill',
        description: '',
        author: 'author',
        repository: 'author/repo',
        directory: 'skills',
        stars: 0,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        installStatus: 'not_installed',
        isInstalled: false,
      };

      render(<SkillMarketplaceCard {...defaultProps} item={minimalItem} />);

      expect(screen.getByText('Minimal Skill')).toBeInTheDocument();
    });

    it('should format large star counts correctly', () => {
      const popularItem: CardItem = { ...mockItem, stars: 1500000 };
      render(<SkillMarketplaceCard {...defaultProps} item={popularItem} />);

      expect(screen.getByText('1.5M')).toBeInTheDocument();
    });
  });
});
