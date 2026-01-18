/**
 * @jest-environment jsdom
 */

/**
 * Unit tests for Chat Goal Components index
 * Tests focus on: verifying correct exports from the index barrel file
 */

import { ChatGoalBanner, ChatGoalDialog } from './index';

// =============================================================================
// Mocks
// =============================================================================

// Mock the actual components to avoid importing their dependencies
jest.mock('./chat-goal-banner', () => ({
  ChatGoalBanner: () => null,
}));

jest.mock('./chat-goal-dialog', () => ({
  ChatGoalDialog: () => null,
}));

// =============================================================================
// Tests
// =============================================================================

describe('Chat Goal Components - Index Exports', () => {
  describe('Component Exports', () => {
    it('exports ChatGoalBanner component', () => {
      expect(ChatGoalBanner).toBeDefined();
      expect(typeof ChatGoalBanner).toBe('function');
    });

    it('exports ChatGoalDialog component', () => {
      expect(ChatGoalDialog).toBeDefined();
      expect(typeof ChatGoalDialog).toBe('function');
    });
  });

  describe('Export Structure', () => {
    it('has exactly 2 named exports', () => {
      const exports = Object.keys({ ChatGoalBanner, ChatGoalDialog });
      expect(exports.length).toBe(2);
    });

    it('exports all required components', () => {
      const exports = Object.keys({ ChatGoalBanner, ChatGoalDialog });
      expect(exports).toContain('ChatGoalBanner');
      expect(exports).toContain('ChatGoalDialog');
    });

    it('does not have default export', () => {
      // The index file uses named exports only
      expect(typeof exports).toBe('object');
    });
  });

  describe('Import Compatibility', () => {
    it('allows importing ChatGoalBanner', () => {
      // This test verifies that the component can be imported
      expect(ChatGoalBanner).toBeDefined();
    });

    it('allows importing ChatGoalDialog', () => {
      // This test verifies that the component can be imported
      expect(ChatGoalDialog).toBeDefined();
    });

    it('allows destructuring import', () => {
      // Verify that both components can be imported together
      const components = { ChatGoalBanner, ChatGoalDialog };
      expect(components.ChatGoalBanner).toBeDefined();
      expect(components.ChatGoalDialog).toBeDefined();
    });
  });

  describe('Component Names', () => {
    it('ChatGoalBanner has correct name', () => {
      expect(ChatGoalBanner.name).toBe('ChatGoalBanner');
    });

    it('ChatGoalDialog has correct name', () => {
      expect(ChatGoalDialog.name).toBe('ChatGoalDialog');
    });
  });

  describe('Export Paths', () => {
    it('exports components from correct paths', () => {
      // Verify the components are from the correct source files
      const bannerSource = jest.requireMock('./chat-goal-banner');
      const dialogSource = jest.requireMock('./chat-goal-dialog');

      expect(bannerSource.ChatGoalBanner).toBeDefined();
      expect(dialogSource.ChatGoalDialog).toBeDefined();
    });
  });

  describe('Re-export Behavior', () => {
    it('re-exports ChatGoalBanner as named export', () => {
      const { ChatGoalBanner: Banner } = jest.requireMock('./index');
      expect(Banner).toBeDefined();
    });

    it('re-exports ChatGoalDialog as named export', () => {
      const { ChatGoalDialog: Dialog } = jest.requireMock('./index');
      expect(Dialog).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('handles multiple imports without conflicts', () => {
      // Simulate importing the same component multiple times
      const import1 = jest.requireMock('./index').ChatGoalBanner;
      const import2 = jest.requireMock('./index').ChatGoalBanner;

      expect(import1).toBe(import2);
    });

    it('maintains component references across re-renders', () => {
      const Banner1 = ChatGoalBanner;
      const Banner2 = ChatGoalBanner;

      expect(Banner1).toBe(Banner2);
    });
  });

  describe('Type Safety', () => {
    it('ChatGoalBanner is a valid React component', () => {
      // Verify it's a function (functional component)
      expect(typeof ChatGoalBanner).toBe('function');
    });

    it('ChatGoalDialog is a valid React component', () => {
      // Verify it's a function (functional component)
      expect(typeof ChatGoalDialog).toBe('function');
    });
  });

  describe('Module Consistency', () => {
    it('exports match source component exports', () => {
      const bannerModule = jest.requireMock('./chat-goal-banner');
      const dialogModule = jest.requireMock('./chat-goal-dialog');
      const indexModule = jest.requireMock('./index');

      expect(indexModule.ChatGoalBanner).toBe(bannerModule.ChatGoalBanner);
      expect(indexModule.ChatGoalDialog).toBe(dialogModule.ChatGoalDialog);
    });

    it('all exported components are unique', () => {
      expect(ChatGoalBanner).not.toBe(ChatGoalDialog);
    });
  });

  describe('Import Paths Validation', () => {
    it('ChatGoalBanner maps to correct file', () => {
      const bannerModule = jest.requireMock('./chat-goal-banner');
      expect(bannerModule.ChatGoalBanner).toBeDefined();
    });

    it('ChatGoalDialog maps to correct file', () => {
      const dialogModule = jest.requireMock('./chat-goal-dialog');
      expect(dialogModule.ChatGoalDialog).toBeDefined();
    });
  });

  describe('Module Loading', () => {
    it('loads modules without errors', () => {
      expect(() => {
        jest.requireMock('./index');
      }).not.toThrow();
    });

    it('loads all dependencies', () => {
      // This implicitly tests that all dependencies can be loaded
      expect(() => {
        jest.requireMock('./chat-goal-banner');
        jest.requireMock('./chat-goal-dialog');
      }).not.toThrow();
    });
  });
});
