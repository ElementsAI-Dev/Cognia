/**
 * Agent Environment Tools - Tools for managing Python virtual environments in agent workflows
 *
 * Provides agent-accessible tools for:
 * - Creating virtual environments
 * - Installing packages
 * - Running Python scripts
 * - Managing project environments
 */

import { z } from 'zod';
import type { AgentTool } from './agent-executor';
import { virtualEnvService, isEnvironmentAvailable } from '@/lib/native/environment';
import type {
  VirtualEnvType,
  AgentEnvResult,
  PackageInfo,
} from '@/types/environment';
import { generateRequirements, parseRequirements } from '@/types/environment';

// ==================== Tool Input Schemas ====================

const createVenvInputSchema = z.object({
  name: z.string().describe('Name for the virtual environment'),
  pythonVersion: z.string().optional().describe('Python version (e.g., "3.11", "3.12")'),
  type: z.enum(['venv', 'uv', 'conda']).optional().default('uv').describe('Type of virtual environment to create'),
  projectPath: z.string().optional().describe('Project path to associate with this environment'),
  packages: z.array(z.string()).optional().describe('Initial packages to install'),
});

const installPackagesInputSchema = z.object({
  envPath: z.string().describe('Path to the virtual environment'),
  packages: z.array(z.string()).describe('List of packages to install (e.g., ["numpy", "pandas>=2.0"])'),
  upgrade: z.boolean().optional().default(false).describe('Whether to upgrade existing packages'),
});

const runPythonInputSchema = z.object({
  envPath: z.string().describe('Path to the virtual environment'),
  code: z.string().describe('Python code to execute'),
  cwd: z.string().optional().describe('Working directory for execution'),
  stdin: z.string().optional().describe('Standard input to pass to the script'),
  timeoutSecs: z.number().optional().describe('Timeout in seconds (default: 60)'),
  args: z.array(z.string()).optional().describe('Command line arguments to pass to the script'),
});

const runPythonFileInputSchema = z.object({
  envPath: z.string().describe('Path to the virtual environment'),
  filePath: z.string().describe('Path to the Python file to execute'),
  cwd: z.string().optional().describe('Working directory for execution'),
  stdin: z.string().optional().describe('Standard input to pass to the script'),
  timeoutSecs: z.number().optional().describe('Timeout in seconds (default: 60)'),
  args: z.array(z.string()).optional().describe('Command line arguments to pass to the script'),
});

const getPythonInfoInputSchema = z.object({
  envPath: z.string().describe('Path to the virtual environment'),
});

const runCommandInputSchema = z.object({
  envPath: z.string().describe('Path to the virtual environment'),
  command: z.string().describe('Shell command to run in the activated environment'),
  cwd: z.string().optional().describe('Working directory for execution'),
});

const listPackagesInputSchema = z.object({
  envPath: z.string().describe('Path to the virtual environment'),
});

const checkEnvInputSchema = z.object({
  envPath: z.string().optional().describe('Path to check, or leave empty to list all environments'),
});

const deleteEnvInputSchema = z.object({
  envPath: z.string().describe('Path to the virtual environment to delete'),
  confirm: z.boolean().default(true).describe('Confirm deletion'),
});

const uninstallPackagesInputSchema = z.object({
  envPath: z.string().describe('Path to the virtual environment'),
  packages: z.array(z.string()).describe('List of package names to uninstall'),
});

const exportRequirementsInputSchema = z.object({
  envPath: z.string().describe('Path to the virtual environment'),
  pinVersions: z.boolean().default(true).describe('Whether to pin exact versions (e.g., numpy==1.24.0)'),
});

const importRequirementsInputSchema = z.object({
  envPath: z.string().describe('Path to the virtual environment'),
  content: z.string().describe('Content of requirements.txt file'),
});

const upgradePackagesInputSchema = z.object({
  envPath: z.string().describe('Path to the virtual environment'),
  packages: z.array(z.string()).optional().describe('Specific packages to upgrade, or leave empty to upgrade all'),
});

