/**
 * Skill Discovery Component Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      installed: 'Installed',
      install: 'Install',
      noDescription: 'No description available',
      viewSource: 'View Source',
      manageRepos: 'Manage Repos',
      skillRepositories: 'Skill Repositories',
      repoManagerDescription: 'Configure GitHub repositories to discover skills from.',
      branch: 'Branch',
      addRepository: 'Add Repository',
      ownerPlaceholder: 'Owner',
      repoNamePlaceholder: 'Repository name',
      branchPlaceholder: 'Branch (default: main)',
      refresh: 'Refresh',
      searchDiscoverable: 'Search discoverable skills...',
      nativeNotAvailable: 'Native Skills Not Available',
      nativeNotAvailableDesc: 'Skill discovery requires the desktop app.',
      noSearchResults: 'No Skills Found',
      tryDifferentSearch: 'Try a different search term.',
      noDiscoverableSkills: 'No Discoverable Skills',
      clickRefreshToDiscover: 'Click refresh to discover skills.',
      discoverSkills: 'Discover Skills',
      showingSkills: `Showing ${params?.count || 0} of ${params?.total || 0} skills`,
      installedCount: `${params?.count || 0} installed`,
      close: 'Close',
      installFailed: 'Installation Failed',
    };
    return translations[key] || key;
  },
}));

// Mock hooks
jest.mock('@/hooks/ai', () => ({
  useSkillSync: jest.fn(),
  useSkillSyncAvailable: jest.fn(),
}));

jest.mock('@/hooks/ai/use-native-skills', () => ({
  useNativeSkills: jest.fn(),
}));

// Mock toast
jest.mock('@/components/ui/toaster', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

import { SkillDiscovery } from './skill-discovery';
import { useSkillSync, useSkillSyncAvailable } from '@/hooks/ai';
import { useNativeSkills } from '@/hooks/ai/use-native-skills';
import { toast } from '@/components/ui/toaster';
import type { DiscoverableSkill, InstalledSkill, SkillRepo } from '@/hooks/ai/use-native-skills';

const mockUseSkillSync = jest.mocked(useSkillSync);
const mockUseSkillSyncAvailable = jest.mocked(useSkillSyncAvailable);
const mockUseNativeSkills = jest.mocked(useNativeSkills);
const mockToast = jest.mocked(toast);

describe('SkillDiscovery', () => {
  const mockDiscoverableSkill: DiscoverableSkill = {
    key: 'anthropics/skills:example',
    name: 'Example Skill',
    description: 'An example skill for testing',
    directory: 'example',
    readmeUrl: 'https://github.com/anthropics/skills/tree/main/example',
    repoOwner: 'anthropics',
    repoName: 'skills',
    repoBranch: 'main',
  };

  const mockInstalledSkill: InstalledSkill = {
    id: 'anthropics/skills:example',
    name: 'Example Skill',
    description: 'An example skill for testing',
    directory: 'example',
    repoOwner: 'anthropics',
    repoName: 'skills',
    repoBranch: 'main',
    readmeUrl: 'https://github.com/anthropics/skills/tree/main/example',
    installedAt: Date.now(),
    enabled: true,
    category: null,
    tags: [],
  };

  const mockRepo: SkillRepo = {
    owner: 'anthropics',
    name: 'skills',
    branch: 'main',
    enabled: true,
  };

  const mockDiscoverFromRepos = jest.fn();
  const mockInstallFromRepo = jest.fn();
  const mockAddRepo = jest.fn();
  const mockRemoveRepo = jest.fn();
  const mockToggleRepo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSkillSyncAvailable.mockReturnValue(true);

    mockUseSkillSync.mockReturnValue({
      isSyncing: false,
      lastSyncAt: null,
      syncError: null,
      discoverable: [],
      isDiscovering: false,
      syncFromNative: jest.fn(),
      syncToNative: jest.fn(),
      installFromRepo: mockInstallFromRepo,
      uninstallNativeSkill: jest.fn(),
      discoverFromRepos: mockDiscoverFromRepos,
      refreshAll: jest.fn(),
    });

    mockUseNativeSkills.mockReturnValue({
      repos: [mockRepo],
      installed: [],
      discoverable: [],
      local: [],
      allSkills: [],
      isLoading: false,
      isDiscovering: false,
      error: null,
      refreshRepos: jest.fn(),
      addRepo: mockAddRepo,
      removeRepo: mockRemoveRepo,
      toggleRepo: mockToggleRepo,
      discover: jest.fn(),
      refreshAll: jest.fn(),
      scanLocal: jest.fn(),
      install: jest.fn(),
      installLocal: jest.fn(),
      registerLocal: jest.fn(),
      uninstall: jest.fn(),
      enable: jest.fn(),
      disable: jest.fn(),
      update: jest.fn(),
      readContent: jest.fn(),
      listResources: jest.fn(),
      readResource: jest.fn(),
      getSsotDir: jest.fn(),
      clearError: jest.fn(),
    });
  });

  describe('Native Unavailable', () => {
    it('should show unavailable message when native is not available', () => {
      mockUseSkillSyncAvailable.mockReturnValue(false);

      render(<SkillDiscovery />);

      expect(screen.getByText('Native Skills Not Available')).toBeInTheDocument();
      expect(screen.getByText('Skill discovery requires the desktop app.')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no skills discovered', () => {
      render(<SkillDiscovery />);

      expect(screen.getByText('No Discoverable Skills')).toBeInTheDocument();
      expect(screen.getByText('Click refresh to discover skills.')).toBeInTheDocument();
    });

    it('should show discover button in empty state', () => {
      render(<SkillDiscovery />);

      const discoverButton = screen.getByRole('button', { name: /discover skills/i });
      expect(discoverButton).toBeInTheDocument();
    });

    it('should call discoverFromRepos when discover button is clicked', async () => {
      render(<SkillDiscovery />);

      const discoverButton = screen.getByRole('button', { name: /discover skills/i });
      await userEvent.click(discoverButton);

      expect(mockDiscoverFromRepos).toHaveBeenCalled();
    });
  });

  describe('With Discoverable Skills', () => {
    beforeEach(() => {
      mockUseSkillSync.mockReturnValue({
        ...mockUseSkillSync(),
        discoverable: [mockDiscoverableSkill],
      });
    });

    it('should display discoverable skills', () => {
      render(<SkillDiscovery />);

      expect(screen.getByText('Example Skill')).toBeInTheDocument();
      expect(screen.getByText('An example skill for testing')).toBeInTheDocument();
    });

    it('should show repo info on skill card', () => {
      render(<SkillDiscovery />);

      expect(screen.getByText('anthropics/skills')).toBeInTheDocument();
    });

    it('should show install button for non-installed skills', () => {
      render(<SkillDiscovery />);

      expect(screen.getByRole('button', { name: /install/i })).toBeInTheDocument();
    });

    it('should show installed badge for installed skills', () => {
      mockUseNativeSkills.mockReturnValue({
        ...mockUseNativeSkills(),
        installed: [mockInstalledSkill],
      });

      render(<SkillDiscovery />);

      expect(screen.getByText('Installed')).toBeInTheDocument();
    });

    it('should show skill count in footer', () => {
      render(<SkillDiscovery />);

      expect(screen.getByText(/showing 1 of 1 skills/i)).toBeInTheDocument();
    });
  });

  describe('Search', () => {
    beforeEach(() => {
      mockUseSkillSync.mockReturnValue({
        ...mockUseSkillSync(),
        discoverable: [
          mockDiscoverableSkill,
          {
            ...mockDiscoverableSkill,
            key: 'other/repo:other-skill',
            name: 'Other Skill',
            description: 'Another skill',
            directory: 'other-skill',
          },
        ],
      });
    });

    it('should filter skills by search query', async () => {
      render(<SkillDiscovery />);

      const searchInput = screen.getByPlaceholderText('Search discoverable skills...');
      await userEvent.type(searchInput, 'Example');

      expect(screen.getByText('Example Skill')).toBeInTheDocument();
      expect(screen.queryByText('Other Skill')).not.toBeInTheDocument();
    });

    it('should show no results message when search has no matches', async () => {
      render(<SkillDiscovery />);

      const searchInput = screen.getByPlaceholderText('Search discoverable skills...');
      await userEvent.type(searchInput, 'nonexistent');

      expect(screen.getByText('No Skills Found')).toBeInTheDocument();
      expect(screen.getByText('Try a different search term.')).toBeInTheDocument();
    });

    it('should search by description', async () => {
      render(<SkillDiscovery />);

      const searchInput = screen.getByPlaceholderText('Search discoverable skills...');
      await userEvent.type(searchInput, 'testing');

      expect(screen.getByText('Example Skill')).toBeInTheDocument();
    });

    it('should search by directory', async () => {
      render(<SkillDiscovery />);

      const searchInput = screen.getByPlaceholderText('Search discoverable skills...');
      await userEvent.type(searchInput, 'example');

      expect(screen.getByText('Example Skill')).toBeInTheDocument();
    });
  });

  describe('Installation', () => {
    beforeEach(() => {
      mockUseSkillSync.mockReturnValue({
        ...mockUseSkillSync(),
        discoverable: [mockDiscoverableSkill],
      });
    });

    it('should call installFromRepo when install button is clicked', async () => {
      mockInstallFromRepo.mockResolvedValue({ id: 'test', metadata: { name: 'Test' } });

      render(<SkillDiscovery />);

      const installButton = screen.getByRole('button', { name: /install/i });
      await userEvent.click(installButton);

      expect(mockInstallFromRepo).toHaveBeenCalledWith(mockDiscoverableSkill);
    });

    it('should show success toast on successful installation', async () => {
      mockInstallFromRepo.mockResolvedValue({ id: 'test', metadata: { name: 'Test' } });

      render(<SkillDiscovery />);

      const installButton = screen.getByRole('button', { name: /install/i });
      await userEvent.click(installButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Installed', 'Example Skill');
      });
    });

    it('should show error toast on failed installation', async () => {
      mockInstallFromRepo.mockRejectedValue(new Error('Installation failed'));

      render(<SkillDiscovery />);

      const installButton = screen.getByRole('button', { name: /install/i });
      await userEvent.click(installButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Installation Failed', expect.any(String));
      });
    });

    it('should call onSkillInstalled callback on success', async () => {
      mockInstallFromRepo.mockResolvedValue({ id: 'test', metadata: { name: 'Test' } });
      const onSkillInstalled = jest.fn();

      render(<SkillDiscovery onSkillInstalled={onSkillInstalled} />);

      const installButton = screen.getByRole('button', { name: /install/i });
      await userEvent.click(installButton);

      await waitFor(() => {
        expect(onSkillInstalled).toHaveBeenCalledWith('Example Skill');
      });
    });
  });

  describe('Refresh', () => {
    it('should call discoverFromRepos when refresh button is clicked', async () => {
      render(<SkillDiscovery />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await userEvent.click(refreshButton);

      expect(mockDiscoverFromRepos).toHaveBeenCalled();
    });

    it('should disable refresh button while discovering', () => {
      mockUseSkillSync.mockReturnValue({
        ...mockUseSkillSync(),
        isDiscovering: true,
      });

      render(<SkillDiscovery />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display sync error alert', () => {
      mockUseSkillSync.mockReturnValue({
        ...mockUseSkillSync(),
        syncError: 'Failed to discover skills',
      });

      render(<SkillDiscovery />);

      expect(screen.getByText('Failed to discover skills')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator while discovering with no skills', () => {
      mockUseSkillSync.mockReturnValue({
        ...mockUseSkillSync(),
        isDiscovering: true,
        discoverable: [],
      });

      render(<SkillDiscovery />);

      // Refresh button should be disabled during discovery
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Repository Manager Dialog', () => {
    it('should open repo manager dialog when manage repos button is clicked', async () => {
      render(<SkillDiscovery />);

      const manageButton = screen.getByRole('button', { name: /manage repos/i });
      await userEvent.click(manageButton);

      expect(screen.getByText('Skill Repositories')).toBeInTheDocument();
    });

    it('should show existing repos in dialog', async () => {
      render(<SkillDiscovery />);

      const manageButton = screen.getByRole('button', { name: /manage repos/i });
      await userEvent.click(manageButton);

      expect(screen.getByText('anthropics/skills')).toBeInTheDocument();
    });
  });

  describe('External Links', () => {
    beforeEach(() => {
      mockUseSkillSync.mockReturnValue({
        ...mockUseSkillSync(),
        discoverable: [mockDiscoverableSkill],
      });
    });

    it('should have view source link with correct href', () => {
      render(<SkillDiscovery />);

      const viewSourceLink = screen.getByRole('link', { name: /view source/i });
      expect(viewSourceLink).toHaveAttribute('href', mockDiscoverableSkill.readmeUrl);
      expect(viewSourceLink).toHaveAttribute('target', '_blank');
    });
  });
});
