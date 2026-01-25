/**
 * Environment Configuration Types
 *
 * Type definitions for development environment tools management:
 * - uv (Python package manager)
 * - nvm (Node.js version manager)
 * - Docker (container runtime)
 * - Podman (container runtime)
 */

/** Supported environment tools */
export type EnvironmentTool = 'uv' | 'nvm' | 'docker' | 'podman' | 'ffmpeg';

/** Installation status for a tool */
export type InstallationStatus =
  | 'not_installed'
  | 'installed'
  | 'installing'
  | 'error'
  | 'checking';

// Platform is defined in git.ts
import type { Platform } from './git';
export type { Platform };

/** Tool information */
export interface ToolInfo {
  id: EnvironmentTool;
  name: string;
  description: string;
  icon: string;
  category: 'language_manager' | 'container_runtime' | 'media_tool';
  website: string;
  docsUrl: string;
}

/** Tool status */
export interface ToolStatus {
  tool: EnvironmentTool;
  installed: boolean;
  version: string | null;
  path: string | null;
  status: InstallationStatus;
  error: string | null;
  lastChecked: string | null;
}

/** Installation progress */
export interface InstallProgress {
  tool: EnvironmentTool;
  stage: 'downloading' | 'installing' | 'configuring' | 'verifying' | 'done' | 'error';
  progress: number; // 0-100
  message: string;
  error: string | null;
}

/** Installation options */
export interface InstallOptions {
  tool: EnvironmentTool;
  /** Install globally (default true) */
  global?: boolean;
  /** Add to PATH (default true) */
  addToPath?: boolean;
  /** Custom install directory */
  installDir?: string;
}

/** Environment status summary */
export interface EnvironmentStatus {
  platform: Platform;
  tools: Record<EnvironmentTool, ToolStatus>;
  lastRefreshed: string | null;
}

/** Managed runtime versions */
export interface ManagedVersion {
  version: string;
  installed: boolean;
  active: boolean;
  path: string | null;
}

/** Python environment info (managed by uv) */
export interface PythonEnvironment {
  versions: ManagedVersion[];
  activeVersion: string | null;
  uvVersion: string | null;
}

/** Node.js environment info (managed by nvm) */
export interface NodeEnvironment {
  versions: ManagedVersion[];
  activeVersion: string | null;
  nvmVersion: string | null;
}

/** Container runtime info */
export interface ContainerRuntimeInfo {
  running: boolean;
  version: string | null;
  apiVersion: string | null;
  containers: number;
  images: number;
}

/** Tool metadata with installation commands */
export const TOOL_INFO: Record<EnvironmentTool, ToolInfo> = {
  uv: {
    id: 'uv',
    name: 'uv',
    description: 'An extremely fast Python package and project manager, written in Rust',
    icon: '🐍',
    category: 'language_manager',
    website: 'https://github.com/astral-sh/uv',
    docsUrl: 'https://docs.astral.sh/uv/',
  },
  nvm: {
    id: 'nvm',
    name: 'nvm',
    description: 'Node Version Manager - manage multiple Node.js versions',
    icon: '🟢',
    category: 'language_manager',
    website: 'https://github.com/nvm-sh/nvm',
    docsUrl: 'https://github.com/nvm-sh/nvm#readme',
  },
  docker: {
    id: 'docker',
    name: 'Docker',
    description: 'Container platform for building, sharing, and running applications',
    icon: '🐳',
    category: 'container_runtime',
    website: 'https://www.docker.com/',
    docsUrl: 'https://docs.docker.com/',
  },
  podman: {
    id: 'podman',
    name: 'Podman',
    description: 'Daemonless container engine for developing, managing, and running OCI containers',
    icon: '🦭',
    category: 'container_runtime',
    website: 'https://podman.io/',
    docsUrl: 'https://docs.podman.io/',
  },
  ffmpeg: {
    id: 'ffmpeg',
    name: 'FFmpeg',
    description:
      'Complete, cross-platform solution for recording, converting, and streaming audio and video',
    icon: '🎬',
    category: 'media_tool',
    website: 'https://ffmpeg.org/',
    docsUrl: 'https://ffmpeg.org/documentation.html',
  },
};

