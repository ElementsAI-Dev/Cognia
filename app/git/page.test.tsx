/**
 * Git Page Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GitPage from './page';

// Mock the GitPanel component
jest.mock('@/components/git', () => ({
  GitPanel: function MockGitPanel({ repoPath, className }: { repoPath?: string; className?: string }) {
    return (
      <div data-testid="git-panel" data-repo-path={repoPath} className={className}>
        Mock GitPanel
      </div>
    );
  },
}));

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

describe('GitPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render Git page title', () => {
    render(<GitPage />);
    expect(screen.getByText('Git')).toBeInTheDocument();
  });

  it('should render description text', () => {
    render(<GitPage />);
    expect(screen.getByText('Version control management')).toBeInTheDocument();
  });

  it('should render back button', () => {
    render(<GitPage />);
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('should render repository path input when no repo is active', () => {
    render(<GitPage />);
    expect(screen.getByPlaceholderText('Enter repository path...')).toBeInTheDocument();
  });

  it('should render open repository button', () => {
    render(<GitPage />);
    expect(screen.getByText('Open Repository')).toBeInTheDocument();
  });

  it('should disable open button when path is empty', () => {
    render(<GitPage />);
    const openButton = screen.getAllByText('Open Repository')[0].closest('button');
    expect(openButton).toBeDisabled();
  });

  it('should enable open button when path is entered', () => {
    render(<GitPage />);
    
    const input = screen.getByPlaceholderText('Enter repository path...');
    fireEvent.change(input, { target: { value: '/path/to/repo' } });
    
    const openButton = screen.getAllByText('Open Repository')[0].closest('button');
    expect(openButton).not.toBeDisabled();
  });

  it('should show GitPanel when repository is opened', async () => {
    render(<GitPage />);
    
    const input = screen.getByPlaceholderText('Enter repository path...');
    fireEvent.change(input, { target: { value: '/path/to/repo' } });
    
    const openButton = screen.getAllByText('Open Repository')[0].closest('button');
    if (openButton) {
      fireEvent.click(openButton);
    }
    
    await waitFor(() => {
      expect(screen.getByTestId('git-panel')).toBeInTheDocument();
    });
  });

  it('should pass repository path to GitPanel', async () => {
    render(<GitPage />);
    
    const input = screen.getByPlaceholderText('Enter repository path...');
    fireEvent.change(input, { target: { value: '/test/my-repo' } });
    
    const openButton = screen.getAllByText('Open Repository')[0].closest('button');
    if (openButton) {
      fireEvent.click(openButton);
    }
    
    await waitFor(() => {
      const gitPanel = screen.getByTestId('git-panel');
      expect(gitPanel).toHaveAttribute('data-repo-path', '/test/my-repo');
    });
  });

  it('should show repository name in header when active', async () => {
    render(<GitPage />);
    
    const input = screen.getByPlaceholderText('Enter repository path...');
    fireEvent.change(input, { target: { value: '/path/to/my-repo' } });
    
    const openButton = screen.getAllByText('Open Repository')[0].closest('button');
    if (openButton) {
      fireEvent.click(openButton);
    }
    
    await waitFor(() => {
      expect(screen.getByText('my-repo')).toBeInTheDocument();
    });
  });

  it('should show change button when repository is active', async () => {
    render(<GitPage />);
    
    const input = screen.getByPlaceholderText('Enter repository path...');
    fireEvent.change(input, { target: { value: '/path/to/repo' } });
    
    const openButton = screen.getAllByText('Open Repository')[0].closest('button');
    if (openButton) {
      fireEvent.click(openButton);
    }
    
    await waitFor(() => {
      expect(screen.getByText('Change')).toBeInTheDocument();
    });
  });

  it('should clear active repository when clicking change', async () => {
    render(<GitPage />);
    
    // Open a repo
    const input = screen.getByPlaceholderText('Enter repository path...');
    fireEvent.change(input, { target: { value: '/path/to/repo' } });
    
    const openButton = screen.getAllByText('Open Repository')[0].closest('button');
    if (openButton) {
      fireEvent.click(openButton);
    }
    
    await waitFor(() => {
      expect(screen.getByText('Change')).toBeInTheDocument();
    });
    
    // Click change
    const changeButton = screen.getByText('Change');
    fireEvent.click(changeButton);
    
    await waitFor(() => {
      // Should show the welcome card again
      expect(screen.getByText('Git Version Control')).toBeInTheDocument();
    });
  });

  it('should render welcome card when no repository is active', () => {
    render(<GitPage />);
    expect(screen.getByText('Git Version Control')).toBeInTheDocument();
  });

  it('should show quick tips when repository is active', async () => {
    render(<GitPage />);
    
    const input = screen.getByPlaceholderText('Enter repository path...');
    fireEvent.change(input, { target: { value: '/path/to/repo' } });
    
    const openButton = screen.getAllByText('Open Repository')[0].closest('button');
    if (openButton) {
      fireEvent.click(openButton);
    }
    
    await waitFor(() => {
      expect(screen.getByText('Quick Tips')).toBeInTheDocument();
    });
  });

  it('should show keyboard shortcuts section when repository is active', async () => {
    render(<GitPage />);
    
    const input = screen.getByPlaceholderText('Enter repository path...');
    fireEvent.change(input, { target: { value: '/path/to/repo' } });
    
    const openButton = screen.getAllByText('Open Repository')[0].closest('button');
    if (openButton) {
      fireEvent.click(openButton);
    }
    
    await waitFor(() => {
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });
  });

  it('should have link to settings page', async () => {
    render(<GitPage />);
    
    const input = screen.getByPlaceholderText('Enter repository path...');
    fireEvent.change(input, { target: { value: '/path/to/repo' } });
    
    const openButton = screen.getAllByText('Open Repository')[0].closest('button');
    if (openButton) {
      fireEvent.click(openButton);
    }
    
    await waitFor(() => {
      const settingsLink = screen.getByText('Settings → Git');
      expect(settingsLink.closest('a')).toHaveAttribute('href', '/settings');
    });
  });

  it('should render folder open button', () => {
    render(<GitPage />);
    
    const folderButtons = screen.getAllByRole('button').filter(
      btn => btn.querySelector('svg.lucide-folder-open')
    );
    expect(folderButtons.length).toBeGreaterThan(0);
  });

  it('should render repository overview when active', async () => {
    render(<GitPage />);
    
    const input = screen.getByPlaceholderText('Enter repository path...');
    fireEvent.change(input, { target: { value: '/path/to/repo' } });
    
    const openButton = screen.getAllByText('Open Repository')[0].closest('button');
    if (openButton) {
      fireEvent.click(openButton);
    }
    
    await waitFor(() => {
      expect(screen.getByText('Repository Overview')).toBeInTheDocument();
    });
  });
});
