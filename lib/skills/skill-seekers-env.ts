/**
 * Skill Seekers Environment Integration
 *
 * Integrates Skill Seekers with Cognia's existing virtual environment
 * management system for Python package installation.
 */

import skillSeekersApi from '@/lib/native/skill-seekers';

/** Skill Seekers virtual environment name */
export const SKILL_SEEKERS_VENV_NAME = 'skill-seekers';

/** Default Python packages for Skill Seekers */
export const SKILL_SEEKERS_PACKAGES = [
  'skill-seekers[gemini,openai]',
];

/** Check if Skill Seekers environment exists */
export async function hasSkillSeekersEnv(): Promise<boolean> {
  try {
    const venvPath = await skillSeekersApi.getVenvPath();
    return venvPath !== '';
  } catch {
    return false;
  }
}

/** Get Skill Seekers environment info */
export async function getSkillSeekersEnvInfo(): Promise<{
  exists: boolean;
  venvPath: string;
  isInstalled: boolean;
  version: string | null;
}> {
  try {
    const [venvPath, isInstalled, version] = await Promise.all([
      skillSeekersApi.getVenvPath(),
      skillSeekersApi.isInstalled(),
      skillSeekersApi.getVersion(),
    ]);

    return {
      exists: venvPath !== '',
      venvPath,
      isInstalled,
      version,
    };
  } catch {
    return {
      exists: false,
      venvPath: '',
      isInstalled: false,
      version: null,
    };
  }
}

/** Setup Skill Seekers environment using Cognia's environment management */
export async function setupSkillSeekersEnv(
  options?: {
    forceReinstall?: boolean;
    extras?: string[];
  }
): Promise<{ success: boolean; version?: string; error?: string }> {
  const { forceReinstall = false, extras } = options || {};

  try {
    const info = await getSkillSeekersEnvInfo();

    if (info.isInstalled && !forceReinstall) {
      return {
        success: true,
        version: info.version || undefined,
      };
    }

    const version = await skillSeekersApi.install(extras);

    return {
      success: true,
      version,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to setup Skill Seekers environment',
    };
  }
}

/** Get Skill Seekers output directory */
export async function getSkillSeekersOutputDir(): Promise<string> {
  return skillSeekersApi.getOutputDir();
}

/** Check if required dependencies are available */
export async function checkDependencies(): Promise<{
  python: boolean;
  uv: boolean;
  git: boolean;
}> {
  const results = {
    python: false,
    uv: false,
    git: false,
  };

  try {
    const venvPath = await skillSeekersApi.getVenvPath();
    results.python = venvPath !== '';
  } catch {
    results.python = false;
  }

  return results;
}

const skillSeekersEnv = {
  SKILL_SEEKERS_VENV_NAME,
  SKILL_SEEKERS_PACKAGES,
  hasSkillSeekersEnv,
  getSkillSeekersEnvInfo,
  setupSkillSeekersEnv,
  getSkillSeekersOutputDir,
  checkDependencies,
};

export default skillSeekersEnv;