/** Installation commands per platform */
export interface InstallCommands {
  windows: {
    check: string;
    install: string[];
    postInstall?: string[];
  };
  macos: {
    check: string;
    install: string[];
    postInstall?: string[];
  };
  linux: {
    check: string;
    install: string[];
    postInstall?: string[];
  };
}

/** Platform-specific installation commands for each tool */
export const INSTALL_COMMANDS: Record<EnvironmentTool, InstallCommands> = {
  uv: {
    windows: {
      check: 'uv --version',
      install: [
        'powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"',
      ],
    },
    macos: {
      check: 'uv --version',
      install: ['curl -LsSf https://astral.sh/uv/install.sh | sh'],
      postInstall: ['source $HOME/.cargo/env'],
    },
    linux: {
      check: 'uv --version',
      install: ['curl -LsSf https://astral.sh/uv/install.sh | sh'],
      postInstall: ['source $HOME/.cargo/env'],
    },
  },
  nvm: {
    windows: {
      check: 'nvm version',
      install: [
        // nvm-windows needs to be installed via installer or winget
        'winget install --id CoreyButler.NVMforWindows -e --accept-source-agreements --accept-package-agreements',
      ],
    },
    macos: {
      check: 'command -v nvm',
      install: ['curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash'],
      postInstall: [
        'export NVM_DIR="$HOME/.nvm"',
        '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"',
      ],
    },
    linux: {
      check: 'command -v nvm',
      install: ['curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash'],
      postInstall: [
        'export NVM_DIR="$HOME/.nvm"',
        '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"',
      ],
    },
  },
  docker: {
    windows: {
      check: 'docker --version',
      install: [
        // Docker Desktop for Windows - download and run installer
        'winget install --id Docker.DockerDesktop -e --accept-source-agreements --accept-package-agreements',
      ],
      postInstall: [
        // May need restart
      ],
    },
    macos: {
      check: 'docker --version',
      install: ['brew install --cask docker'],
      postInstall: ['open -a Docker'],
    },
    linux: {
      check: 'docker --version',
      install: ['curl -fsSL https://get.docker.com | sh', 'sudo usermod -aG docker $USER'],
      postInstall: ['sudo systemctl enable docker', 'sudo systemctl start docker'],
    },
  },
  podman: {
    windows: {
      check: 'podman --version',
      install: [
        'winget install --id RedHat.Podman -e --accept-source-agreements --accept-package-agreements',
      ],
    },
    macos: {
      check: 'podman --version',
      install: ['brew install podman'],
      postInstall: ['podman machine init', 'podman machine start'],
    },
    linux: {
      check: 'podman --version',
      install: [
        // For Ubuntu/Debian
        'sudo apt-get update && sudo apt-get install -y podman',
      ],
    },
  },
  ffmpeg: {
    windows: {
      check: 'ffmpeg -version',
      install: [
        'winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements',
      ],
    },
    macos: {
      check: 'ffmpeg -version',
      install: ['brew install ffmpeg'],
    },
    linux: {
      check: 'ffmpeg -version',
      install: ['sudo apt-get update && sudo apt-get install -y ffmpeg'],
    },
  },
};

/** Default tool status */
export function createDefaultToolStatus(tool: EnvironmentTool): ToolStatus {
  return {
    tool,
    installed: false,
    version: null,
    path: null,
    status: 'checking',
    error: null,
    lastChecked: null,
  };
}

/** Default environment status */
export function createDefaultEnvironmentStatus(): EnvironmentStatus {
  return {
    platform: 'unknown',
    tools: {
      uv: createDefaultToolStatus('uv'),
      nvm: createDefaultToolStatus('nvm'),
      docker: createDefaultToolStatus('docker'),
      podman: createDefaultToolStatus('podman'),
      ffmpeg: createDefaultToolStatus('ffmpeg'),
    },
    lastRefreshed: null,
  };
}

// ==================== Virtual Environment Types ====================

/** Virtual environment type */
export type VirtualEnvType = 'venv' | 'uv' | 'conda';

/** Virtual environment status */
export type VirtualEnvStatus = 'active' | 'inactive' | 'creating' | 'error' | 'unknown';

