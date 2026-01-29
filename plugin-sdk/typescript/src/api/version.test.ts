/**
 * Version API Tests
 *
 * @description Tests for version management API type definitions.
 */

import type {
  SemanticVersion,
  UpdateInfo,
  VersionHistoryEntry,
  RollbackOptions,
  UpdateOptions,
  VersionConstraint,
  PluginVersionAPI,
} from './version';

describe('Version API Types', () => {
  describe('SemanticVersion', () => {
    it('should create a basic version', () => {
      const version: SemanticVersion = {
        major: 1,
        minor: 2,
        patch: 3,
      };

      expect(version.major).toBe(1);
      expect(version.minor).toBe(2);
      expect(version.patch).toBe(3);
    });

    it('should create a version with prerelease', () => {
      const version: SemanticVersion = {
        major: 2,
        minor: 0,
        patch: 0,
        prerelease: 'alpha.1',
      };

      expect(version.prerelease).toBe('alpha.1');
    });

    it('should create a version with build metadata', () => {
      const version: SemanticVersion = {
        major: 1,
        minor: 5,
        patch: 0,
        build: '20240101.abc123',
      };

      expect(version.build).toBe('20240101.abc123');
    });

    it('should create a full version with all fields', () => {
      const version: SemanticVersion = {
        major: 3,
        minor: 1,
        patch: 4,
        prerelease: 'rc.2',
        build: 'build.159',
      };

      expect(version.major).toBe(3);
      expect(version.prerelease).toBe('rc.2');
      expect(version.build).toBe('build.159');
    });
  });

  describe('UpdateInfo', () => {
    it('should create update info when update is available', () => {
      const info: UpdateInfo = {
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        updateAvailable: true,
        critical: false,
      };

      expect(info.updateAvailable).toBe(true);
      expect(info.critical).toBe(false);
    });

    it('should create update info when no update is available', () => {
      const info: UpdateInfo = {
        currentVersion: '2.0.0',
        latestVersion: '2.0.0',
        updateAvailable: false,
        critical: false,
      };

      expect(info.updateAvailable).toBe(false);
    });

    it('should create critical update info', () => {
      const info: UpdateInfo = {
        currentVersion: '1.0.0',
        latestVersion: '1.0.1',
        updateAvailable: true,
        critical: true,
        releaseNotes: 'Security fix for CVE-2024-0001',
      };

      expect(info.critical).toBe(true);
      expect(info.releaseNotes).toContain('Security');
    });

    it('should create full update info', () => {
      const info: UpdateInfo = {
        currentVersion: '1.5.0',
        latestVersion: '2.0.0',
        updateAvailable: true,
        critical: false,
        releaseNotes: '## New Features\n- Feature A\n- Feature B',
        releaseDate: new Date('2024-01-15'),
        downloadUrl: 'https://registry.example.com/plugin/2.0.0',
        changelogUrl: 'https://github.com/org/plugin/releases/tag/v2.0.0',
        minSdkVersion: '1.0.0',
        breakingChanges: [
          'Removed deprecated API method `oldMethod`',
          'Changed return type of `getData`',
        ],
      };

      expect(info.releaseDate).toEqual(new Date('2024-01-15'));
      expect(info.downloadUrl).toContain('2.0.0');
      expect(info.breakingChanges).toHaveLength(2);
    });
  });

  describe('VersionHistoryEntry', () => {
    it('should create a current version entry', () => {
      const entry: VersionHistoryEntry = {
        version: '2.0.0',
        installedAt: new Date('2024-01-10'),
        autoUpdated: false,
      };

      expect(entry.version).toBe('2.0.0');
      expect(entry.removedAt).toBeUndefined();
      expect(entry.autoUpdated).toBe(false);
    });

    it('should create a historical version entry', () => {
      const entry: VersionHistoryEntry = {
        version: '1.5.0',
        installedAt: new Date('2023-12-01'),
        removedAt: new Date('2024-01-10'),
        autoUpdated: true,
        reason: 'Auto-updated to version 2.0.0',
      };

      expect(entry.removedAt).toBeDefined();
      expect(entry.autoUpdated).toBe(true);
      expect(entry.reason).toContain('Auto-updated');
    });
  });

  describe('RollbackOptions', () => {
    it('should create basic rollback options', () => {
      const opts: RollbackOptions = {
        targetVersion: '1.5.0',
      };

      expect(opts.targetVersion).toBe('1.5.0');
      expect(opts.keepConfig).toBeUndefined();
      expect(opts.keepData).toBeUndefined();
    });

    it('should create rollback options with data preservation', () => {
      const opts: RollbackOptions = {
        targetVersion: '1.4.0',
        keepConfig: true,
        keepData: true,
      };

      expect(opts.keepConfig).toBe(true);
      expect(opts.keepData).toBe(true);
    });

    it('should create rollback options with partial preservation', () => {
      const opts: RollbackOptions = {
        targetVersion: '1.3.0',
        keepConfig: true,
        keepData: false,
      };

      expect(opts.keepConfig).toBe(true);
      expect(opts.keepData).toBe(false);
    });
  });

  describe('UpdateOptions', () => {
    it('should create default update options', () => {
      const opts: UpdateOptions = {};

      expect(opts.silent).toBeUndefined();
      expect(opts.restart).toBeUndefined();
      expect(opts.backup).toBeUndefined();
    });

    it('should create silent update options', () => {
      const opts: UpdateOptions = {
        silent: true,
      };

      expect(opts.silent).toBe(true);
    });

    it('should create full update options', () => {
      const opts: UpdateOptions = {
        silent: false,
        restart: true,
        backup: true,
      };

      expect(opts.silent).toBe(false);
      expect(opts.restart).toBe(true);
      expect(opts.backup).toBe(true);
    });
  });

  describe('VersionConstraint', () => {
    it('should support exact version constraint', () => {
      const constraint: VersionConstraint = '1.0.0';

      expect(constraint).toBe('1.0.0');
    });

    it('should support compatible version constraint', () => {
      const constraint: VersionConstraint = '^1.0.0';

      expect(constraint).toBe('^1.0.0');
    });

    it('should support approximately version constraint', () => {
      const constraint: VersionConstraint = '~1.0.0';

      expect(constraint).toBe('~1.0.0');
    });

    it('should support comparison constraints', () => {
      const constraints: VersionConstraint[] = [
        '>=1.0.0',
        '<=2.0.0',
        '>1.0.0',
        '<2.0.0',
      ];

      expect(constraints).toContain('>=1.0.0');
      expect(constraints).toContain('<=2.0.0');
      expect(constraints).toContain('>1.0.0');
      expect(constraints).toContain('<2.0.0');
    });
  });

  describe('PluginVersionAPI', () => {
    it('should define all required API methods', () => {
      const mockAPI: PluginVersionAPI = {
        getVersion: jest.fn(),
        getSemanticVersion: jest.fn(),
        checkForUpdates: jest.fn(),
        update: jest.fn(),
        rollback: jest.fn(),
        getHistory: jest.fn(),
        satisfies: jest.fn(),
        compare: jest.fn(),
        parse: jest.fn(),
        format: jest.fn(),
        isValid: jest.fn(),
        getAvailableVersions: jest.fn(),
        onUpdateAvailable: jest.fn(),
      };

      expect(mockAPI.getVersion).toBeDefined();
      expect(mockAPI.getSemanticVersion).toBeDefined();
      expect(mockAPI.checkForUpdates).toBeDefined();
      expect(mockAPI.update).toBeDefined();
      expect(mockAPI.rollback).toBeDefined();
      expect(mockAPI.getHistory).toBeDefined();
      expect(mockAPI.satisfies).toBeDefined();
      expect(mockAPI.compare).toBeDefined();
      expect(mockAPI.parse).toBeDefined();
      expect(mockAPI.format).toBeDefined();
      expect(mockAPI.isValid).toBeDefined();
      expect(mockAPI.getAvailableVersions).toBeDefined();
      expect(mockAPI.onUpdateAvailable).toBeDefined();
    });

    it('should get version info', () => {
      const mockAPI: PluginVersionAPI = {
        getVersion: jest.fn().mockReturnValue('1.2.3'),
        getSemanticVersion: jest.fn().mockReturnValue({
          major: 1,
          minor: 2,
          patch: 3,
        }),
        checkForUpdates: jest.fn(),
        update: jest.fn(),
        rollback: jest.fn(),
        getHistory: jest.fn(),
        satisfies: jest.fn(),
        compare: jest.fn(),
        parse: jest.fn(),
        format: jest.fn(),
        isValid: jest.fn(),
        getAvailableVersions: jest.fn(),
        onUpdateAvailable: jest.fn(),
      };

      expect(mockAPI.getVersion()).toBe('1.2.3');

      const semver = mockAPI.getSemanticVersion();
      expect(semver.major).toBe(1);
      expect(semver.minor).toBe(2);
      expect(semver.patch).toBe(3);
    });

    it('should check for updates', async () => {
      const mockAPI: PluginVersionAPI = {
        getVersion: jest.fn(),
        getSemanticVersion: jest.fn(),
        checkForUpdates: jest.fn().mockResolvedValue({
          currentVersion: '1.0.0',
          latestVersion: '2.0.0',
          updateAvailable: true,
          critical: false,
        }),
        update: jest.fn(),
        rollback: jest.fn(),
        getHistory: jest.fn(),
        satisfies: jest.fn(),
        compare: jest.fn(),
        parse: jest.fn(),
        format: jest.fn(),
        isValid: jest.fn(),
        getAvailableVersions: jest.fn(),
        onUpdateAvailable: jest.fn(),
      };

      const updateInfo = await mockAPI.checkForUpdates();

      expect(updateInfo).not.toBeNull();
      expect(updateInfo!.updateAvailable).toBe(true);
      expect(updateInfo!.latestVersion).toBe('2.0.0');
    });

    it('should update and rollback', async () => {
      const mockAPI: PluginVersionAPI = {
        getVersion: jest.fn(),
        getSemanticVersion: jest.fn(),
        checkForUpdates: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
        getHistory: jest.fn(),
        satisfies: jest.fn(),
        compare: jest.fn(),
        parse: jest.fn(),
        format: jest.fn(),
        isValid: jest.fn(),
        getAvailableVersions: jest.fn(),
        onUpdateAvailable: jest.fn(),
      };

      await mockAPI.update({ silent: true, backup: true });
      expect(mockAPI.update).toHaveBeenCalledWith({ silent: true, backup: true });

      await mockAPI.rollback({ targetVersion: '1.0.0', keepConfig: true });
      expect(mockAPI.rollback).toHaveBeenCalledWith({ targetVersion: '1.0.0', keepConfig: true });
    });

    it('should get version history', () => {
      const mockAPI: PluginVersionAPI = {
        getVersion: jest.fn(),
        getSemanticVersion: jest.fn(),
        checkForUpdates: jest.fn(),
        update: jest.fn(),
        rollback: jest.fn(),
        getHistory: jest.fn().mockReturnValue([
          { version: '2.0.0', installedAt: new Date('2024-01-15'), autoUpdated: false },
          { version: '1.5.0', installedAt: new Date('2024-01-01'), removedAt: new Date('2024-01-15'), autoUpdated: true },
          { version: '1.0.0', installedAt: new Date('2023-12-01'), removedAt: new Date('2024-01-01'), autoUpdated: false },
        ]),
        satisfies: jest.fn(),
        compare: jest.fn(),
        parse: jest.fn(),
        format: jest.fn(),
        isValid: jest.fn(),
        getAvailableVersions: jest.fn(),
        onUpdateAvailable: jest.fn(),
      };

      const history = mockAPI.getHistory();

      expect(history).toHaveLength(3);
      expect(history[0].version).toBe('2.0.0');
      expect(history[0].removedAt).toBeUndefined();
    });

    it('should check version constraints', () => {
      const mockAPI: PluginVersionAPI = {
        getVersion: jest.fn(),
        getSemanticVersion: jest.fn(),
        checkForUpdates: jest.fn(),
        update: jest.fn(),
        rollback: jest.fn(),
        getHistory: jest.fn(),
        satisfies: jest.fn().mockImplementation((version, constraint) => {
          if (constraint === '^1.0.0') return version.startsWith('1.');
          if (constraint === '>=2.0.0') return parseInt(version.split('.')[0]) >= 2;
          return version === constraint;
        }),
        compare: jest.fn(),
        parse: jest.fn(),
        format: jest.fn(),
        isValid: jest.fn(),
        getAvailableVersions: jest.fn(),
        onUpdateAvailable: jest.fn(),
      };

      expect(mockAPI.satisfies('1.5.0', '^1.0.0')).toBe(true);
      expect(mockAPI.satisfies('2.0.0', '^1.0.0')).toBe(false);
      expect(mockAPI.satisfies('2.5.0', '>=2.0.0')).toBe(true);
      expect(mockAPI.satisfies('1.0.0', '1.0.0')).toBe(true);
    });

    it('should compare versions', () => {
      const mockAPI: PluginVersionAPI = {
        getVersion: jest.fn(),
        getSemanticVersion: jest.fn(),
        checkForUpdates: jest.fn(),
        update: jest.fn(),
        rollback: jest.fn(),
        getHistory: jest.fn(),
        satisfies: jest.fn(),
        compare: jest.fn().mockImplementation((v1, v2) => {
          const [major1, minor1, patch1] = v1.split('.').map(Number);
          const [major2, minor2, patch2] = v2.split('.').map(Number);
          if (major1 !== major2) return major1 > major2 ? 1 : -1;
          if (minor1 !== minor2) return minor1 > minor2 ? 1 : -1;
          if (patch1 !== patch2) return patch1 > patch2 ? 1 : -1;
          return 0;
        }),
        parse: jest.fn(),
        format: jest.fn(),
        isValid: jest.fn(),
        getAvailableVersions: jest.fn(),
        onUpdateAvailable: jest.fn(),
      };

      expect(mockAPI.compare('1.0.0', '1.0.0')).toBe(0);
      expect(mockAPI.compare('2.0.0', '1.0.0')).toBe(1);
      expect(mockAPI.compare('1.0.0', '2.0.0')).toBe(-1);
      expect(mockAPI.compare('1.5.0', '1.4.0')).toBe(1);
      expect(mockAPI.compare('1.0.1', '1.0.0')).toBe(1);
    });

    it('should parse and format versions', () => {
      const mockAPI: PluginVersionAPI = {
        getVersion: jest.fn(),
        getSemanticVersion: jest.fn(),
        checkForUpdates: jest.fn(),
        update: jest.fn(),
        rollback: jest.fn(),
        getHistory: jest.fn(),
        satisfies: jest.fn(),
        compare: jest.fn(),
        parse: jest.fn().mockImplementation((version) => {
          const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+?))?(?:\+(.+))?$/);
          if (!match) return null;
          return {
            major: parseInt(match[1]),
            minor: parseInt(match[2]),
            patch: parseInt(match[3]),
            prerelease: match[4],
            build: match[5],
          };
        }),
        format: jest.fn().mockImplementation((version) => {
          let result = `${version.major}.${version.minor}.${version.patch}`;
          if (version.prerelease) result += `-${version.prerelease}`;
          if (version.build) result += `+${version.build}`;
          return result;
        }),
        isValid: jest.fn(),
        getAvailableVersions: jest.fn(),
        onUpdateAvailable: jest.fn(),
      };

      const parsed = mockAPI.parse('2.1.0-beta.1+build.123');
      expect(parsed).not.toBeNull();
      expect(parsed!.major).toBe(2);
      expect(parsed!.prerelease).toBe('beta.1');
      expect(parsed!.build).toBe('build.123');

      const formatted = mockAPI.format({
        major: 1,
        minor: 5,
        patch: 0,
        prerelease: 'alpha',
      });
      expect(formatted).toBe('1.5.0-alpha');

      const invalidParsed = mockAPI.parse('invalid');
      expect(invalidParsed).toBeNull();
    });

    it('should validate versions', () => {
      const mockAPI: PluginVersionAPI = {
        getVersion: jest.fn(),
        getSemanticVersion: jest.fn(),
        checkForUpdates: jest.fn(),
        update: jest.fn(),
        rollback: jest.fn(),
        getHistory: jest.fn(),
        satisfies: jest.fn(),
        compare: jest.fn(),
        parse: jest.fn(),
        format: jest.fn(),
        isValid: jest.fn().mockImplementation((version) => {
          return /^\d+\.\d+\.\d+(?:-[\w.]+)?(?:\+[\w.]+)?$/.test(version);
        }),
        getAvailableVersions: jest.fn(),
        onUpdateAvailable: jest.fn(),
      };

      expect(mockAPI.isValid('1.0.0')).toBe(true);
      expect(mockAPI.isValid('2.1.0-beta.1')).toBe(true);
      expect(mockAPI.isValid('1.0.0+build.123')).toBe(true);
      expect(mockAPI.isValid('invalid')).toBe(false);
      expect(mockAPI.isValid('1.0')).toBe(false);
    });

    it('should get available versions', async () => {
      const mockAPI: PluginVersionAPI = {
        getVersion: jest.fn(),
        getSemanticVersion: jest.fn(),
        checkForUpdates: jest.fn(),
        update: jest.fn(),
        rollback: jest.fn(),
        getHistory: jest.fn(),
        satisfies: jest.fn(),
        compare: jest.fn(),
        parse: jest.fn(),
        format: jest.fn(),
        isValid: jest.fn(),
        getAvailableVersions: jest.fn().mockResolvedValue([
          '2.0.0',
          '1.5.0',
          '1.4.0',
          '1.3.0',
          '1.2.0',
          '1.1.0',
          '1.0.0',
        ]),
        onUpdateAvailable: jest.fn(),
      };

      const versions = await mockAPI.getAvailableVersions();

      expect(versions).toContain('2.0.0');
      expect(versions).toContain('1.0.0');
      expect(versions).toHaveLength(7);
    });

    it('should listen for update events', () => {
      const handlers: Array<(info: UpdateInfo) => void> = [];
      const mockAPI: PluginVersionAPI = {
        getVersion: jest.fn(),
        getSemanticVersion: jest.fn(),
        checkForUpdates: jest.fn(),
        update: jest.fn(),
        rollback: jest.fn(),
        getHistory: jest.fn(),
        satisfies: jest.fn(),
        compare: jest.fn(),
        parse: jest.fn(),
        format: jest.fn(),
        isValid: jest.fn(),
        getAvailableVersions: jest.fn(),
        onUpdateAvailable: jest.fn().mockImplementation((handler) => {
          handlers.push(handler);
          return () => {
            const index = handlers.indexOf(handler);
            if (index > -1) handlers.splice(index, 1);
          };
        }),
      };

      const unsubscribe = mockAPI.onUpdateAvailable((info) => {
        expect(info.updateAvailable).toBe(true);
      });

      expect(mockAPI.onUpdateAvailable).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
      expect(handlers).toHaveLength(1);

      unsubscribe();
      expect(handlers).toHaveLength(0);
    });
  });
});
