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
export type EnvironmentTool = 'uv' | 'nvm' | 'docker' | 'podman';

/** Installation status for a tool */
export type InstallationStatus =
  | 'not_installed'
  | 'installed'
  | 'installing'
  | 'error'
  | 'checking';

/** Platform type */
export type Platform = 'windows' | 'macos' | 'linux' | 'unknown';

/** Tool information */
export interface ToolInfo {
  id: EnvironmentTool;
  name: string;
  description: string;
  icon: string;
  category: 'language_manager' | 'container_runtime';
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
      install: [
        'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash',
      ],
      postInstall: [
        'export NVM_DIR="$HOME/.nvm"',
        '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"',
      ],
    },
    linux: {
      check: 'command -v nvm',
      install: [
        'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash',
      ],
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
      install: [
        'curl -fsSL https://get.docker.com | sh',
        'sudo usermod -aG docker $USER',
      ],
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
    },
    lastRefreshed: null,
  };
}