/** Virtual environment info */
export interface VirtualEnvInfo {
  id: string;
  name: string;
  type: VirtualEnvType;
  path: string;
  pythonVersion: string | null;
  pythonPath: string | null;
  status: VirtualEnvStatus;
  packages: number;
  size: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  isDefault: boolean;
  projectPath: string | null;
}

/** Virtual environment creation options */
export interface CreateVirtualEnvOptions {
  name: string;
  type: VirtualEnvType;
  pythonVersion?: string;
  basePath?: string;
  projectPath?: string;
  packages?: string[];
  systemSitePackages?: boolean;
}

/** Virtual environment creation progress */
export interface VirtualEnvProgress {
  stage: 'preparing' | 'creating' | 'installing' | 'configuring' | 'done' | 'error';
  progress: number;
  message: string;
  error: string | null;
}

/** Package info */
export interface PackageInfo {
  name: string;
  version: string;
  latest: string | null;
  description: string | null;
  location: string | null;
}

/** Package installation options */
export interface InstallPackageOptions {
  envPath: string;
  packages: string[];
  upgrade?: boolean;
  dev?: boolean;
  requirements?: string;
}

// ==================== Project Environment Config Types ====================

/** Project environment configuration */
export interface ProjectEnvConfig {
  id: string;
  projectPath: string;
  projectName: string;
  pythonVersion: string | null;
  nodeVersion: string | null;
  virtualEnvId: string | null;
  virtualEnvPath: string | null;
  autoActivate: boolean;
  envVars: Record<string, string>;
  scripts: Record<string, string>;
  dependencies: ProjectDependencies;
  createdAt: string;
  updatedAt: string;
}

/** Project dependencies */
export interface ProjectDependencies {
  python: string[];
  node: string[];
  system: string[];
}

/** Environment preset template */
export interface EnvPresetTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'python' | 'node' | 'fullstack' | 'data-science' | 'custom';
  pythonVersion?: string;
  nodeVersion?: string;
  packages: {
    python?: string[];
    node?: string[];
  };
  envVars?: Record<string, string>;
  scripts?: Record<string, string>;
}

/** Default environment presets */
export const ENV_PRESETS: EnvPresetTemplate[] = [
  {
    id: 'python-basic',
    name: 'Python Basic',
    description: 'Basic Python development environment',
    icon: '🐍',
    type: 'python',
    pythonVersion: '3.11',
    packages: {
      python: ['pip', 'setuptools', 'wheel'],
    },
  },
  {
    id: 'python-web',
    name: 'Python Web',
    description: 'Python web development with FastAPI/Flask',
    icon: '🌐',
    type: 'python',
    pythonVersion: '3.11',
    packages: {
      python: ['fastapi', 'uvicorn', 'pydantic', 'sqlalchemy', 'alembic'],
    },
  },
  {
    id: 'data-science',
    name: 'Data Science',
    description: 'Python data science and ML environment',
    icon: '📊',
    type: 'data-science',
    pythonVersion: '3.11',
    packages: {
      python: ['numpy', 'pandas', 'scikit-learn', 'matplotlib', 'jupyter', 'seaborn'],
    },
  },
  {
    id: 'deep-learning',
    name: 'Deep Learning',
    description: 'PyTorch/TensorFlow deep learning environment',
    icon: '🧠',
    type: 'data-science',
    pythonVersion: '3.11',
    packages: {
      python: ['torch', 'torchvision', 'transformers', 'datasets', 'accelerate', 'wandb'],
    },
  },
  {
    id: 'automation',
    name: 'Automation',
    description: 'Web scraping and automation tools',
    icon: '🤖',
    type: 'python',
    pythonVersion: '3.11',
    packages: {
      python: ['selenium', 'playwright', 'beautifulsoup4', 'requests', 'httpx', 'lxml'],
    },
  },
  {
    id: 'api-dev',
    name: 'API Development',
    description: 'REST/GraphQL API development',
    icon: '🔌',
    type: 'python',
    pythonVersion: '3.11',
    packages: {
      python: [
        'fastapi',
        'uvicorn',
        'httpx',
        'pydantic',
        'python-jose',
        'passlib',
        'strawberry-graphql',
      ],
    },
  },
  {
    id: 'node-basic',
    name: 'Node.js Basic',
    description: 'Basic Node.js development environment',
    icon: '🟢',
    type: 'node',
    nodeVersion: '20',
    packages: {
      node: ['typescript', 'ts-node', 'nodemon'],
    },
  },
  {
    id: 'fullstack',
    name: 'Fullstack',
    description: 'Python + Node.js fullstack environment',
    icon: '🚀',
    type: 'fullstack',
    pythonVersion: '3.11',
    nodeVersion: '20',
    packages: {
      python: ['fastapi', 'uvicorn', 'pydantic'],
      node: ['typescript', 'vite'],
    },
  },
  {
    id: 'testing',
    name: 'Testing',
    description: 'Python testing and quality tools',
    icon: '🧪',
    type: 'python',
    pythonVersion: '3.11',
    packages: {
      python: ['pytest', 'pytest-cov', 'pytest-asyncio', 'hypothesis', 'mypy', 'ruff', 'black'],
    },
  },
];

