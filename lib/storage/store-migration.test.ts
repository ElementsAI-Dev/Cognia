/**
 * Store Migration Tests
 */

import {
  createMigrator,
  createMigrationBuilder,
  commonMigrations,
  getStoredVersion,
  needsMigration,
  type MigrationConfig,
} from './store-migration';

describe('Store Migration Utilities', () => {
  describe('createMigrator', () => {
    it('should migrate from version 0 to version 1', () => {
      interface StateV1 {
        newField: string;
      }

      const config: MigrationConfig<StateV1> = {
        version: 1,
        migrations: {
          1: (state: unknown) => {
            const s = state as { oldField?: string };
            return { newField: s.oldField || 'default' };
          },
        },
      };

      const migrate = createMigrator(config);
      const result = migrate({ oldField: 'value' }, 0);

      expect(result.newField).toBe('value');
    });

    it('should apply multiple migrations sequentially', () => {
      interface StateV3 {
        field: string;
        count: number;
        active: boolean;
      }

      const config: MigrationConfig<StateV3> = {
        version: 3,
        migrations: {
          1: (state: unknown) => ({
            ...(state as object),
            count: 0,
          }),
          2: (state: unknown) => ({
            ...(state as object),
            active: true,
          }),
          3: (state: unknown) => {
            const s = state as { name?: string; count: number; active: boolean };
            return {
              field: s.name || 'unnamed',
              count: s.count,
              active: s.active,
            };
          },
        },
      };

      const migrate = createMigrator(config);
      const result = migrate({ name: 'test' }, 0);

      expect(result.field).toBe('test');
      expect(result.count).toBe(0);
      expect(result.active).toBe(true);
    });

    it('should skip migrations for already migrated versions', () => {
      interface State {
        value: number;
      }

      const config: MigrationConfig<State> = {
        version: 3,
        migrations: {
          1: () => ({ value: 1 }),
          2: () => ({ value: 2 }),
          3: () => ({ value: 3 }),
        },
      };

      const migrate = createMigrator(config);
      const result = migrate({ value: 0 }, 2);

      expect(result.value).toBe(3);
    });
  });

  describe('createMigrationBuilder', () => {
    it('should build migration config with fluent API', () => {
      interface State {
        name: string;
        age: number;
      }

      const config = createMigrationBuilder<State>()
        .addMigration(1, (state) => ({
          ...(state as object),
          name: 'default',
        }))
        .addMigration(2, (state) => ({
          ...(state as object),
          age: 0,
        }))
        .build();

      expect(config.version).toBe(2);
      expect(Object.keys(config.migrations)).toHaveLength(2);
    });
  });

  describe('commonMigrations', () => {
    describe('renameField', () => {
      it('should rename a field', () => {
        const state = { oldName: 'value', other: 123 };
        const result = commonMigrations.renameField(state, 'oldName', 'newName') as Record<string, unknown>;

        expect(result.newName).toBe('value');
        expect(result.oldName).toBeUndefined();
        expect(result.other).toBe(123);
      });

      it('should do nothing if field does not exist', () => {
        const state = { other: 123 };
        const result = commonMigrations.renameField(state, 'missing', 'newName') as Record<string, unknown>;

        expect(result.newName).toBeUndefined();
        expect(result.other).toBe(123);
      });
    });

    describe('setDefault', () => {
      it('should set default for missing field', () => {
        const state = { existing: 'value' };
        const result = commonMigrations.setDefault(state, 'missing', 'default') as Record<string, unknown>;

        expect(result.missing).toBe('default');
        expect(result.existing).toBe('value');
      });

      it('should not override existing field', () => {
        const state = { existing: 'value' };
        const result = commonMigrations.setDefault(state, 'existing', 'default');

        expect(result.existing).toBe('value');
      });
    });

    describe('removeField', () => {
      it('should remove a field', () => {
        const state = { toRemove: 'value', keep: 123 };
        const result = commonMigrations.removeField(state, 'toRemove');

        expect(result.toRemove).toBeUndefined();
        expect(result.keep).toBe(123);
      });
    });

    describe('transformArray', () => {
      it('should transform array items', () => {
        const state = { items: [1, 2, 3] };
        const result = commonMigrations.transformArray(
          state,
          'items',
          (n: number) => n * 2
        );

        expect(result.items).toEqual([2, 4, 6]);
      });

      it('should handle non-array fields', () => {
        const state = { items: 'not-an-array' };
        const result = commonMigrations.transformArray(
          state,
          'items',
          (n: number) => n * 2
        );

        expect(result.items).toBe('not-an-array');
      });
    });
  });

  describe('getStoredVersion', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should return null for non-existent store', () => {
      const version = getStoredVersion('non-existent');
      expect(version).toBeNull();
    });

    it('should return version from stored data', () => {
      localStorage.setItem('test-store', JSON.stringify({ version: 5, state: {} }));
      const version = getStoredVersion('test-store');
      expect(version).toBe(5);
    });

    it('should return null for invalid JSON', () => {
      localStorage.setItem('test-store', 'invalid-json');
      const version = getStoredVersion('test-store');
      expect(version).toBeNull();
    });
  });

  describe('needsMigration', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should return false for non-existent store', () => {
      expect(needsMigration('non-existent', 1)).toBe(false);
    });

    it('should return true if stored version is less than current', () => {
      localStorage.setItem('test-store', JSON.stringify({ version: 1, state: {} }));
      expect(needsMigration('test-store', 2)).toBe(true);
    });

    it('should return false if versions match', () => {
      localStorage.setItem('test-store', JSON.stringify({ version: 2, state: {} }));
      expect(needsMigration('test-store', 2)).toBe(false);
    });
  });
});
