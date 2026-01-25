/**
 * Tests for Project Activity Store
 */

import { act } from '@testing-library/react';
import { useProjectActivityStore, getActivityDescription } from './project-activity-store';

describe('useProjectActivityStore', () => {
  beforeEach(() => {
    useProjectActivityStore.setState({
      activities: [],
      maxActivitiesPerProject: 100,
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useProjectActivityStore.getState();
      expect(state.activities).toEqual([]);
      expect(state.maxActivitiesPerProject).toBe(100);
    });
  });

  describe('addActivity', () => {
    it('should add activity', () => {
      act(() => {
        useProjectActivityStore
          .getState()
          .addActivity('project-1', 'project_created', 'Project created');
      });

      const activities = useProjectActivityStore.getState().activities;
      expect(activities).toHaveLength(1);
      expect(activities[0].projectId).toBe('project-1');
      expect(activities[0].type).toBe('project_created');
      expect(activities[0].description).toBe('Project created');
      expect(activities[0].timestamp).toBeInstanceOf(Date);
    });

    it('should add activity with metadata', () => {
      act(() => {
        useProjectActivityStore
          .getState()
          .addActivity('project-1', 'session_added', 'Session added', {
            sessionTitle: 'Test Session',
          });
      });

      const activities = useProjectActivityStore.getState().activities;
      expect(activities[0].metadata).toEqual({ sessionTitle: 'Test Session' });
    });

    it('should limit activities per project', () => {
      useProjectActivityStore.setState({
        ...useProjectActivityStore.getState(),
        maxActivitiesPerProject: 3,
      });

      act(() => {
        for (let i = 0; i < 5; i++) {
          useProjectActivityStore
            .getState()
            .addActivity('project-1', 'project_updated', `Update ${i}`);
        }
      });

      const projectActivities = useProjectActivityStore
        .getState()
        .getActivitiesForProject('project-1');
      expect(projectActivities).toHaveLength(3);
    });

    it('should add new activities at the beginning', () => {
      act(() => {
        useProjectActivityStore.getState().addActivity('project-1', 'project_created', 'First');
        useProjectActivityStore.getState().addActivity('project-1', 'project_updated', 'Second');
      });

      const activities = useProjectActivityStore.getState().getActivitiesForProject('project-1');
      expect(activities[0].description).toBe('Second');
      expect(activities[1].description).toBe('First');
    });
  });

  describe('getActivitiesForProject', () => {
    it('should return activities for specific project', () => {
      act(() => {
        useProjectActivityStore.getState().addActivity('project-1', 'project_created', 'P1');
        useProjectActivityStore.getState().addActivity('project-2', 'project_created', 'P2');
        useProjectActivityStore.getState().addActivity('project-1', 'project_updated', 'P1 Update');
      });

      const p1Activities = useProjectActivityStore.getState().getActivitiesForProject('project-1');
      expect(p1Activities).toHaveLength(2);
      expect(p1Activities.every((a) => a.projectId === 'project-1')).toBe(true);
    });

    it('should return activities sorted by timestamp descending', () => {
      act(() => {
        useProjectActivityStore.getState().addActivity('project-1', 'project_created', 'First');
        useProjectActivityStore.getState().addActivity('project-1', 'project_updated', 'Second');
        useProjectActivityStore.getState().addActivity('project-1', 'project_archived', 'Third');
      });

      const activities = useProjectActivityStore.getState().getActivitiesForProject('project-1');
      expect(activities[0].description).toBe('Third');
      expect(activities[2].description).toBe('First');
    });
  });

  describe('clearActivitiesForProject', () => {
    it('should clear activities for specific project', () => {
      act(() => {
        useProjectActivityStore.getState().addActivity('project-1', 'project_created', 'P1');
        useProjectActivityStore.getState().addActivity('project-2', 'project_created', 'P2');
      });

      act(() => {
        useProjectActivityStore.getState().clearActivitiesForProject('project-1');
      });

      expect(useProjectActivityStore.getState().getActivitiesForProject('project-1')).toHaveLength(
        0
      );
      expect(useProjectActivityStore.getState().getActivitiesForProject('project-2')).toHaveLength(
        1
      );
    });
  });

  describe('clearAllActivities', () => {
    it('should clear all activities', () => {
      act(() => {
        useProjectActivityStore.getState().addActivity('project-1', 'project_created', 'P1');
        useProjectActivityStore.getState().addActivity('project-2', 'project_created', 'P2');
      });

      act(() => {
        useProjectActivityStore.getState().clearAllActivities();
      });

      expect(useProjectActivityStore.getState().activities).toHaveLength(0);
    });
  });
});

describe('getActivityDescription', () => {
  it('should return description for simple types', () => {
    expect(getActivityDescription('project_created')).toBe('Project created');
    expect(getActivityDescription('project_archived')).toBe('Project archived');
    expect(getActivityDescription('project_unarchived')).toBe('Project unarchived');
  });

  it('should return description with metadata for session types', () => {
    expect(getActivityDescription('session_added', { sessionTitle: 'My Chat' })).toBe(
      'Added session: My Chat'
    );
    expect(getActivityDescription('session_removed', { sessionTitle: 'Old Chat' })).toBe(
      'Removed session: Old Chat'
    );
  });

  it('should return description with metadata for knowledge types', () => {
    expect(getActivityDescription('knowledge_added', { fileName: 'doc.pdf' })).toBe(
      'Added file: doc.pdf'
    );
    expect(getActivityDescription('knowledge_removed', { fileName: 'old.txt' })).toBe(
      'Removed file: old.txt'
    );
  });

  it('should return description with metadata for tags', () => {
    expect(getActivityDescription('tags_updated', { tags: ['a', 'b'] })).toBe('Tags: a, b');
  });

  it('should return fallback description when no metadata', () => {
    expect(getActivityDescription('session_added')).toBe('Session added');
    expect(getActivityDescription('knowledge_added')).toBe('Knowledge file added');
  });
});