// ==================== Agent Environment Tool Types ====================

/** Agent environment action type */
export type AgentEnvAction =
  | 'create_venv'
  | 'activate_venv'
  | 'install_packages'
  | 'run_script'
  | 'check_env'
  | 'list_packages'
  | 'set_python_version'
  | 'set_node_version';

/** Agent environment tool result */
export interface AgentEnvResult {
  success: boolean;
  action: AgentEnvAction;
  message: string;
  data?: {
    envPath?: string;
    envId?: string;
    packages?: PackageInfo[];
    output?: string;
    pythonVersion?: string;
    nodeVersion?: string;
  };
  error?: string;
}

/** Agent environment context */
export interface AgentEnvContext {
  projectPath: string | null;
  activeEnvId: string | null;
  activeEnvPath: string | null;
  pythonVersion: string | null;
  nodeVersion: string | null;
  availableEnvs: VirtualEnvInfo[];
}

// ==================== Helper Functions ====================

/** Create default virtual env info */
export function createDefaultVirtualEnvInfo(name: string, path: string): VirtualEnvInfo {
  return {
    id: `venv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    type: 'venv',
    path,
    pythonVersion: null,
    pythonPath: null,
    status: 'unknown',
    packages: 0,
    size: null,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    isDefault: false,
    projectPath: null,
  };
}

/** Create default project env config */
export function createDefaultProjectEnvConfig(
  projectPath: string,
  projectName: string
): ProjectEnvConfig {
  return {
    id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectPath,
    projectName,
    pythonVersion: null,
    nodeVersion: null,
    virtualEnvId: null,
    virtualEnvPath: null,
    autoActivate: true,
    envVars: {},
    scripts: {},
    dependencies: {
      python: [],
      node: [],
      system: [],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ==================== Requirements.txt Types ====================

/** Parsed requirement entry */
export interface RequirementEntry {
  name: string;
  version?: string;
  extras?: string[];
  markers?: string;
  url?: string;
  isEditable?: boolean;
  comment?: string;
}

/** Requirements file info */
export interface RequirementsFile {
  path: string;
  entries: RequirementEntry[];
  raw: string;
}

/** Parse requirements.txt content */
export function parseRequirements(content: string): RequirementEntry[] {
  const entries: RequirementEntry[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Handle editable installs
    if (trimmed.startsWith('-e ') || trimmed.startsWith('--editable ')) {
      const url = trimmed.replace(/^(-e |--editable )/, '').trim();
      entries.push({ name: url, isEditable: true, url });
      continue;
    }

    // Skip options like -r, --index-url, etc.
    if (trimmed.startsWith('-')) continue;

    // Parse package spec
    const entry = parsePackageSpec(trimmed);
    if (entry) entries.push(entry);
  }

  return entries;
}

/** Parse a single package specification */
export function parsePackageSpec(spec: string): RequirementEntry | null {
  // Handle inline comments
  const [specPart, comment] = spec.split('#').map((s) => s.trim());
  if (!specPart) return null;

  // Handle environment markers (e.g., ; python_version >= "3.8")
  const [pkgPart, markers] = specPart.split(';').map((s) => s.trim());
  if (!pkgPart) return null;

  // Handle extras (e.g., package[extra1,extra2])
  const extrasMatch = pkgPart.match(/^([a-zA-Z0-9_-]+)\[([^\]]+)\](.*)$/);
  let name: string;
  let extras: string[] | undefined;
  let versionPart: string;

  if (extrasMatch) {
    name = extrasMatch[1];
    extras = extrasMatch[2].split(',').map((e) => e.trim());
    versionPart = extrasMatch[3];
  } else {
    // Match version operators: ==, >=, <=, !=, ~=, >, <
    const versionMatch = pkgPart.match(/^([a-zA-Z0-9_-]+)\s*([=<>!~]+.*)$/);
    if (versionMatch) {
      name = versionMatch[1];
      versionPart = versionMatch[2];
    } else {
      name = pkgPart;
      versionPart = '';
    }
  }

  return {
    name: name.toLowerCase().replace(/_/g, '-'),
    version: versionPart || undefined,
    extras,
    markers: markers || undefined,
    comment: comment || undefined,
  };
}

/** Generate requirements.txt content */
export function generateRequirements(
  packages: PackageInfo[],
  options?: {
    pinVersions?: boolean;
    includeComments?: boolean;
  }
): string {
  const { pinVersions = true, includeComments = true } = options || {};
  const lines: string[] = [];

  if (includeComments) {
    lines.push(`# Generated by Cognia on ${new Date().toISOString()}`);
    lines.push('');
  }

  for (const pkg of packages) {
    if (pinVersions && pkg.version) {
      lines.push(`${pkg.name}==${pkg.version}`);
    } else {
      lines.push(pkg.name);
    }
  }

  return lines.join('\n');
}

