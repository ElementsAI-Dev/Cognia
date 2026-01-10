/**
 * @jest-environment jsdom
 */

import {
  chatTourSteps,
  settingsTourSteps,
  projectsTourSteps,
  designerTourSteps,
  academicTourSteps,
  tourConfigs,
  getTourSteps,
  getTourIdForPath,
} from './tour-configs';

describe('Tour Configurations', () => {
  describe('chatTourSteps', () => {
    it('has correct number of steps', () => {
      expect(chatTourSteps.length).toBe(5);
    });

    it('has required properties for each step', () => {
      chatTourSteps.forEach((step) => {
        expect(step.id).toBeDefined();
        expect(step.title).toBeDefined();
        expect(step.description).toBeDefined();
      });
    });

    it('includes welcome and complete steps', () => {
      const ids = chatTourSteps.map((s) => s.id);
      expect(ids).toContain('chat-welcome');
      expect(ids).toContain('chat-complete');
    });

    it('has valid positions for targeted steps', () => {
      const validPositions = ['top', 'bottom', 'left', 'right', 'center', undefined];
      chatTourSteps.forEach((step) => {
        if (step.position) {
          expect(validPositions).toContain(step.position);
        }
      });
    });
  });

  describe('settingsTourSteps', () => {
    it('has correct number of steps', () => {
      expect(settingsTourSteps.length).toBe(6);
    });

    it('has required properties for each step', () => {
      settingsTourSteps.forEach((step) => {
        expect(step.id).toBeDefined();
        expect(step.title).toBeDefined();
        expect(step.description).toBeDefined();
      });
    });

    it('includes settings-specific steps', () => {
      const ids = settingsTourSteps.map((s) => s.id);
      expect(ids).toContain('settings-welcome');
      expect(ids).toContain('settings-providers');
      expect(ids).toContain('settings-appearance');
      expect(ids).toContain('settings-mcp');
    });

    it('has target selectors for interactive steps', () => {
      const interactiveSteps = settingsTourSteps.filter((s) => s.id !== 'settings-welcome');
      interactiveSteps.forEach((step) => {
        expect(step.targetSelector).toBeDefined();
        expect(step.targetSelector).toMatch(/^\[data-tour=/);
      });
    });
  });

  describe('projectsTourSteps', () => {
    it('has correct number of steps', () => {
      expect(projectsTourSteps.length).toBe(4);
    });

    it('has required properties for each step', () => {
      projectsTourSteps.forEach((step) => {
        expect(step.id).toBeDefined();
        expect(step.title).toBeDefined();
        expect(step.description).toBeDefined();
      });
    });

    it('includes projects-specific steps', () => {
      const ids = projectsTourSteps.map((s) => s.id);
      expect(ids).toContain('projects-welcome');
      expect(ids).toContain('projects-create');
      expect(ids).toContain('projects-knowledge');
    });
  });

  describe('designerTourSteps', () => {
    it('has correct number of steps', () => {
      expect(designerTourSteps.length).toBe(4);
    });

    it('has required properties for each step', () => {
      designerTourSteps.forEach((step) => {
        expect(step.id).toBeDefined();
        expect(step.title).toBeDefined();
        expect(step.description).toBeDefined();
      });
    });

    it('includes designer-specific steps', () => {
      const ids = designerTourSteps.map((s) => s.id);
      expect(ids).toContain('designer-welcome');
      expect(ids).toContain('designer-templates');
      expect(ids).toContain('designer-canvas');
      expect(ids).toContain('designer-preview');
    });
  });

  describe('academicTourSteps', () => {
    it('has correct number of steps', () => {
      expect(academicTourSteps.length).toBe(4);
    });

    it('has required properties for each step', () => {
      academicTourSteps.forEach((step) => {
        expect(step.id).toBeDefined();
        expect(step.title).toBeDefined();
        expect(step.description).toBeDefined();
      });
    });

    it('includes academic-specific steps', () => {
      const ids = academicTourSteps.map((s) => s.id);
      expect(ids).toContain('academic-welcome');
      expect(ids).toContain('academic-research');
      expect(ids).toContain('academic-knowledge');
      expect(ids).toContain('academic-writing');
    });
  });

  describe('tourConfigs', () => {
    it('contains all tour configurations', () => {
      expect(tourConfigs['feature-tour']).toBeDefined();
      expect(tourConfigs['settings-tour']).toBeDefined();
      expect(tourConfigs['projects-tour']).toBeDefined();
      expect(tourConfigs['designer-tour']).toBeDefined();
      expect(tourConfigs['academic-tour']).toBeDefined();
    });

    it('maps to correct tour steps', () => {
      expect(tourConfigs['feature-tour']).toBe(chatTourSteps);
      expect(tourConfigs['settings-tour']).toBe(settingsTourSteps);
      expect(tourConfigs['projects-tour']).toBe(projectsTourSteps);
      expect(tourConfigs['designer-tour']).toBe(designerTourSteps);
      expect(tourConfigs['academic-tour']).toBe(academicTourSteps);
    });
  });

  describe('getTourSteps', () => {
    it('returns correct steps for feature-tour', () => {
      expect(getTourSteps('feature-tour')).toBe(chatTourSteps);
    });

    it('returns correct steps for settings-tour', () => {
      expect(getTourSteps('settings-tour')).toBe(settingsTourSteps);
    });

    it('returns correct steps for projects-tour', () => {
      expect(getTourSteps('projects-tour')).toBe(projectsTourSteps);
    });

    it('returns correct steps for designer-tour', () => {
      expect(getTourSteps('designer-tour')).toBe(designerTourSteps);
    });

    it('returns correct steps for academic-tour', () => {
      expect(getTourSteps('academic-tour')).toBe(academicTourSteps);
    });
  });

  describe('getTourIdForPath', () => {
    it('returns feature-tour for root path', () => {
      expect(getTourIdForPath('/')).toBe('feature-tour');
    });

    it('returns feature-tour for chat paths', () => {
      expect(getTourIdForPath('/chat')).toBe('feature-tour');
      expect(getTourIdForPath('/chat/123')).toBe('feature-tour');
    });

    it('returns settings-tour for settings paths', () => {
      expect(getTourIdForPath('/settings')).toBe('settings-tour');
      expect(getTourIdForPath('/settings/providers')).toBe('settings-tour');
    });

    it('returns projects-tour for projects paths', () => {
      expect(getTourIdForPath('/projects')).toBe('projects-tour');
      expect(getTourIdForPath('/projects/123')).toBe('projects-tour');
    });

    it('returns designer-tour for designer paths', () => {
      expect(getTourIdForPath('/designer')).toBe('designer-tour');
      expect(getTourIdForPath('/designer/edit')).toBe('designer-tour');
    });

    it('returns academic-tour for academic paths', () => {
      expect(getTourIdForPath('/academic')).toBe('academic-tour');
      expect(getTourIdForPath('/academic/research')).toBe('academic-tour');
    });

    it('returns null for unknown paths', () => {
      expect(getTourIdForPath('/unknown')).toBeNull();
      expect(getTourIdForPath('/some/random/path')).toBeNull();
    });
  });
});
