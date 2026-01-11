/**
 * Agent Jupyter Tools - Tools for executing Jupyter notebooks in agent workflows
 *
 * Provides agent-accessible tools for:
 * - Creating and managing Jupyter sessions
 * - Executing code cells
 * - Running entire notebooks
 * - Inspecting variables
 * - Auto-installing missing packages
 */

import { z } from 'zod';
import type { AgentTool } from './agent-executor';
import { kernelService } from '@/lib/jupyter/kernel';
import { virtualEnvService, isEnvironmentAvailable } from '@/lib/native/environment';
import type { KernelSandboxExecutionResult } from '@/types/system/jupyter';

// ==================== Tool Input Schemas ====================

const executeCodeInputSchema = z.object({
  code: z.string().describe('Python code to execute'),
  envPath: z.string().optional().describe('Path to virtual environment (uses default if not specified)'),
  sessionId: z.string().optional().describe('Existing session ID to use'),
});

const createSessionInputSchema = z.object({
  name: z.string().describe('Name for the session'),
  envPath: z.string().describe('Path to the virtual environment'),
  installKernel: z.boolean().optional().default(true).describe('Auto-install ipykernel if missing'),
});

const executeNotebookInputSchema = z.object({
  notebookContent: z.string().describe('JSON content of the Jupyter notebook'),
  envPath: z.string().optional().describe('Path to virtual environment'),
  stopOnError: z.boolean().optional().default(true).describe('Stop execution on first error'),
});

const inspectVariableInputSchema = z.object({
  variableName: z.string().describe('Name of the variable to inspect'),
  sessionId: z.string().describe('Session ID where the variable exists'),
});

const installAndRunInputSchema = z.object({
  code: z.string().describe('Python code to execute'),
  packages: z.array(z.string()).describe('Packages to install before running'),
  envPath: z.string().optional().describe('Path to virtual environment'),
});

const getVariablesInputSchema = z.object({
  sessionId: z.string().describe('Session ID to get variables from'),
});

// ==================== Result Types ====================

interface JupyterToolResult {
  success: boolean;
  message: string;
  data?: {
    sessionId?: string;
    output?: string;
    error?: string;
    variables?: Array<{ name: string; type: string; value: string }>;
    executionCount?: number;
    executionTimeMs?: number;
  };
}

// ==================== Tool Implementations ====================

/**
 * Execute Python code tool
 */
