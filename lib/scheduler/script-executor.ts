/**
 * Script Executor for Scheduled Tasks
 *
 * Integrates with the sandbox service to execute scripts safely
 * within scheduled tasks. Supports resource limits and security controls.
 */

import { isTauri } from '@/lib/utils';
import type { ExecuteScriptAction, TaskRunResult } from '@/types/scheduler';

/**
 * Execute a script action using the sandbox service
 *
 * @param action Script execution action configuration
 * @returns Task run result with output and status
 */
export async function executeScript(action: ExecuteScriptAction): Promise<TaskRunResult> {
  if (!isTauri()) {
    return {
      success: false,
      error: 'Script execution requires Tauri environment',
    };
  }

  const startTime = Date.now();

  try {
    // Dynamic import to avoid bundling issues in browser
    const { executeWithLimits, quickExecute } = await import('@/lib/native/sandbox');

    // Execute in sandbox with resource limits
    const result = action.use_sandbox !== false
      ? await executeWithLimits(
          action.language,
          action.code,
          action.timeout_secs ?? 300,
          action.memory_mb ?? 512
        )
      : await quickExecute(action.language, action.code);

    // Check if execution was successful based on status
    const isSuccess = result.status === 'completed' && (result.exit_code === 0 || result.exit_code === null);

    return {
      success: isSuccess,
      exit_code: result.exit_code ?? undefined,
      stdout: result.stdout || undefined,
      stderr: result.stderr || undefined,
      error: result.error ?? undefined,
      duration_ms: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration_ms: Date.now() - startTime,
    };
  }
}

/**
 * Validate script before execution
 *
 * @param language Script language
 * @param code Script code
 * @returns Validation result with warnings
 */
export function validateScript(
  language: string,
  code: string
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation
  if (!code.trim()) {
    errors.push('Script code cannot be empty');
  }

  if (!language) {
    errors.push('Script language must be specified');
  }

  // Language-specific checks
  const dangerousPatterns = getDangerousPatterns(language);
  for (const pattern of dangerousPatterns) {
    if (pattern.regex.test(code)) {
      if (pattern.severity === 'error') {
        errors.push(pattern.message);
      } else {
        warnings.push(pattern.message);
      }
    }
  }

  // Size check
  if (code.length > 1024 * 1024) {
    errors.push('Script exceeds maximum size (1MB)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

interface DangerousPattern {
  regex: RegExp;
  message: string;
  severity: 'error' | 'warning';
}

function getDangerousPatterns(language: string): DangerousPattern[] {
  const common: DangerousPattern[] = [
    {
      regex: /rm\s+-rf\s+[\/\\]/i,
      message: '检测到危险的文件删除命令 / Dangerous file deletion command detected',
      severity: 'error',
    },
    {
      regex: /format\s+[a-z]:/i,
      message: '检测到格式化磁盘命令 / Disk format command detected',
      severity: 'error',
    },
  ];

  const pythonPatterns: DangerousPattern[] = [
    {
      regex: /os\.system\s*\(/,
      message: '使用 os.system 可能存在安全风险 / os.system usage may pose security risks',
      severity: 'warning',
    },
    {
      regex: /subprocess\.(call|run|Popen)\s*\(/,
      message: '使用 subprocess 需谨慎 / subprocess usage requires caution',
      severity: 'warning',
    },
    {
      regex: /eval\s*\(/,
      message: '避免使用 eval / Avoid using eval',
      severity: 'warning',
    },
    {
      regex: /exec\s*\(/,
      message: '避免使用 exec / Avoid using exec',
      severity: 'warning',
    },
  ];

  const jsPatterns: DangerousPattern[] = [
    {
      regex: /eval\s*\(/,
      message: '避免使用 eval / Avoid using eval',
      severity: 'warning',
    },
    {
      regex: /new\s+Function\s*\(/,
      message: '避免使用 Function 构造器 / Avoid using Function constructor',
      severity: 'warning',
    },
  ];

  const shellPatterns: DangerousPattern[] = [
    {
      regex: /:\s*\(\)\s*{\s*:\s*\|/,
      message: '检测到 Fork 炸弹 / Fork bomb detected',
      severity: 'error',
    },
    {
      regex: />\s*\/dev\/sd[a-z]/,
      message: '检测到直接写入磁盘 / Direct disk write detected',
      severity: 'error',
    },
  ];

  switch (language.toLowerCase()) {
    case 'python':
      return [...common, ...pythonPatterns];
    case 'javascript':
    case 'typescript':
      return [...common, ...jsPatterns];
    case 'bash':
    case 'shell':
    case 'sh':
    case 'powershell':
      return [...common, ...shellPatterns];
    default:
      return common;
  }
}

/**
 * Get script template for a language
 */
export function getScriptTemplate(language: string): string {
  switch (language.toLowerCase()) {
    case 'python':
      return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Scheduled Task Script
"""

def main():
    # Your code here
    print("Hello from scheduled task!")

if __name__ == "__main__":
    main()
`;

    case 'javascript':
      return `// Scheduled Task Script

async function main() {
  // Your code here
  console.log("Hello from scheduled task!");
}

main().catch(console.error);
`;

    case 'typescript':
      return `// Scheduled Task Script

async function main(): Promise<void> {
  // Your code here
  console.log("Hello from scheduled task!");
}

main().catch(console.error);
`;

    case 'bash':
    case 'shell':
    case 'sh':
      return `#!/bin/bash
# Scheduled Task Script

set -e

# Your code here
echo "Hello from scheduled task!"
`;

    case 'powershell':
      return `# Scheduled Task Script

# Your code here
Write-Host "Hello from scheduled task!"
`;

    case 'ruby':
      return `#!/usr/bin/env ruby
# Scheduled Task Script

# Your code here
puts "Hello from scheduled task!"
`;

    case 'go':
      return `package main

import "fmt"

func main() {
	// Your code here
	fmt.Println("Hello from scheduled task!")
}
`;

    case 'rust':
      return `fn main() {
    // Your code here
    println!("Hello from scheduled task!");
}
`;

    default:
      return '';
  }
}

/**
 * Get list of supported script languages
 */
export function getSupportedLanguages(): string[] {
  return [
    'python',
    'javascript',
    'typescript',
    'bash',
    'powershell',
    'ruby',
    'go',
    'rust',
  ];
}
