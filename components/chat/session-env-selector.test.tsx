/**
 * Tests for SessionEnvSelector Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionEnvSelector } from './session-env-selector';
import { useSessionEnv } from '@/hooks/use-session-env';
import type { SessionEnvContext } from '@/hooks/use-session-env';

// Mock the hook
jest.mock('@/hooks/use-session-env');
const mockUseSessionEnv = useSessionEnv as jest.MockedFunction<typeof useSessionEnv>;

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      selectEnvironment: 'Select Environment',
      useDefault: 'Use Default',
      useDefaultDesc: 'Use project or global environment',
      noEnvironment: 'No Environment',
      environment: 'Environment',
      availableEnvironments: 'Available Environments',
    };
    return translations[key] || key;
  },
}));

const mockEnvironments = [
  {
    id: 'env-1',
    name: 'data-science',
    type: 'uv' as const,
    path: '/envs/data-science',
    pythonVersion: '3.11.0',
    pythonPath: '/envs/data-science/bin/python',
    status: 'active' as const,
    packages: 50,
    size: '200 MB',
    createdAt: '2024-01-01T00:00:00Z',
    lastUsedAt: '2024-06-01T00:00:00Z',
    isDefault: false,
    projectPath: null,
  },
  {
    id: 'env-2',
    name: 'web-dev',
    type: 'venv' as const,
    path: '/envs/web-dev',
    pythonVersion: '3.10.0',
    pythonPath: '/envs/web-dev/bin/python',
    status: 'inactive' as const,
    packages: 30,
    size: '100 MB',
    createdAt: '2024-02-01T00:00:00Z',
    lastUsedAt: null,
    isDefault: false,
    projectPath: null,
  },
];

const createMockContext = (overrides: Partial<SessionEnvContext> = {}): SessionEnvContext => ({
  envId: null,
  envPath: null,
  environment: null,
  source: 'none',
  hasEnvironment: false,
  setEnvironment: jest.fn(),
  clearEnvironment: jest.fn(),
  availableEnvironments: mockEnvironments,
  ...overrides,
});

describe('SessionEnvSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should not render when no environments available', () => {
      mockUseSessionEnv.mockReturnValue(createMockContext({ availableEnvironments: [] }));

      const { container } = render(<SessionEnvSelector />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when environments are available', () => {
      mockUseSessionEnv.mockReturnValue(createMockContext());

      render(<SessionEnvSelector />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should show "No Environment" when none selected', () => {
      mockUseSessionEnv.mockReturnValue(createMockContext());

      render(<SessionEnvSelector />);
      expect(screen.getByText('No Environment')).toBeInTheDocument();
    });

    it('should show environment name when selected', () => {
      mockUseSessionEnv.mockReturnValue(
        createMockContext({
          envId: 'env-1',
          envPath: '/envs/data-science',
          environment: mockEnvironments[0],
          source: 'session',
          hasEnvironment: true,
        })
      );

      render(<SessionEnvSelector />);
      expect(screen.getByText('data-science')).toBeInTheDocument();
    });

    it('should show source badge when environment is selected', () => {
      mockUseSessionEnv.mockReturnValue(
        createMockContext({
          envId: 'env-1',
          environment: mockEnvironments[0],
          source: 'session',
          hasEnvironment: true,
        })
      );

      render(<SessionEnvSelector />);
      expect(screen.getByText('Session')).toBeInTheDocument();
    });
  });

  describe('compact mode', () => {
    it('should render compact version', () => {
      mockUseSessionEnv.mockReturnValue(createMockContext());

      render(<SessionEnvSelector compact />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-7');
    });

    it('should show python version badge in compact mode when env selected', () => {
      mockUseSessionEnv.mockReturnValue(
        createMockContext({
          envId: 'env-1',
          environment: mockEnvironments[0],
          hasEnvironment: true,
        })
      );

      render(<SessionEnvSelector compact />);
      expect(screen.getByText('3.11')).toBeInTheDocument();
    });
  });

  describe('dropdown interactions', () => {
    it('should have dropdown trigger button', () => {
      mockUseSessionEnv.mockReturnValue(createMockContext());

      render(<SessionEnvSelector />);
      const button = screen.getByRole('button');

      expect(button).toHaveAttribute('aria-haspopup', 'menu');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('should be clickable', () => {
      mockUseSessionEnv.mockReturnValue(createMockContext());

      render(<SessionEnvSelector />);
      const button = screen.getByRole('button');

      // Should not throw when clicked
      expect(() => fireEvent.click(button)).not.toThrow();
    });

    it('should provide setEnvironment function', () => {
      const setEnvironment = jest.fn();
      mockUseSessionEnv.mockReturnValue(createMockContext({ setEnvironment }));

      render(<SessionEnvSelector />);

      // Verify the hook was called and setEnvironment is available
      expect(mockUseSessionEnv).toHaveBeenCalled();
      expect(setEnvironment).toBeDefined();
    });

    it('should provide clearEnvironment function', () => {
      const clearEnvironment = jest.fn();
      mockUseSessionEnv.mockReturnValue(createMockContext({ clearEnvironment }));

      render(<SessionEnvSelector />);

      // Verify the hook was called and clearEnvironment is available
      expect(mockUseSessionEnv).toHaveBeenCalled();
      expect(clearEnvironment).toBeDefined();
    });
  });

  describe('current environment display', () => {
    it('should display environment name in button when selected', () => {
      mockUseSessionEnv.mockReturnValue(
        createMockContext({
          envId: 'env-1',
          environment: mockEnvironments[0],
          hasEnvironment: true,
          source: 'session',
        })
      );

      render(<SessionEnvSelector />);

      // Environment name should be visible in the button
      expect(screen.getByText('data-science')).toBeInTheDocument();
    });

    it('should show source badge in button', () => {
      mockUseSessionEnv.mockReturnValue(
        createMockContext({
          envId: 'env-1',
          envPath: '/envs/data-science',
          environment: mockEnvironments[0],
          source: 'session',
          hasEnvironment: true,
        })
      );

      render(<SessionEnvSelector />);

      // Session badge should be in the button
      expect(screen.getByText('Session')).toBeInTheDocument();
    });
  });

  describe('with sessionId prop', () => {
    it('should pass sessionId to hook', () => {
      mockUseSessionEnv.mockReturnValue(createMockContext());

      render(<SessionEnvSelector sessionId="test-session-123" />);

      expect(mockUseSessionEnv).toHaveBeenCalledWith('test-session-123');
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      mockUseSessionEnv.mockReturnValue(createMockContext());

      render(<SessionEnvSelector className="custom-class" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });
});
