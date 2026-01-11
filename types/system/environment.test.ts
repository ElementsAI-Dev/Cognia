/**
 * Tests for Environment Type Utilities
 */

import {
  parseRequirements,
  parsePackageSpec,
  generateRequirements,
  comparePackages,
  filterEnvironments,
  createDefaultHealthCheck,
  createDefaultProjectEnvConfig,
  createDefaultToolStatus,
  createDefaultEnvironmentStatus,
  ENV_PRESETS,
  TOOL_INFO,
  INSTALL_COMMANDS,
} from './environment';
import type { VirtualEnvInfo, PackageInfo, EnvironmentTool } from './environment';

describe('Environment Type Utilities', () => {
  describe('parseRequirements', () => {
    it('should parse simple package names', () => {
      const content = `numpy
pandas
scikit-learn`;
      const result = parseRequirements(content);
      
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('numpy');
      expect(result[1].name).toBe('pandas');
      expect(result[2].name).toBe('scikit-learn');
    });

    it('should parse packages with version specifiers', () => {
      const content = `numpy==1.24.0
pandas>=2.0.0
requests<3.0.0
flask~=2.3.0`;
      const result = parseRequirements(content);
      
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ name: 'numpy', version: '==1.24.0', extras: undefined, markers: undefined, comment: undefined });
      expect(result[1]).toEqual({ name: 'pandas', version: '>=2.0.0', extras: undefined, markers: undefined, comment: undefined });
      expect(result[2]).toEqual({ name: 'requests', version: '<3.0.0', extras: undefined, markers: undefined, comment: undefined });
      expect(result[3]).toEqual({ name: 'flask', version: '~=2.3.0', extras: undefined, markers: undefined, comment: undefined });
    });

    it('should skip comments and empty lines', () => {
      const content = `# This is a comment
numpy

# Another comment
pandas`;
      const result = parseRequirements(content);
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('numpy');
      expect(result[1].name).toBe('pandas');
    });

    it('should handle editable installs', () => {
      const content = `-e git+https://github.com/user/repo.git#egg=mypackage
--editable ./local-package`;
      const result = parseRequirements(content);
      
      expect(result).toHaveLength(2);
      expect(result[0].isEditable).toBe(true);
      expect(result[1].isEditable).toBe(true);
    });

    it('should skip pip options', () => {
      const content = `--index-url https://pypi.org/simple
-r requirements-base.txt
numpy
--extra-index-url https://pypi.org/simple
pandas`;
      const result = parseRequirements(content);
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('numpy');
      expect(result[1].name).toBe('pandas');
    });

    it('should handle packages with extras', () => {
      const content = `requests[security]
uvicorn[standard]>=0.20.0`;
      const result = parseRequirements(content);
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('requests');
      expect(result[0].extras).toEqual(['security']);
      expect(result[1].name).toBe('uvicorn');
      expect(result[1].extras).toEqual(['standard']);
    });

    it('should handle environment markers', () => {
      const content = `pywin32; sys_platform == "win32"
numpy>=1.24.0; python_version >= "3.8"`;
      const result = parseRequirements(content);
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('pywin32');
      expect(result[0].markers).toBe('sys_platform == "win32"');
      expect(result[1].markers).toBe('python_version >= "3.8"');
    });

    it('should handle inline comments', () => {
      const content = `numpy==1.24.0 # For numerical computing`;
      const result = parseRequirements(content);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('numpy');
      expect(result[0].comment).toBe('For numerical computing');
    });
  });

  describe('parsePackageSpec', () => {
    it('should parse simple package name', () => {
      const result = parsePackageSpec('numpy');
      expect(result).toEqual({ name: 'numpy', version: undefined, extras: undefined, markers: undefined, comment: undefined });
    });

    it('should normalize package names', () => {
      const result = parsePackageSpec('My_Package');
      expect(result?.name).toBe('my-package');
    });

    it('should return null for empty input', () => {
      const result = parsePackageSpec('');
      expect(result).toBeNull();
    });
  });

  describe('generateRequirements', () => {
    const packages: PackageInfo[] = [
      { name: 'numpy', version: '1.24.0', latest: null, description: null, location: null },
      { name: 'pandas', version: '2.0.0', latest: null, description: null, location: null },
      { name: 'requests', version: '2.28.0', latest: null, description: null, location: null },
    ];

    it('should generate requirements with pinned versions', () => {
      const result = generateRequirements(packages, { pinVersions: true, includeComments: false });
      
      expect(result).toContain('numpy==1.24.0');
      expect(result).toContain('pandas==2.0.0');
      expect(result).toContain('requests==2.28.0');
    });

    it('should generate requirements without versions when not pinned', () => {
      const result = generateRequirements(packages, { pinVersions: false, includeComments: false });
      
      expect(result).toBe('numpy\npandas\nrequests');
    });

    it('should include header comment when specified', () => {
      const result = generateRequirements(packages, { pinVersions: true, includeComments: true });
      
      expect(result).toContain('# Generated by Cognia');
    });

    it('should handle empty package list', () => {
      const result = generateRequirements([], { includeComments: false });
      expect(result).toBe('');
    });
  });

  describe('comparePackages', () => {
    it('should identify added packages', () => {
      const first: PackageInfo[] = [
        { name: 'numpy', version: '1.24.0', latest: null, description: null, location: null },
      ];
      const second: PackageInfo[] = [
        { name: 'numpy', version: '1.24.0', latest: null, description: null, location: null },
        { name: 'pandas', version: '2.0.0', latest: null, description: null, location: null },
      ];
      
      const result = comparePackages(first, second);
      const added = result.find(d => d.name === 'pandas');
      
      expect(added?.status).toBe('added');
      expect(added?.inSecond).toBe(true);
      expect(added?.inFirst).toBe(false);
    });

    it('should identify removed packages', () => {
      const first: PackageInfo[] = [
        { name: 'numpy', version: '1.24.0', latest: null, description: null, location: null },
        { name: 'pandas', version: '2.0.0', latest: null, description: null, location: null },
      ];
      const second: PackageInfo[] = [
        { name: 'numpy', version: '1.24.0', latest: null, description: null, location: null },
      ];
      
      const result = comparePackages(first, second);
      const removed = result.find(d => d.name === 'pandas');
      
      expect(removed?.status).toBe('removed');
      expect(removed?.inFirst).toBe(true);
      expect(removed?.inSecond).toBe(false);
    });

    it('should identify changed packages', () => {
      const first: PackageInfo[] = [
        { name: 'numpy', version: '1.24.0', latest: null, description: null, location: null },
      ];
      const second: PackageInfo[] = [
        { name: 'numpy', version: '1.25.0', latest: null, description: null, location: null },
      ];
      
      const result = comparePackages(first, second);
      
      expect(result[0].status).toBe('changed');
      expect(result[0].versionFirst).toBe('1.24.0');
      expect(result[0].versionSecond).toBe('1.25.0');
    });

    it('should identify same packages', () => {
      const first: PackageInfo[] = [
        { name: 'numpy', version: '1.24.0', latest: null, description: null, location: null },
      ];
      const second: PackageInfo[] = [
        { name: 'numpy', version: '1.24.0', latest: null, description: null, location: null },
      ];
      
      const result = comparePackages(first, second);
      
      expect(result[0].status).toBe('same');
    });

    it('should sort results by status', () => {
      const first: PackageInfo[] = [
        { name: 'a', version: '1.0.0', latest: null, description: null, location: null },
        { name: 'b', version: '1.0.0', latest: null, description: null, location: null },
      ];
      const second: PackageInfo[] = [
        { name: 'a', version: '1.0.0', latest: null, description: null, location: null },
        { name: 'c', version: '1.0.0', latest: null, description: null, location: null },
      ];
      
      const result = comparePackages(first, second);
      
      // Order should be: removed, added, same
      expect(result[0].status).toBe('removed'); // b
      expect(result[1].status).toBe('added'); // c
      expect(result[2].status).toBe('same'); // a
    });
  });

  describe('filterEnvironments', () => {
    const mockEnvs: VirtualEnvInfo[] = [
      {
        id: '1',
        name: 'data-science',
        type: 'uv',
        path: '/envs/data-science',
        pythonVersion: '3.11.0',
        pythonPath: '/envs/data-science/bin/python',
        status: 'active',
        packages: 50,
        size: '200 MB',
        createdAt: '2024-01-01T00:00:00Z',
        lastUsedAt: '2024-06-01T00:00:00Z',
        isDefault: false,
        projectPath: '/projects/ml',
      },
      {
        id: '2',
        name: 'web-dev',
        type: 'venv',
        path: '/envs/web-dev',
        pythonVersion: '3.10.0',
        pythonPath: '/envs/web-dev/bin/python',
        status: 'inactive',
        packages: 30,
        size: '100 MB',
        createdAt: '2024-02-01T00:00:00Z',
        lastUsedAt: null,
        isDefault: false,
        projectPath: null,
      },
      {
        id: '3',
        name: 'conda-env',
        type: 'conda',
        path: '/envs/conda-env',
        pythonVersion: '3.9.0',
        pythonPath: '/envs/conda-env/bin/python',
        status: 'inactive',
        packages: 100,
        size: '500 MB',
        createdAt: '2024-03-01T00:00:00Z',
        lastUsedAt: '2024-05-01T00:00:00Z',
        isDefault: false,
        projectPath: '/projects/legacy',
      },
    ];

    it('should filter by search term in name', () => {
      const result = filterEnvironments(mockEnvs, { search: 'data' });
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('data-science');
    });

    it('should filter by search term in path', () => {
      const result = filterEnvironments(mockEnvs, { search: 'web-dev' });
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('web-dev');
    });

    it('should filter by type', () => {
      const result = filterEnvironments(mockEnvs, { types: ['uv', 'venv'] });
      
      expect(result).toHaveLength(2);
      expect(result.map(e => e.type)).toContain('uv');
      expect(result.map(e => e.type)).toContain('venv');
    });

    it('should filter by status', () => {
      const result = filterEnvironments(mockEnvs, { status: ['active'] });
      
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('active');
    });

    it('should filter by Python version', () => {
      const result = filterEnvironments(mockEnvs, { pythonVersions: ['3.11'] });
      
      expect(result).toHaveLength(1);
      expect(result[0].pythonVersion).toBe('3.11.0');
    });

    it('should filter by project association', () => {
      const withProject = filterEnvironments(mockEnvs, { hasProject: true });
      const withoutProject = filterEnvironments(mockEnvs, { hasProject: false });
      
      expect(withProject).toHaveLength(2);
      expect(withoutProject).toHaveLength(1);
    });

    it('should sort by name', () => {
      const result = filterEnvironments(mockEnvs, { sortBy: 'name', sortOrder: 'asc' });
      
      expect(result[0].name).toBe('conda-env');
      expect(result[1].name).toBe('data-science');
      expect(result[2].name).toBe('web-dev');
    });

    it('should sort by createdAt descending', () => {
      const result = filterEnvironments(mockEnvs, { sortBy: 'createdAt', sortOrder: 'desc' });
      
      expect(result[0].name).toBe('conda-env');
      expect(result[1].name).toBe('web-dev');
      expect(result[2].name).toBe('data-science');
    });

    it('should sort by packages', () => {
      const result = filterEnvironments(mockEnvs, { sortBy: 'packages', sortOrder: 'desc' });
      
      expect(result[0].packages).toBe(100);
      expect(result[1].packages).toBe(50);
      expect(result[2].packages).toBe(30);
    });

    it('should sort by size', () => {
      const result = filterEnvironments(mockEnvs, { sortBy: 'size', sortOrder: 'desc' });
      
      expect(result[0].size).toBe('500 MB');
      expect(result[1].size).toBe('200 MB');
      expect(result[2].size).toBe('100 MB');
    });

    it('should combine multiple filters', () => {
      const result = filterEnvironments(mockEnvs, {
        types: ['uv', 'venv'],
        hasProject: true,
        sortBy: 'name',
      });
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('data-science');
    });

    it('should return all when no filters', () => {
      const result = filterEnvironments(mockEnvs, {});
      expect(result).toHaveLength(3);
    });
  });

  describe('createDefaultHealthCheck', () => {
    it('should create health check with default values', () => {
      const result = createDefaultHealthCheck();
      
      expect(result.status).toBe('unknown');
      expect(result.pythonValid).toBe(false);
      expect(result.pipValid).toBe(false);
      expect(result.packagesValid).toBe(false);
      expect(result.issues).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.checkedAt).toBeDefined();
    });
  });

  describe('createDefaultProjectEnvConfig', () => {
    it('should create project config with correct values', () => {
      const result = createDefaultProjectEnvConfig('/path/to/project', 'My Project');
      
      expect(result.projectPath).toBe('/path/to/project');
      expect(result.projectName).toBe('My Project');
      expect(result.autoActivate).toBe(true);
      expect(result.pythonVersion).toBeNull();
      expect(result.virtualEnvId).toBeNull();
      expect(result.id).toMatch(/^proj-/);
    });
  });

  describe('ENV_PRESETS', () => {
    it('should contain all expected presets', () => {
      const presetIds = ENV_PRESETS.map(p => p.id);
      
      expect(presetIds).toContain('python-basic');
      expect(presetIds).toContain('data-science');
      expect(presetIds).toContain('deep-learning');
      expect(presetIds).toContain('automation');
      expect(presetIds).toContain('api-dev');
      expect(presetIds).toContain('testing');
    });

    it('should have valid structure for each preset', () => {
      for (const preset of ENV_PRESETS) {
        expect(preset.id).toBeDefined();
        expect(preset.name).toBeDefined();
        expect(preset.description).toBeDefined();
        expect(preset.icon).toBeDefined();
        expect(preset.type).toBeDefined();
      }
    });

    it('should have deep-learning preset with ML packages', () => {
      const deepLearning = ENV_PRESETS.find(p => p.id === 'deep-learning');
      
      expect(deepLearning).toBeDefined();
      expect(deepLearning?.packages?.python).toContain('torch');
      expect(deepLearning?.packages?.python).toContain('transformers');
    });

    it('should have automation preset with scraping packages', () => {
      const automation = ENV_PRESETS.find(p => p.id === 'automation');
      
      expect(automation).toBeDefined();
      expect(automation?.packages?.python).toContain('selenium');
      expect(automation?.packages?.python).toContain('playwright');
    });
  });

  describe('TOOL_INFO', () => {
    it('should contain all environment tools including FFmpeg', () => {
      const tools: EnvironmentTool[] = ['uv', 'nvm', 'docker', 'podman', 'ffmpeg'];
      
      for (const tool of tools) {
        expect(TOOL_INFO[tool]).toBeDefined();
        expect(TOOL_INFO[tool].id).toBe(tool);
        expect(TOOL_INFO[tool].name).toBeDefined();
        expect(TOOL_INFO[tool].description).toBeDefined();
        expect(TOOL_INFO[tool].icon).toBeDefined();
        expect(TOOL_INFO[tool].category).toBeDefined();
        expect(TOOL_INFO[tool].website).toBeDefined();
        expect(TOOL_INFO[tool].docsUrl).toBeDefined();
      }
    });

    it('should have correct FFmpeg info', () => {
      expect(TOOL_INFO.ffmpeg.id).toBe('ffmpeg');
      expect(TOOL_INFO.ffmpeg.name).toBe('FFmpeg');
      expect(TOOL_INFO.ffmpeg.category).toBe('media_tool');
      expect(TOOL_INFO.ffmpeg.website).toBe('https://ffmpeg.org/');
      expect(TOOL_INFO.ffmpeg.icon).toBe('🎬');
    });

    it('should categorize tools correctly', () => {
      expect(TOOL_INFO.uv.category).toBe('language_manager');
      expect(TOOL_INFO.nvm.category).toBe('language_manager');
      expect(TOOL_INFO.docker.category).toBe('container_runtime');
      expect(TOOL_INFO.podman.category).toBe('container_runtime');
      expect(TOOL_INFO.ffmpeg.category).toBe('media_tool');
    });
  });

  describe('INSTALL_COMMANDS', () => {
    it('should have install commands for all tools including FFmpeg', () => {
      const tools: EnvironmentTool[] = ['uv', 'nvm', 'docker', 'podman', 'ffmpeg'];
      
      for (const tool of tools) {
        expect(INSTALL_COMMANDS[tool]).toBeDefined();
        expect(INSTALL_COMMANDS[tool].windows).toBeDefined();
        expect(INSTALL_COMMANDS[tool].macos).toBeDefined();
        expect(INSTALL_COMMANDS[tool].linux).toBeDefined();
      }
    });

    it('should have correct FFmpeg check command', () => {
      expect(INSTALL_COMMANDS.ffmpeg.windows.check).toBe('ffmpeg -version');
      expect(INSTALL_COMMANDS.ffmpeg.macos.check).toBe('ffmpeg -version');
      expect(INSTALL_COMMANDS.ffmpeg.linux.check).toBe('ffmpeg -version');
    });

    it('should have FFmpeg install commands for all platforms', () => {
      expect(INSTALL_COMMANDS.ffmpeg.windows.install.length).toBeGreaterThan(0);
      expect(INSTALL_COMMANDS.ffmpeg.macos.install.length).toBeGreaterThan(0);
      expect(INSTALL_COMMANDS.ffmpeg.linux.install.length).toBeGreaterThan(0);
    });

    it('should use winget for Windows FFmpeg installation', () => {
      expect(INSTALL_COMMANDS.ffmpeg.windows.install[0]).toContain('winget');
      expect(INSTALL_COMMANDS.ffmpeg.windows.install[0]).toContain('FFmpeg');
    });

    it('should use brew for macOS FFmpeg installation', () => {
      expect(INSTALL_COMMANDS.ffmpeg.macos.install[0]).toContain('brew');
      expect(INSTALL_COMMANDS.ffmpeg.macos.install[0]).toContain('ffmpeg');
    });

    it('should use apt-get for Linux FFmpeg installation', () => {
      expect(INSTALL_COMMANDS.ffmpeg.linux.install[0]).toContain('apt-get');
      expect(INSTALL_COMMANDS.ffmpeg.linux.install[0]).toContain('ffmpeg');
    });
  });

  describe('createDefaultToolStatus', () => {
    it('should create default status for FFmpeg', () => {
      const status = createDefaultToolStatus('ffmpeg');
      
      expect(status.tool).toBe('ffmpeg');
      expect(status.installed).toBe(false);
      expect(status.version).toBeNull();
      expect(status.path).toBeNull();
      expect(status.status).toBe('checking');
      expect(status.error).toBeNull();
    });

    it('should create default status for all tools', () => {
      const tools: EnvironmentTool[] = ['uv', 'nvm', 'docker', 'podman', 'ffmpeg'];
      
      for (const tool of tools) {
        const status = createDefaultToolStatus(tool);
        expect(status.tool).toBe(tool);
        expect(status.installed).toBe(false);
        expect(status.status).toBe('checking');
      }
    });
  });

  describe('createDefaultEnvironmentStatus', () => {
    it('should include FFmpeg in default environment status', () => {
      const status = createDefaultEnvironmentStatus();
      
      expect(status.tools.ffmpeg).toBeDefined();
      expect(status.tools.ffmpeg.tool).toBe('ffmpeg');
      expect(status.tools.ffmpeg.installed).toBe(false);
    });

    it('should include all tools in default status', () => {
      const status = createDefaultEnvironmentStatus();
      
      expect(status.tools.uv).toBeDefined();
      expect(status.tools.nvm).toBeDefined();
      expect(status.tools.docker).toBeDefined();
      expect(status.tools.podman).toBeDefined();
      expect(status.tools.ffmpeg).toBeDefined();
    });

    it('should have platform as unknown initially', () => {
      const status = createDefaultEnvironmentStatus();
      expect(status.platform).toBe('unknown');
    });
  });
});
