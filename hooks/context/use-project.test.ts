/**
 * useProject Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useProject } from './use-project';
import { useProjectStore, useSessionStore } from '@/stores';

// Mock stores
jest.mock('@/stores', () => ({
  useProjectStore: jest.fn(),
  useSessionStore: jest.fn(),
}));

const mockProjects = [
  {
    id: 'project-1',
    name: 'Test Project 1',
    color: '#3B82F6',
    isArchived: false,
    sessionIds: ['session-1'],
    knowledgeBase: [],
    tags: ['work'],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastAccessedAt: new Date(),
    sessionCount: 1,
    messageCount: 0,
  },
  {
    id: 'project-2',
    name: 'Test Project 2',
    color: '#22C55E',
    isArchived: true,
    sessionIds: [],
    knowledgeBase: [],
    tags: ['personal'],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastAccessedAt: new Date(),
    sessionCount: 0,
    messageCount: 0,
  },
];

const mockSessions = [
  {
    id: 'session-1',
    title: 'Test Session',
    projectId: 'project-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    provider: 'openai',
    model: 'gpt-4o',
    mode: 'chat' as const,
    messageCount: 0,
  },
];

describe('useProject', () => {
  const mockCreateProject = jest.fn();
  const mockUpdateProject = jest.fn();
  const mockDeleteProject = jest.fn();
  const mockSetActiveProject = jest.fn();
  const mockDuplicateProject = jest.fn();
  const mockArchiveProject = jest.fn();
  const mockUnarchiveProject = jest.fn();
  const mockAddSessionToProject = jest.fn();
  const mockRemoveSessionFromProject = jest.fn();
  const mockGetProject = jest.fn();
  const mockGetActiveProject = jest.fn();
  const mockGetProjectForSession = jest.fn();
  const mockGetActiveProjects = jest.fn();
  const mockGetArchivedProjects = jest.fn();
  const mockGetProjectsByTag = jest.fn();
  const mockGetAllTags = jest.fn();
  const mockUpdateSession = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetProject.mockImplementation((id: string) => 
      mockProjects.find(p => p.id === id)
    );
    mockGetActiveProject.mockReturnValue(mockProjects[0]);
    mockGetProjectForSession.mockReturnValue(mockProjects[0]);
    mockGetActiveProjects.mockReturnValue([mockProjects[0]]);
    mockGetArchivedProjects.mockReturnValue([mockProjects[1]]);
    mockGetProjectsByTag.mockReturnValue([mockProjects[0]]);
    mockGetAllTags.mockReturnValue(['work', 'personal']);
    mockCreateProject.mockReturnValue(mockProjects[0]);
    mockDuplicateProject.mockReturnValue({ ...mockProjects[0], id: 'project-3' });

    (useProjectStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        projects: mockProjects,
        activeProjectId: 'project-1',
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject,
        setActiveProject: mockSetActiveProject,
        duplicateProject: mockDuplicateProject,
        archiveProject: mockArchiveProject,
        unarchiveProject: mockUnarchiveProject,
        addSessionToProject: mockAddSessionToProject,
        removeSessionFromProject: mockRemoveSessionFromProject,
        getProject: mockGetProject,
        getActiveProject: mockGetActiveProject,
        getProjectForSession: mockGetProjectForSession,
        getActiveProjects: mockGetActiveProjects,
        getArchivedProjects: mockGetArchivedProjects,
        getProjectsByTag: mockGetProjectsByTag,
        getAllTags: mockGetAllTags,
      };
      return selector(state);
    });

    (useSessionStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        activeSessionId: 'session-1',
        sessions: mockSessions,
        updateSession: mockUpdateSession,
      };
      return selector(state);
    });
  });

  it('returns projects from store', () => {
    const { result } = renderHook(() => useProject());
    
    expect(result.current.projects).toEqual(mockProjects);
  });

  it('returns activeProjectId from store', () => {
    const { result } = renderHook(() => useProject());
    
    expect(result.current.activeProjectId).toBe('project-1');
  });

  it('returns activeProject from store', () => {
    const { result } = renderHook(() => useProject());
    
    expect(result.current.activeProject).toEqual(mockProjects[0]);
  });

  it('returns computed hasProjects correctly', () => {
    const { result } = renderHook(() => useProject());
    
    expect(result.current.hasProjects).toBe(true);
    expect(result.current.projectCount).toBe(2);
  });

  it('returns currentSessionProject when session is linked', () => {
    const { result } = renderHook(() => useProject());
    
    expect(result.current.currentSessionProject).toEqual(mockProjects[0]);
  });

  it('getProject returns correct project', () => {
    const { result } = renderHook(() => useProject());
    
    const project = result.current.getProject('project-1');
    expect(project).toEqual(mockProjects[0]);
  });

  it('getActiveProjects returns non-archived projects', () => {
    const { result } = renderHook(() => useProject());
    
    const activeProjects = result.current.getActiveProjects();
    expect(activeProjects).toEqual([mockProjects[0]]);
  });

  it('getArchivedProjects returns archived projects', () => {
    const { result } = renderHook(() => useProject());
    
    const archivedProjects = result.current.getArchivedProjects();
    expect(archivedProjects).toEqual([mockProjects[1]]);
  });

  it('getAllTags returns all unique tags', () => {
    const { result } = renderHook(() => useProject());
    
    const tags = result.current.getAllTags();
    expect(tags).toEqual(['work', 'personal']);
  });

  it('createProject calls store method', () => {
    const { result } = renderHook(() => useProject());
    
    const input = { name: 'New Project' };
    result.current.createProject(input);
    
    expect(mockCreateProject).toHaveBeenCalledWith(input);
  });

  it('updateProject calls store method', () => {
    const { result } = renderHook(() => useProject());
    
    result.current.updateProject('project-1', { name: 'Updated' });
    
    expect(mockUpdateProject).toHaveBeenCalledWith('project-1', { name: 'Updated' });
  });

  it('deleteProject calls store method', () => {
    const { result } = renderHook(() => useProject());
    
    result.current.deleteProject('project-1');
    
    expect(mockDeleteProject).toHaveBeenCalledWith('project-1');
  });

  it('setActiveProject calls store method', () => {
    const { result } = renderHook(() => useProject());
    
    result.current.setActiveProject('project-2');
    
    expect(mockSetActiveProject).toHaveBeenCalledWith('project-2');
  });

  it('duplicateProject calls store method', () => {
    const { result } = renderHook(() => useProject());
    
    result.current.duplicateProject('project-1');
    
    expect(mockDuplicateProject).toHaveBeenCalledWith('project-1');
  });

  it('archiveProject calls store method', () => {
    const { result } = renderHook(() => useProject());
    
    result.current.archiveProject('project-1');
    
    expect(mockArchiveProject).toHaveBeenCalledWith('project-1');
  });

  it('unarchiveProject calls store method', () => {
    const { result } = renderHook(() => useProject());
    
    result.current.unarchiveProject('project-2');
    
    expect(mockUnarchiveProject).toHaveBeenCalledWith('project-2');
  });

  it('addSessionToProject calls store method', () => {
    const { result } = renderHook(() => useProject());
    
    result.current.addSessionToProject('project-1', 'session-2');
    
    expect(mockAddSessionToProject).toHaveBeenCalledWith('project-1', 'session-2');
  });

  it('removeSessionFromProject calls store method', () => {
    const { result } = renderHook(() => useProject());
    
    result.current.removeSessionFromProject('project-1', 'session-1');
    
    expect(mockRemoveSessionFromProject).toHaveBeenCalledWith('project-1', 'session-1');
  });

  it('linkCurrentSessionToProject links current session', () => {
    const { result } = renderHook(() => useProject());
    
    act(() => {
      result.current.linkCurrentSessionToProject('project-2');
    });
    
    // Should remove from old project first
    expect(mockRemoveSessionFromProject).toHaveBeenCalledWith('project-1', 'session-1');
    // Then add to new project
    expect(mockAddSessionToProject).toHaveBeenCalledWith('project-2', 'session-1');
    // And update session
    expect(mockUpdateSession).toHaveBeenCalledWith('session-1', { projectId: 'project-2' });
  });

  it('unlinkCurrentSession removes current session from project', () => {
    const { result } = renderHook(() => useProject());
    
    act(() => {
      result.current.unlinkCurrentSession();
    });
    
    expect(mockRemoveSessionFromProject).toHaveBeenCalledWith('project-1', 'session-1');
    expect(mockUpdateSession).toHaveBeenCalledWith('session-1', { projectId: undefined });
  });

  it('linkCurrentSessionToProject does nothing without active session', () => {
    (useSessionStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        activeSessionId: null,
        sessions: [],
        updateSession: mockUpdateSession,
      };
      return selector(state);
    });

    const { result } = renderHook(() => useProject());
    
    act(() => {
      result.current.linkCurrentSessionToProject('project-2');
    });
    
    expect(mockAddSessionToProject).not.toHaveBeenCalled();
  });

  it('unlinkCurrentSession does nothing without linked session', () => {
    (useSessionStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        activeSessionId: 'session-2',
        sessions: [{ ...mockSessions[0], id: 'session-2', projectId: undefined }],
        updateSession: mockUpdateSession,
      };
      return selector(state);
    });

    const { result } = renderHook(() => useProject());
    
    act(() => {
      result.current.unlinkCurrentSession();
    });
    
    expect(mockRemoveSessionFromProject).not.toHaveBeenCalled();
  });
});