// ==================== Tool Implementations ====================

/**
 * Create virtual environment tool
 */
export function createVenvTool(): AgentTool {
  return {
    name: 'create_virtual_env',
    description: `Create a Python virtual environment. Supports venv, uv (fastest), and conda. 
Use this when the user needs a new isolated Python environment for a project.
Returns the environment path and details on success.`,
    parameters: createVenvInputSchema,
    execute: async (args): Promise<AgentEnvResult> => {
      if (!isEnvironmentAvailable()) {
        return {
          success: false,
          action: 'create_venv',
          message: 'Environment management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof createVenvInputSchema>;
        
        const env = await virtualEnvService.create({
          name: input.name,
          type: (input.type || 'uv') as VirtualEnvType,
          pythonVersion: input.pythonVersion,
          projectPath: input.projectPath,
          packages: input.packages,
        });

        return {
          success: true,
          action: 'create_venv',
          message: `Virtual environment "${input.name}" created successfully at ${env.path}`,
          data: {
            envPath: env.path,
            envId: env.id,
            pythonVersion: env.pythonVersion || undefined,
          },
        };
      } catch (error) {
        return {
          success: false,
          action: 'create_venv',
          message: 'Failed to create virtual environment',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: true,
  };
}

/**
 * Install packages tool
 */
export function createInstallPackagesTool(): AgentTool {
  return {
    name: 'install_packages',
    description: `Install Python packages in a virtual environment using pip.
Supports version specifiers like "numpy>=1.24" or "pandas==2.0.0".
Use this when the user needs to add dependencies to their environment.`,
    parameters: installPackagesInputSchema,
    execute: async (args): Promise<AgentEnvResult> => {
      if (!isEnvironmentAvailable()) {
        return {
          success: false,
          action: 'install_packages',
          message: 'Environment management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof installPackagesInputSchema>;
        
        await virtualEnvService.installPackages(
          input.envPath,
          input.packages,
          input.upgrade
        );

        return {
          success: true,
          action: 'install_packages',
          message: `Successfully installed packages: ${input.packages.join(', ')}`,
          data: {
            envPath: input.envPath,
          },
        };
      } catch (error) {
        return {
          success: false,
          action: 'install_packages',
          message: 'Failed to install packages',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: true,
  };
}

/**
 * Run Python code tool
 * 
 * Uses safe execution by writing code to a temporary file, avoiding shell injection.
 */
export function createRunPythonTool(): AgentTool {
  return {
    name: 'run_python',
    description: `Execute Python code safely in a virtual environment.
Use this to run Python scripts, test code, or execute data processing tasks.
The code will run in the specified virtual environment with all its packages available.
Supports multi-line code, stdin input, and custom timeout settings.`,
    parameters: runPythonInputSchema,
    execute: async (args): Promise<AgentEnvResult> => {
      if (!isEnvironmentAvailable()) {
        return {
          success: false,
          action: 'run_script',
          message: 'Environment management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof runPythonInputSchema>;
        
        // Use the new safe execution method that writes to a temp file
        const result = await virtualEnvService.executePython(
          input.envPath,
          input.code,
          {
            cwd: input.cwd,
            stdin: input.stdin,
            timeoutSecs: input.timeoutSecs || 60, // Default 60 second timeout for agent executions
            args: input.args,
          }
        );

        if (result.status === 'completed') {
          const output = result.stdout + (result.stderr ? `\n[stderr]: ${result.stderr}` : '');
          return {
            success: true,
            action: 'run_script',
            message: `Python code executed successfully (${result.executionTimeMs}ms)`,
            data: {
              output: output.trim(),
              envPath: input.envPath,
            },
          };
        } else if (result.status === 'timeout') {
          return {
            success: false,
            action: 'run_script',
            message: 'Python execution timed out',
            error: result.error || 'Execution exceeded timeout limit',
          };
        } else {
          // failed or error status
          const errorOutput = result.stderr || result.error || 'Unknown error';
          return {
            success: false,
            action: 'run_script',
            message: 'Python execution failed',
            error: errorOutput,
            data: {
              output: result.stdout,
              envPath: input.envPath,
            },
          };
        }
      } catch (error) {
        return {
          success: false,
          action: 'run_script',
          message: 'Failed to execute Python code',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: true,
  };
}

/**
 * Run Python file tool
 * 
 * Executes a Python file safely in a virtual environment.
 */
export function createRunPythonFileTool(): AgentTool {
  return {
    name: 'run_python_file',
    description: `Execute a Python file in a virtual environment.
Use this to run existing Python scripts with all environment packages available.
Safer than running arbitrary shell commands.`,
    parameters: runPythonFileInputSchema,
    execute: async (args): Promise<AgentEnvResult> => {
      if (!isEnvironmentAvailable()) {
        return {
          success: false,
          action: 'run_script',
          message: 'Environment management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof runPythonFileInputSchema>;
        
        const result = await virtualEnvService.executePythonFile(
          input.envPath,
          input.filePath,
          {
            cwd: input.cwd,
            stdin: input.stdin,
            timeoutSecs: input.timeoutSecs || 60,
            args: input.args,
          }
        );

        if (result.status === 'completed') {
          const output = result.stdout + (result.stderr ? `\n[stderr]: ${result.stderr}` : '');
          return {
            success: true,
            action: 'run_script',
            message: `Python file executed successfully (${result.executionTimeMs}ms)`,
            data: {
              output: output.trim(),
              envPath: input.envPath,
            },
          };
        } else if (result.status === 'timeout') {
          return {
            success: false,
            action: 'run_script',
            message: 'Python execution timed out',
            error: result.error || 'Execution exceeded timeout limit',
          };
        } else {
          const errorOutput = result.stderr || result.error || 'Unknown error';
          return {
            success: false,
            action: 'run_script',
            message: 'Python file execution failed',
            error: errorOutput,
            data: {
              output: result.stdout,
              envPath: input.envPath,
            },
          };
        }
      } catch (error) {
        return {
          success: false,
          action: 'run_script',
          message: 'Failed to execute Python file',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: true,
  };
}

/**
 * Get Python interpreter info tool
 */
export function createGetPythonInfoTool(): AgentTool {
  return {
    name: 'get_python_info',
    description: `Get information about the Python interpreter in a virtual environment.
Returns version, executable path, sys.path, and platform information.`,
    parameters: getPythonInfoInputSchema,
    execute: async (args): Promise<AgentEnvResult> => {
      if (!isEnvironmentAvailable()) {
        return {
          success: false,
          action: 'check_env',
          message: 'Environment management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof getPythonInfoInputSchema>;
        
        const info = await virtualEnvService.getPythonInfo(input.envPath);

        return {
          success: true,
          action: 'check_env',
          message: `Python ${info.version} (${info.platform})`,
          data: {
            pythonVersion: info.version,
            envPath: input.envPath,
            output: `Python ${info.version}\nExecutable: ${info.executable}\nPlatform: ${info.platform}\nSys.path:\n  ${info.sysPath.join('\n  ')}`,
          },
        };
      } catch (error) {
        return {
          success: false,
          action: 'check_env',
          message: 'Failed to get Python info',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: false,
  };
}

/**
 * Run shell command in environment tool
 */
export function createRunInEnvTool(): AgentTool {
  return {
    name: 'run_in_env',
    description: `Run a shell command in an activated virtual environment.
Use this to run pip, pytest, python scripts, or any command that needs the environment activated.
Examples: "pip list", "pytest tests/", "python script.py"`,
    parameters: runCommandInputSchema,
    execute: async (args): Promise<AgentEnvResult> => {
      if (!isEnvironmentAvailable()) {
        return {
          success: false,
          action: 'run_script',
          message: 'Environment management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof runCommandInputSchema>;
        
        const output = await virtualEnvService.runCommand(
          input.envPath,
          input.command,
          input.cwd
        );

        return {
          success: true,
          action: 'run_script',
          message: `Command executed: ${input.command}`,
          data: {
            output: output.trim(),
            envPath: input.envPath,
          },
        };
      } catch (error) {
        return {
          success: false,
          action: 'run_script',
          message: 'Failed to execute command',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: true,
  };
}

/**
 * List packages tool
 */
export function createListPackagesTool(): AgentTool {
  return {
    name: 'list_env_packages',
    description: `List all installed packages in a virtual environment.
Use this to check what packages are available in an environment.`,
    parameters: listPackagesInputSchema,
    execute: async (args): Promise<AgentEnvResult> => {
      if (!isEnvironmentAvailable()) {
        return {
          success: false,
          action: 'list_packages',
          message: 'Environment management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof listPackagesInputSchema>;
        
        const packages = await virtualEnvService.listPackages(input.envPath);

        return {
          success: true,
          action: 'list_packages',
          message: `Found ${packages.length} packages in the environment`,
          data: {
            packages,
            envPath: input.envPath,
          },
        };
      } catch (error) {
        return {
          success: false,
          action: 'list_packages',
          message: 'Failed to list packages',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: false,
  };
}

/**
 * Check/list environments tool
 */
export function createCheckEnvTool(): AgentTool {
  return {
    name: 'check_environments',
    description: `Check available virtual environments or get info about a specific environment.
Use this to see what environments exist and their status.`,
    parameters: checkEnvInputSchema,
    execute: async (args): Promise<AgentEnvResult> => {
      if (!isEnvironmentAvailable()) {
        return {
          success: false,
          action: 'check_env',
          message: 'Environment management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof checkEnvInputSchema>;
        
        const environments = await virtualEnvService.list();

        if (input.envPath) {
          // Find specific environment
          const env = environments.find((e) => e.path === input.envPath);
          if (env) {
            return {
              success: true,
              action: 'check_env',
              message: `Environment "${env.name}" found`,
              data: {
                envPath: env.path,
                envId: env.id,
                pythonVersion: env.pythonVersion || undefined,
              },
            };
          } else {
            return {
              success: false,
              action: 'check_env',
              message: 'Environment not found at specified path',
              error: `No environment found at ${input.envPath}`,
            };
          }
        }

        // List all environments
        const envList = environments.map((e) => ({
          name: e.name,
          path: e.path,
          type: e.type,
          pythonVersion: e.pythonVersion,
          packages: e.packages,
        }));

        return {
          success: true,
          action: 'check_env',
          message: `Found ${environments.length} virtual environment(s)`,
          data: {
            output: JSON.stringify(envList, null, 2),
          },
        };
      } catch (error) {
        return {
          success: false,
          action: 'check_env',
          message: 'Failed to check environments',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: false,
  };
}

/**
 * Get available Python versions tool
 */
export function createGetPythonVersionsTool(): AgentTool {
  return {
    name: 'get_python_versions',
    description: `Get available Python versions that can be used to create virtual environments.
Use this to see what Python versions are available before creating an environment.`,
    parameters: z.object({}),
    execute: async (): Promise<AgentEnvResult> => {
      if (!isEnvironmentAvailable()) {
        return {
          success: false,
          action: 'check_env',
          message: 'Environment management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const versions = await virtualEnvService.getAvailablePythonVersions();

        return {
          success: true,
          action: 'check_env',
          message: `Found ${versions.length} available Python version(s)`,
          data: {
            output: versions.join(', '),
          },
        };
      } catch (error) {
        return {
          success: false,
          action: 'check_env',
          message: 'Failed to get Python versions',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: false,
  };
}

/**
 * Delete virtual environment tool
 */
export function createDeleteEnvTool(): AgentTool {
  return {
    name: 'delete_virtual_env',
    description: `Delete a Python virtual environment permanently.
Use this when the user wants to remove an environment they no longer need.
This action is irreversible - all packages and configurations in the environment will be lost.`,
    parameters: deleteEnvInputSchema,
    execute: async (args): Promise<AgentEnvResult> => {
      if (!isEnvironmentAvailable()) {
        return {
          success: false,
          action: 'create_venv',
          message: 'Environment management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof deleteEnvInputSchema>;
        
        if (!input.confirm) {
          return {
            success: false,
            action: 'create_venv',
            message: 'Deletion cancelled - confirmation required',
            error: 'User did not confirm deletion',
          };
        }

        await virtualEnvService.delete(input.envPath);

        return {
          success: true,
          action: 'create_venv',
          message: `Virtual environment at ${input.envPath} deleted successfully`,
          data: {
            envPath: input.envPath,
          },
        };
      } catch (error) {
        return {
          success: false,
          action: 'create_venv',
          message: 'Failed to delete virtual environment',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: true,
  };
}

/**
 * Uninstall packages tool
 */
export function createUninstallPackagesTool(): AgentTool {
  return {
    name: 'uninstall_packages',
    description: `Uninstall Python packages from a virtual environment.
Use this when the user wants to remove packages they no longer need.
Provide the exact package names to uninstall.`,
    parameters: uninstallPackagesInputSchema,
    execute: async (args): Promise<AgentEnvResult> => {
      if (!isEnvironmentAvailable()) {
        return {
          success: false,
          action: 'install_packages',
          message: 'Environment management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof uninstallPackagesInputSchema>;
        
        const command = `pip uninstall -y ${input.packages.join(' ')}`;
        await virtualEnvService.runCommand(input.envPath, command);

        return {
          success: true,
          action: 'install_packages',
          message: `Successfully uninstalled packages: ${input.packages.join(', ')}`,
          data: {
            envPath: input.envPath,
          },
        };
      } catch (error) {
        return {
          success: false,
          action: 'install_packages',
          message: 'Failed to uninstall packages',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: true,
  };
}

/**
 * Export requirements.txt tool
 */
export function createExportRequirementsTool(): AgentTool {
  return {
    name: 'export_requirements',
    description: `Export the installed packages in a virtual environment to requirements.txt format.
Use this when the user wants to:
- Share their environment setup
- Create a backup of installed packages
- Prepare for deployment
- Document project dependencies`,
    parameters: exportRequirementsInputSchema,
    execute: async (args): Promise<AgentEnvResult> => {
      if (!isEnvironmentAvailable()) {
        return {
          success: false,
          action: 'list_packages',
          message: 'Environment management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof exportRequirementsInputSchema>;
        
        const packages = await virtualEnvService.listPackages(input.envPath);
        const content = generateRequirements(packages as PackageInfo[], {
          pinVersions: input.pinVersions,
          includeComments: true,
        });

        return {
          success: true,
          action: 'list_packages',
          message: `Exported ${packages.length} packages to requirements.txt format`,
          data: {
            output: content,
            envPath: input.envPath,
          },
        };
      } catch (error) {
        return {
          success: false,
          action: 'list_packages',
          message: 'Failed to export requirements',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: false,
  };
}

/**
 * Import requirements.txt tool
 */
export function createImportRequirementsTool(): AgentTool {
  return {
    name: 'import_requirements',
    description: `Install packages from requirements.txt content into a virtual environment.
Use this when the user provides a requirements.txt file or wants to replicate an environment.
Supports standard requirements.txt format including version specifiers.`,
    parameters: importRequirementsInputSchema,
    execute: async (args): Promise<AgentEnvResult> => {
      if (!isEnvironmentAvailable()) {
        return {
          success: false,
          action: 'install_packages',
          message: 'Environment management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof importRequirementsInputSchema>;
        
        const entries = parseRequirements(input.content);
        const packages = entries
          .filter((e) => !e.isEditable)
          .map((e) => e.version ? `${e.name}${e.version}` : e.name);

        if (packages.length === 0) {
          return {
            success: false,
            action: 'install_packages',
            message: 'No valid packages found in requirements content',
            error: 'Empty or invalid requirements content',
          };
        }

        await virtualEnvService.installPackages(input.envPath, packages, false);

        return {
          success: true,
          action: 'install_packages',
          message: `Successfully installed ${packages.length} packages from requirements`,
          data: {
            envPath: input.envPath,
            output: `Installed: ${packages.join(', ')}`,
          },
        };
      } catch (error) {
        return {
          success: false,
          action: 'install_packages',
          message: 'Failed to import requirements',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: true,
  };
}

/**
 * Upgrade packages tool
 */
export function createUpgradePackagesTool(): AgentTool {
  return {
    name: 'upgrade_packages',
    description: `Upgrade Python packages in a virtual environment to their latest versions.
Use this when the user wants to update dependencies.
Can upgrade specific packages or all installed packages.`,
    parameters: upgradePackagesInputSchema,
    execute: async (args): Promise<AgentEnvResult> => {
      if (!isEnvironmentAvailable()) {
        return {
          success: false,
          action: 'install_packages',
          message: 'Environment management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof upgradePackagesInputSchema>;
        
        let packagesToUpgrade: string[];
        
        if (input.packages && input.packages.length > 0) {
          packagesToUpgrade = input.packages;
        } else {
          // Get all installed packages
          const installed = await virtualEnvService.listPackages(input.envPath);
          packagesToUpgrade = installed.map((p: { name: string }) => p.name);
        }

        if (packagesToUpgrade.length === 0) {
          return {
            success: true,
            action: 'install_packages',
            message: 'No packages to upgrade',
            data: { envPath: input.envPath },
          };
        }

        await virtualEnvService.installPackages(input.envPath, packagesToUpgrade, true);

        return {
          success: true,
          action: 'install_packages',
          message: `Successfully upgraded ${packagesToUpgrade.length} package(s)`,
          data: {
            envPath: input.envPath,
            output: `Upgraded: ${packagesToUpgrade.join(', ')}`,
          },
        };
      } catch (error) {
        return {
          success: false,
          action: 'install_packages',
          message: 'Failed to upgrade packages',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: true,
  };
}

// ==================== System Prompt ====================

/**
 * Get the system prompt for environment tools
 * This helps the AI understand when and how to use these tools effectively
 */
export function getEnvironmentToolsSystemPrompt(): string {
  return `## Python Environment Management Tools

You have access to tools for managing Python virtual environments. Use these tools when:

### When to CREATE a virtual environment:
- User wants to start a new Python project
- User mentions needing isolation for dependencies
- User wants to test with a specific Python version
- User asks to "set up" or "initialize" a Python project
- Keywords: "new environment", "create venv", "isolate", "fresh install"

### When to INSTALL packages:
- User mentions needing a Python library (numpy, pandas, requests, etc.)
- User wants to add dependencies to a project
- User shares requirements.txt content
- User encounters ImportError or ModuleNotFoundError
- Keywords: "install", "add package", "pip install", "requirements"

### When to RUN Python code:
- User wants to execute a Python script
- User asks to test Python code
- User wants to see output from Python calculations
- Keywords: "run", "execute", "test code", "python script"

### When to CHECK environments:
- User asks what environments exist
- User wants to know installed packages
- User asks about Python versions available
- Keywords: "list environments", "what packages", "python versions"

### When to DELETE an environment:
- User no longer needs an environment
- User wants to clean up old environments
- User wants to start fresh
- Keywords: "delete env", "remove environment", "clean up"

### When to UNINSTALL packages:
- User wants to remove specific packages
- User is troubleshooting dependency conflicts
- User wants to reduce environment size
- Keywords: "uninstall", "remove package", "pip uninstall"

### When to EXPORT/IMPORT requirements:
- User wants to share their environment setup
- User wants to replicate an environment
- User provides a requirements.txt
- User mentions "requirements.txt", "freeze", "export dependencies"

### Best Practices:
1. **Always check environments first** before creating a new one to avoid duplicates
2. **Use 'uv' type** for fastest environment creation (default)
3. **Include essential packages** when creating (pip, setuptools, wheel)
4. **Store environment path** after creation for subsequent operations
5. **Verify package installation** by listing packages after install

### Workflow Example:
1. check_environments → see what exists
2. get_python_versions → check available Python versions
3. create_virtual_env → create new isolated environment
4. install_packages → add required dependencies
5. run_python / run_in_env → execute code
6. export_requirements → save dependencies for sharing
7. upgrade_packages → keep dependencies up to date

### Important Notes:
- Environment tools require the desktop app (Tauri)
- Creating/installing operations require user approval
- Environment paths are returned after creation - save them for later use
- Use run_in_env for pip, pytest, or any CLI tool
- Use run_python for inline Python code execution`;
}

/**
 * Get a concise system prompt snippet for environment tools
 */
export function getEnvironmentToolsPromptSnippet(): string {
  return `You can manage Python virtual environments:
- Create isolated environments with specific Python versions
- Install packages (numpy, pandas, etc.)
- Run Python code or commands in activated environments
- Check available environments and packages

Use these when users want to: set up Python projects, install dependencies, test code, or manage development environments.`;
}

// ==================== Tool Collection ====================

/**
 * Get all environment management tools
 */
export function getEnvironmentTools(): Record<string, AgentTool> {
  return {
    create_virtual_env: createVenvTool(),
    delete_virtual_env: createDeleteEnvTool(),
    install_packages: createInstallPackagesTool(),
    uninstall_packages: createUninstallPackagesTool(),
    upgrade_packages: createUpgradePackagesTool(),
    run_python: createRunPythonTool(),
    run_python_file: createRunPythonFileTool(),
    run_in_env: createRunInEnvTool(),
    list_env_packages: createListPackagesTool(),
    check_environments: createCheckEnvTool(),
    get_python_versions: createGetPythonVersionsTool(),
    get_python_info: createGetPythonInfoTool(),
    export_requirements: createExportRequirementsTool(),
    import_requirements: createImportRequirementsTool(),
  };
}

/**
 * Initialize environment tools with optional configuration
 */
export function initializeEnvironmentTools(config?: {
  enableCreate?: boolean;
  enableDelete?: boolean;
  enableInstall?: boolean;
  enableUninstall?: boolean;
  enableUpgrade?: boolean;
  enableRun?: boolean;
  enableList?: boolean;
  enableExport?: boolean;
  enableImport?: boolean;
}): Record<string, AgentTool> {
  const tools: Record<string, AgentTool> = {};

  // Always include read-only tools
  tools.check_environments = createCheckEnvTool();
  tools.get_python_versions = createGetPythonVersionsTool();
  tools.get_python_info = createGetPythonInfoTool();

  if (config?.enableList !== false) {
    tools.list_env_packages = createListPackagesTool();
  }

  if (config?.enableExport !== false) {
    tools.export_requirements = createExportRequirementsTool();
  }

  if (config?.enableCreate !== false) {
    tools.create_virtual_env = createVenvTool();
  }

  if (config?.enableDelete !== false) {
    tools.delete_virtual_env = createDeleteEnvTool();
  }

  if (config?.enableInstall !== false) {
    tools.install_packages = createInstallPackagesTool();
  }

  if (config?.enableUninstall !== false) {
    tools.uninstall_packages = createUninstallPackagesTool();
  }

  if (config?.enableUpgrade !== false) {
    tools.upgrade_packages = createUpgradePackagesTool();
  }

  if (config?.enableImport !== false) {
    tools.import_requirements = createImportRequirementsTool();
  }

  if (config?.enableRun !== false) {
    tools.run_python = createRunPythonTool();
    tools.run_python_file = createRunPythonFileTool();
    tools.run_in_env = createRunInEnvTool();
  }

  return tools;
}

export default getEnvironmentTools;