// ==================== Environment Health Check ====================

/** Environment health status */
export type EnvHealthStatus = 'healthy' | 'warning' | 'error' | 'unknown';

/** Environment health check result */
export interface EnvHealthCheck {
  status: EnvHealthStatus;
  pythonValid: boolean;
  pipValid: boolean;
  packagesValid: boolean;
  issues: string[];
  warnings: string[];
  checkedAt: string;
}

/** Create default health check result */
export function createDefaultHealthCheck(): EnvHealthCheck {
  return {
    status: 'unknown',
    pythonValid: false,
    pipValid: false,
    packagesValid: false,
    issues: [],
    warnings: [],
    checkedAt: new Date().toISOString(),
  };
}

// ==================== Environment Comparison ====================

/** Package difference info */
export interface PackageDiff {
  name: string;
  inFirst: boolean;
  inSecond: boolean;
  versionFirst?: string;
  versionSecond?: string;
  status: 'added' | 'removed' | 'changed' | 'same';
}

/** Compare two package lists */
export function comparePackages(first: PackageInfo[], second: PackageInfo[]): PackageDiff[] {
  const diffs: PackageDiff[] = [];
  const firstMap = new Map(first.map((p) => [p.name.toLowerCase(), p]));
  const secondMap = new Map(second.map((p) => [p.name.toLowerCase(), p]));
  const allNames = new Set([...firstMap.keys(), ...secondMap.keys()]);

  for (const name of allNames) {
    const pkg1 = firstMap.get(name);
    const pkg2 = secondMap.get(name);

    if (pkg1 && pkg2) {
      diffs.push({
        name,
        inFirst: true,
        inSecond: true,
        versionFirst: pkg1.version,
        versionSecond: pkg2.version,
        status: pkg1.version === pkg2.version ? 'same' : 'changed',
      });
    } else if (pkg1) {
      diffs.push({
        name,
        inFirst: true,
        inSecond: false,
        versionFirst: pkg1.version,
        status: 'removed',
      });
    } else if (pkg2) {
      diffs.push({
        name,
        inFirst: false,
        inSecond: true,
        versionSecond: pkg2.version,
        status: 'added',
      });
    }
  }

  return diffs.sort((a, b) => {
    const order = { removed: 0, added: 1, changed: 2, same: 3 };
    return order[a.status] - order[b.status] || a.name.localeCompare(b.name);
  });
}

// ==================== Environment Filtering ====================