export function createExecuteCodeTool(): AgentTool {
  return {
    name: 'execute_python_code',
    description: `Execute Python code in a Jupyter kernel session.
Use this when you need to:
- Run Python scripts or code snippets
- Test code logic
- Process data
- Generate outputs or visualizations

The code runs in an isolated Python environment with full access to installed packages.
Variables persist across executions within the same session.`,
    parameters: executeCodeInputSchema,
    execute: async (args): Promise<JupyterToolResult> => {
      if (!kernelService.isAvailable()) {
        return {
          success: false,
          message: 'Jupyter kernel requires Tauri desktop environment',
        };
      }

      try {
        const input = args as z.infer<typeof executeCodeInputSchema>;
        let result: KernelSandboxExecutionResult;

        if (input.sessionId) {
          // Execute in existing session
          result = await kernelService.execute(input.sessionId, input.code);
        } else if (input.envPath) {
          // Quick execute in environment
          result = await kernelService.quickExecute(input.envPath, input.code);
        } else {
          // Try to find a default environment
          const envs = await virtualEnvService.list();
          if (envs.length === 0) {
            return {
              success: false,
              message: 'No virtual environments available. Create one first using create_virtual_env.',
            };
          }
          result = await kernelService.quickExecute(envs[0].path, input.code);
        }

        return {
          success: result.success,
          message: result.success
            ? 'Code executed successfully'
            : `Execution failed: ${result.error?.evalue || 'Unknown error'}`,
          data: {
            output: result.stdout || getDisplayOutput(result),
            error: result.stderr || result.error?.evalue,
            executionCount: result.executionCount,
            executionTimeMs: result.executionTimeMs,
          },
        };
      } catch (error) {
        return {
          success: false,
          message: `Execution error: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
    requiresApproval: true,
  };
}

/**
 * Create Jupyter session tool
 */
export function createJupyterSessionTool(): AgentTool {
  return {
    name: 'create_jupyter_session',
    description: `Create a new Jupyter kernel session for persistent code execution.
Use this when you need to:
- Maintain state across multiple code executions
- Work with large datasets that should stay in memory
- Build up a complex analysis step by step

The session keeps variables and imports in memory for subsequent executions.`,
    parameters: createSessionInputSchema,
    execute: async (args): Promise<JupyterToolResult> => {
      if (!kernelService.isAvailable()) {
        return {
          success: false,
          message: 'Jupyter kernel requires Tauri desktop environment',
        };
      }

      try {
        const input = args as z.infer<typeof createSessionInputSchema>;

        // Ensure kernel is installed if requested
        if (input.installKernel) {
          await kernelService.ensureKernel(input.envPath);
        }

        const session = await kernelService.createSession({
          name: input.name,
          envPath: input.envPath,
          autoInstallKernel: input.installKernel,
        });

        return {
          success: true,
          message: `Session "${input.name}" created successfully`,
          data: {
            sessionId: session.id,
          },
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to create session: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
    requiresApproval: true,
  };
}

/**
 * Execute notebook tool
 */
export function createExecuteNotebookTool(): AgentTool {
  return {
    name: 'execute_jupyter_notebook',
    description: `Execute all code cells in a Jupyter notebook.
Use this when you need to:
- Run an entire notebook from start to finish
- Reproduce notebook results
- Validate notebook code

Executes cells in order and collects all outputs.`,
    parameters: executeNotebookInputSchema,
    execute: async (args): Promise<JupyterToolResult> => {
      if (!kernelService.isAvailable()) {
        return {
          success: false,
          message: 'Jupyter kernel requires Tauri desktop environment',
        };
      }

      try {
        const input = args as z.infer<typeof executeNotebookInputSchema>;

        // Parse notebook
        const notebook = JSON.parse(input.notebookContent);
        const codeCells = notebook.cells
          ?.filter((cell: { cell_type: string }) => cell.cell_type === 'code')
          ?.map((cell: { source: string | string[] }) =>
            Array.isArray(cell.source) ? cell.source.join('') : cell.source
          );

        if (!codeCells || codeCells.length === 0) {
          return {
            success: true,
            message: 'Notebook has no code cells to execute',
          };
        }

        // Get environment
        let envPath = input.envPath;
        if (!envPath) {
          const envs = await virtualEnvService.list();
          if (envs.length === 0) {
            return {
              success: false,
              message: 'No virtual environments available',
            };
          }
          envPath = envs[0].path;
        }

        // Create session and execute
        const session = await kernelService.createSession({
          name: `notebook-${Date.now()}`,
          envPath,
          autoInstallKernel: true,
        });

        const outputs: string[] = [];
        let hasError = false;

        for (let i = 0; i < codeCells.length; i++) {
          const result = await kernelService.executeCell(
            session.id,
            i,
            codeCells[i]
          );

          if (result.stdout) {
            outputs.push(`[Cell ${i + 1}] ${result.stdout}`);
          }

          if (!result.success) {
            hasError = true;
            outputs.push(`[Cell ${i + 1} ERROR] ${result.error?.evalue || 'Unknown error'}`);
            if (input.stopOnError) {
              break;
            }
          }
        }

        // Cleanup session
        await kernelService.deleteSession(session.id);

        return {
          success: !hasError,
          message: hasError
            ? `Notebook execution completed with errors`
            : `Notebook executed successfully (${codeCells.length} cells)`,
          data: {
            output: outputs.join('\n\n'),
          },
        };
      } catch (error) {
        return {
          success: false,
          message: `Notebook execution failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
    requiresApproval: true,
  };
}

/**
 * Inspect variable tool
 */
export function createInspectVariableTool(): AgentTool {
  return {
    name: 'inspect_variable',
    description: `Inspect a variable in a Jupyter session to see its value, type, and details.
Use this when you need to:
- Check the value of a computed result
- Understand the structure of data
- Debug code by examining variables`,
    parameters: inspectVariableInputSchema,
    execute: async (args): Promise<JupyterToolResult> => {
      if (!kernelService.isAvailable()) {
        return {
          success: false,
          message: 'Jupyter kernel requires Tauri desktop environment',
        };
      }

      try {
        const input = args as z.infer<typeof inspectVariableInputSchema>;
        const result = await kernelService.inspectVariable(
          input.sessionId,
          input.variableName
        );

        if (result.success) {
          return {
            success: true,
            message: `Variable "${input.variableName}" inspected`,
            data: {
              output: result.stdout,
            },
          };
        } else {
          return {
            success: false,
            message: `Variable not found: ${input.variableName}`,
            data: {
              error: result.error?.evalue,
            },
          };
        }
      } catch (error) {
        return {
          success: false,
          message: `Inspection failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
    requiresApproval: false,
  };
}

/**
 * Get variables tool
 */
export function createGetVariablesTool(): AgentTool {
  return {
    name: 'get_session_variables',
    description: `Get all variables in a Jupyter session's namespace.
Use this when you need to see what data is available in a session.`,
    parameters: getVariablesInputSchema,
    execute: async (args): Promise<JupyterToolResult> => {
      if (!kernelService.isAvailable()) {
        return {
          success: false,
          message: 'Jupyter kernel requires Tauri desktop environment',
        };
      }

      try {
        const input = args as z.infer<typeof getVariablesInputSchema>;
        const variables = await kernelService.getVariables(input.sessionId);

        return {
          success: true,
          message: `Found ${variables.length} variables`,
          data: {
            variables: variables.map((v) => ({
              name: v.name,
              type: v.type,
              value: v.value,
            })),
          },
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to get variables: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
    requiresApproval: false,
  };
}

/**
 * Install packages and run code tool
 */
export function createInstallAndRunTool(): AgentTool {
  return {
    name: 'install_and_execute',
    description: `Install Python packages and then execute code.
Use this when:
- Running code that requires packages not yet installed
- Setting up a new analysis with specific dependencies
- The user mentions needing a package that isn't available

This tool automatically installs the required packages before running the code.`,
    parameters: installAndRunInputSchema,
    execute: async (args): Promise<JupyterToolResult> => {
      if (!isEnvironmentAvailable() || !kernelService.isAvailable()) {
        return {
          success: false,
          message: 'Requires Tauri desktop environment',
        };
      }

      try {
        const input = args as z.infer<typeof installAndRunInputSchema>;

        // Get environment
        let envPath = input.envPath;
        if (!envPath) {
          const envs = await virtualEnvService.list();
          if (envs.length === 0) {
            return {
              success: false,
              message: 'No virtual environments available',
            };
          }
          envPath = envs[0].path;
        }

        // Install packages
        if (input.packages.length > 0) {
          await virtualEnvService.installPackages(envPath, input.packages, false);
        }

        // Execute code
        const result = await kernelService.quickExecute(envPath, input.code);

        return {
          success: result.success,
          message: result.success
            ? `Installed ${input.packages.join(', ')} and executed code successfully`
            : `Execution failed after installing packages`,
          data: {
            output: result.stdout || getDisplayOutput(result),
            error: result.error?.evalue,
            executionTimeMs: result.executionTimeMs,
          },
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
    requiresApproval: true,
  };
}

// ==================== Helper Functions ====================

function getDisplayOutput(result: KernelSandboxExecutionResult): string {
  if (result.displayData.length > 0) {
    const textData = result.displayData.find((d) => d.mimeType === 'text/plain');
    if (textData) return textData.data;
  }
  return '';
}

// ==================== System Prompt ====================

/**
 * Get the system prompt for Jupyter tools
 */
export function getJupyterToolsSystemPrompt(): string {
  return `## Jupyter Code Execution Tools

You have access to Jupyter kernel tools for executing Python code. Use these tools when:

### When to EXECUTE code:
- User asks to run Python code
- User wants to see the output of a calculation
- User needs data processing or analysis
- User asks for code testing or debugging
- Keywords: "run", "execute", "calculate", "compute", "show output"

### When to CREATE a session:
- User needs persistent state across multiple executions
- User is working on a multi-step analysis
- User mentions keeping data in memory
- Keywords: "keep variables", "multi-step", "build on previous"

### When to EXECUTE a notebook:
- User provides a .ipynb file content
- User asks to run an entire notebook
- User wants to reproduce notebook results

### When to INSTALL and run:
- Code uses packages that might not be installed
- User mentions ImportError or ModuleNotFoundError
- User asks to use a specific library

### Best Practices:
1. **Check errors carefully** - if there's an ImportError, use install_and_execute
2. **Use sessions for complex work** - create a session for multi-step analysis
3. **Inspect variables** when debugging
4. **Use quick execution** for simple one-off calculations

### Example Workflow:
1. User asks: "Calculate the mean of [1, 2, 3, 4, 5]"
   → Use execute_python_code with: "import numpy as np; print(np.mean([1, 2, 3, 4, 5]))"

2. User asks: "Load this CSV and analyze it"
   → Use create_jupyter_session, then execute_python_code multiple times

3. User asks: "Run this notebook"
   → Use execute_jupyter_notebook with the notebook content`;
}

// ==================== Tool Collection ====================

/**
 * Get all Jupyter tools
 */
export function getJupyterTools(): Record<string, AgentTool> {
  return {
    execute_python_code: createExecuteCodeTool(),
    create_jupyter_session: createJupyterSessionTool(),
    execute_jupyter_notebook: createExecuteNotebookTool(),
    inspect_variable: createInspectVariableTool(),
    get_session_variables: createGetVariablesTool(),
    install_and_execute: createInstallAndRunTool(),
  };
}

export default getJupyterTools;
