/**
 * Types Tests
 */

import type { Key, InputHandler, StatusVariant, BadgeVariant } from './types';

describe('CLI UI Types', () => {
  describe('Key interface', () => {
    it('should have all expected key properties', () => {
      const key: Key = {
        upArrow: false,
        downArrow: false,
        leftArrow: false,
        rightArrow: false,
        pageDown: false,
        pageUp: false,
        return: false,
        escape: false,
        ctrl: false,
        shift: false,
        tab: false,
        backspace: false,
        delete: false,
        meta: false,
      };

      expect(key.upArrow).toBe(false);
      expect(key.return).toBe(false);
      expect(key.escape).toBe(false);
    });
  });

  describe('InputHandler type', () => {
    it('should accept valid input handler', () => {
      const handler: InputHandler = (input: string, key: Key) => {
        expect(typeof input).toBe('string');
        expect(typeof key.return).toBe('boolean');
      };

      handler('a', {
        upArrow: false,
        downArrow: false,
        leftArrow: false,
        rightArrow: false,
        pageDown: false,
        pageUp: false,
        return: true,
        escape: false,
        ctrl: false,
        shift: false,
        tab: false,
        backspace: false,
        delete: false,
        meta: false,
      });
    });
  });

  describe('StatusVariant type', () => {
    it('should include all status variants', () => {
      const variants: StatusVariant[] = ['info', 'success', 'warning', 'error'];
      expect(variants).toHaveLength(4);
    });
  });

  describe('BadgeVariant type', () => {
    it('should include all badge variants including muted', () => {
      const variants: BadgeVariant[] = ['info', 'success', 'warning', 'error', 'muted'];
      expect(variants).toHaveLength(5);
    });
  });
});