/** Environment filter options */
export interface EnvFilterOptions {
  search?: string;
  types?: VirtualEnvType[];
  status?: VirtualEnvStatus[];
  pythonVersions?: string[];
  hasProject?: boolean;
  sortBy?: 'name' | 'createdAt' | 'lastUsedAt' | 'packages' | 'size';
  sortOrder?: 'asc' | 'desc';
}

// ==================== Python Execution Types ====================

/** Python execution status */
export type PythonExecutionStatus = 'completed' | 'failed' | 'timeout' | 'error';

/** Python execution result */
export interface PythonSandboxExecutionResult {
  /** Unique execution ID */
  id: string;
  /** Execution status */
  status: PythonExecutionStatus;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Exit code (null if process didn't complete normally) */
  exitCode: number | null;
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Error message if execution failed */
  error: string | null;
  /** Virtual environment path used */
  envPath: string;
}

/** Python execution progress event (for streaming) */
export interface PythonExecutionProgress {
  /** Execution ID */
  id: string;
  /** Output type: "stdout", "stderr", "status" */
  outputType: 'stdout' | 'stderr' | 'status';
  /** Content of the output */
  content: string;
  /** Whether execution is complete */
  done: boolean;
  /** Final exit code (only present when done=true) */
  exitCode: number | null;
}

/** Options for Python execution */
export interface PythonExecutionOptions {
  /** Standard input to pass to the script */
  stdin?: string;
  /** Timeout in seconds (default: 30) */
  timeoutSecs?: number;
  /** Working directory */
  cwd?: string;
  /** Environment variables to set */
  env?: Record<string, string>;
  /** Arguments to pass to the script */
  args?: string[];
}

/** Python interpreter information */
export interface PythonInterpreterInfo {
  /** Python version (e.g., "3.12.0") */
  version: string;
  /** Path to the Python executable */
  executable: string;
  /** Path to the virtual environment */
  envPath: string;
  /** Python's sys.path */
  sysPath: string[];
  /** Platform information */
  platform: string;
}

/** Filter and sort environments */
export function filterEnvironments(
  environments: VirtualEnvInfo[],
  options: EnvFilterOptions
): VirtualEnvInfo[] {
  let result = [...environments];

  // Search filter
  if (options.search) {
    const search = options.search.toLowerCase();
    result = result.filter(
      (env) =>
        env.name.toLowerCase().includes(search) ||
        env.path.toLowerCase().includes(search) ||
        env.pythonVersion?.toLowerCase().includes(search)
    );
  }

  // Type filter
  if (options.types?.length) {
    result = result.filter((env) => options.types!.includes(env.type));
  }

  // Status filter
  if (options.status?.length) {
    result = result.filter((env) => options.status!.includes(env.status));
  }

  // Python version filter
  if (options.pythonVersions?.length) {
    result = result.filter(
      (env) =>
        env.pythonVersion && options.pythonVersions!.some((v) => env.pythonVersion!.startsWith(v))
    );
  }

  // Has project filter
  if (options.hasProject !== undefined) {
    result = result.filter((env) => (env.projectPath !== null) === options.hasProject);
  }

  // Sorting
  if (options.sortBy) {
    const order = options.sortOrder === 'desc' ? -1 : 1;
    result.sort((a, b) => {
      switch (options.sortBy) {
        case 'name':
          return order * a.name.localeCompare(b.name);
        case 'createdAt':
          return order * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case 'lastUsedAt': {
          const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
          const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
          return order * (aTime - bTime);
        }
        case 'packages':
          return order * (a.packages - b.packages);
        case 'size': {
          const parseSize = (s: string | null): number => {
            if (!s) return 0;
            const match = s.match(/([\d.]+)\s*(B|KB|MB|GB)/i);
            if (!match) return 0;
            const value = parseFloat(match[1]);
            const unit = match[2].toUpperCase();
            const multipliers: Record<string, number> = {
              B: 1,
              KB: 1024,
              MB: 1024 ** 2,
              GB: 1024 ** 3,
            };
            return value * (multipliers[unit] || 1);
          };
          return order * (parseSize(a.size) - parseSize(b.size));
        }
        default:
          return 0;
      }
    });
  }

  return result;
}
