/**
 * Sandbox Types - TypeScript definitions for backend sandbox execution
 */

/** Runtime type for code execution */
export type RuntimeType = 'docker' | 'podman' | 'native';

/** Language category */
export type LanguageCategory = 'interpreted' | 'compiled' | 'jit' | 'shell';

/** Execution status */
export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'timeout'
  | 'cancelled';

/** Supported programming language */
export interface Language {
  id: string;
  name: string;
  extension: string;
  category: LanguageCategory;
}

/** Sandbox configuration */
export interface BackendSandboxConfig {
  /** Preferred runtime type */
  preferred_runtime: RuntimeType;
  /** Enable Docker runtime */
  enable_docker: boolean;
  /** Enable Podman runtime */
  enable_podman: boolean;
  /** Enable native execution (less secure) */
  enable_native: boolean;
  /** Default timeout in seconds */
  default_timeout_secs: number;
  /** Default memory limit in MB */
  default_memory_limit_mb: number;
  /** Default CPU limit percentage */
  default_cpu_limit_percent: number;
  /** Maximum output size in bytes */
  max_output_size: number;
  /** Custom Docker images per language */
  custom_images: Record<string, string>;
  /** Network access enabled */
  network_enabled: boolean;
  /** Workspace directory for code files */
  workspace_dir: string | null;
  /** Enabled languages */
  enabled_languages: string[];
}

/** C++ standard versions */
export type CppStandard = 'c++11' | 'c++14' | 'c++17' | 'c++20' | 'c++23';

/** Optimization levels */
export type OptimizationLevel = '-O0' | '-O1' | '-O2' | '-O3' | '-Os' | '-Oz';

/** Rust edition */
export type RustEdition = '2018' | '2021' | '2024';

/** Compiler/Interpreter settings for code execution */
export interface CompilerSettings {
  // C/C++ settings
  /** C++ standard version */
  cppStandard?: CppStandard;
  /** Optimization level for C/C++ */
  optimization?: OptimizationLevel;
  /** C compiler (gcc or clang) */
  cCompiler?: 'gcc' | 'clang';
  /** C++ compiler (g++ or clang++) */
  cppCompiler?: 'g++' | 'clang++';
  /** Enable all warnings */
  enableWarnings?: boolean;

  // Rust settings
  /** Rust edition */
  rustEdition?: RustEdition;
  /** Build in release mode */
  rustRelease?: boolean;

  // Python settings
  /** Unbuffered output (-u flag) */
  pythonUnbuffered?: boolean;
  /** Optimize bytecode (-O flag) */
  pythonOptimize?: boolean;

  // General settings
  /** Custom additional arguments */
  customArgs?: string[];
}

/** Code execution request */
export interface ExecutionRequest {
  /** Programming language */
  language: string;
  /** Source code to execute */
  code: string;
  /** Standard input (optional) */
  stdin?: string;
  /** Command line arguments */
  args?: string[];
  /** Environment variables */
  env?: Record<string, string>;
  /** Timeout in seconds */
  timeout_secs?: number;
  /** Memory limit in MB */
  memory_limit_mb?: number;
  /** Preferred runtime */
  runtime?: RuntimeType;
  /** Additional files */
  files?: Record<string, string>;
  /** Network access */
  network_enabled?: boolean;
  /** Compiler/interpreter settings */
  compiler_settings?: {
    /** C++ standard: "c++11" | "c++14" | "c++17" | "c++20" | "c++23" */
    cpp_standard?: string;
    /** Optimization level: "-O0" | "-O1" | "-O2" | "-O3" | "-Os" */
    optimization?: string;
    /** C compiler: "gcc" | "clang" */
    c_compiler?: string;
    /** C++ compiler: "g++" | "clang++" */
    cpp_compiler?: string;
    /** Enable warnings (-Wall -Wextra) */
    enable_warnings?: boolean;
    /** Rust edition: "2015" | "2018" | "2021" | "2024" */
    rust_edition?: string;
    /** Rust release mode */
    rust_release?: boolean;
    /** Python unbuffered output */
    python_unbuffered?: boolean;
    /** Python optimize bytecode */
    python_optimize?: boolean;
    /** Additional custom compiler/interpreter arguments */
    custom_args?: string[];
  };
}

/** A single line of streaming output during execution */
export interface OutputLine {
  /** Execution ID this line belongs to */
  execution_id: string;
  /** Stream type: "stdout" or "stderr" */
  stream: 'stdout' | 'stderr';
  /** The text content of this line */
  text: string;
  /** Timestamp in milliseconds since execution started */
  timestamp_ms: number;
}

/** Code execution result */
export interface SandboxExecutionResult {
  /** Execution ID */
  id: string;
  /** Execution status */
  status: ExecutionStatus;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Exit code */
  exit_code: number | null;
  /** Execution time in milliseconds */
  execution_time_ms: number;
  /** Memory used in bytes */
  memory_used_bytes: number | null;
  /** Error message */
  error: string | null;
  /** Runtime used */
  runtime: RuntimeType;
  /** Language used */
  language: string;
}

/** Runtime status */
export interface RuntimeStatus {
  runtime_type: RuntimeType;
  available: boolean;
  version: string | null;
}

/** Sandbox status response */
export interface SandboxStatus {
  available_runtimes: RuntimeStatus[];
  supported_languages: Language[];
  config: BackendSandboxConfig;
}

/** Default sandbox configuration */
export const DEFAULT_SANDBOX_CONFIG: BackendSandboxConfig = {
  preferred_runtime: 'docker',
  enable_docker: true,
  enable_podman: true,
  enable_native: false,
  default_timeout_secs: 30,
  default_memory_limit_mb: 256,
  default_cpu_limit_percent: 50,
  max_output_size: 1024 * 1024,
  custom_images: {},
  network_enabled: false,
  workspace_dir: null,
  enabled_languages: [
    'python',
    'javascript',
    'typescript',
    'go',
    'rust',
    'java',
    'c',
    'cpp',
    'ruby',
    'php',
    'bash',
    'powershell',
    'r',
    'julia',
    'lua',
    'perl',
    'swift',
    'kotlin',
    'scala',
    'haskell',
    'elixir',
    'clojure',
    'fsharp',
    'csharp',
    'zig',
  ],
};

/** Language display information */
export const LANGUAGE_INFO: Record<string, { name: string; icon: string; color: string }> = {
  python: { name: 'Python', icon: '🐍', color: '#3776ab' },
  javascript: { name: 'JavaScript', icon: '📜', color: '#f7df1e' },
  typescript: { name: 'TypeScript', icon: '📘', color: '#3178c6' },
  go: { name: 'Go', icon: '🐹', color: '#00add8' },
  rust: { name: 'Rust', icon: '🦀', color: '#dea584' },
  java: { name: 'Java', icon: '☕', color: '#ed8b00' },
  c: { name: 'C', icon: '🔧', color: '#a8b9cc' },
  cpp: { name: 'C++', icon: '⚙️', color: '#00599c' },
  ruby: { name: 'Ruby', icon: '💎', color: '#cc342d' },
  php: { name: 'PHP', icon: '🐘', color: '#777bb4' },
  bash: { name: 'Bash', icon: '🖥️', color: '#4eaa25' },
  powershell: { name: 'PowerShell', icon: '💻', color: '#012456' },
  r: { name: 'R', icon: '📊', color: '#276dc3' },
  julia: { name: 'Julia', icon: '🔬', color: '#9558b2' },
  lua: { name: 'Lua', icon: '🌙', color: '#000080' },
  perl: { name: 'Perl', icon: '🐪', color: '#39457e' },
  swift: { name: 'Swift', icon: '🕊️', color: '#fa7343' },
  kotlin: { name: 'Kotlin', icon: '🎯', color: '#7f52ff' },
  scala: { name: 'Scala', icon: '🔴', color: '#dc322f' },
  haskell: { name: 'Haskell', icon: '🎭', color: '#5e5086' },
  elixir: { name: 'Elixir', icon: '💧', color: '#6e4a7e' },
  clojure: { name: 'Clojure', icon: '🔗', color: '#5881d8' },
  fsharp: { name: 'F#', icon: '🔷', color: '#b845fc' },
  csharp: { name: 'C#', icon: '🎵', color: '#239120' },
  zig: { name: 'Zig', icon: '⚡', color: '#f7a41d' },
};

/** Language code templates for the sandbox editor */
export const LANGUAGE_TEMPLATES: Record<string, string> = {
  python: '# Python code\nprint("Hello, World!")',
  javascript: '// JavaScript code\nconsole.log("Hello, World!");',
  typescript: '// TypeScript code\nconsole.log("Hello, World!");',
  go: '// Go code\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}',
  rust: '// Rust code\nfn main() {\n    println!("Hello, World!");\n}',
  java: '// Java code\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
  c: '// C code\n#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
  cpp: '// C++ code\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}',
  ruby: '# Ruby code\nputs "Hello, World!"',
  php: '<?php\n// PHP code\necho "Hello, World!\\n";',
  bash: '#!/bin/bash\n# Bash script\necho "Hello, World!"',
  powershell: '# PowerShell script\nWrite-Host "Hello, World!"',
  r: '# R code\ncat("Hello, World!\\n")',
  julia: '# Julia code\nprintln("Hello, World!")',
  lua: '-- Lua code\nprint("Hello, World!")',
  perl: '#!/usr/bin/perl\n# Perl code\nprint "Hello, World!\\n";',
  swift: '// Swift code\nprint("Hello, World!")',
  kotlin: '// Kotlin code\nfun main() {\n    println("Hello, World!")\n}',
  scala: '// Scala code\nobject Main extends App {\n    println("Hello, World!")\n}',
  haskell: '-- Haskell code\nmain :: IO ()\nmain = putStrLn "Hello, World!"',
  elixir: '# Elixir code\nIO.puts("Hello, World!")',
  clojure: ';; Clojure code\n(println "Hello, World!")',
  fsharp: '// F# code\nprintfn "Hello, World!"',
  csharp: '// C# code\nusing System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}',
  zig: '// Zig code\nconst std = @import("std");\n\npub fn main() void {\n    std.debug.print("Hello, World!\\n", .{});\n}',
};

/** Get language info by ID */
export function getLanguageInfo(langId: string): {
  name: string;
  icon: string;
  color: string;
} {
  return (
    LANGUAGE_INFO[langId.toLowerCase()] || {
      name: langId,
      icon: '📄',
      color: '#666666',
    }
  );
}

/** Check if a language ID is valid */
export function isValidLanguage(langId: string): boolean {
  return langId.toLowerCase() in LANGUAGE_INFO;
}

/** Map file extension to language ID */
export const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  py: 'python',
  js: 'javascript',
  ts: 'typescript',
  go: 'go',
  rs: 'rust',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  cxx: 'cpp',
  cc: 'cpp',
  rb: 'ruby',
  php: 'php',
  sh: 'bash',
  bash: 'bash',
  ps1: 'powershell',
  r: 'r',
  jl: 'julia',
  lua: 'lua',
  pl: 'perl',
  swift: 'swift',
  kt: 'kotlin',
  scala: 'scala',
  hs: 'haskell',
  exs: 'elixir',
  ex: 'elixir',
  clj: 'clojure',
  fs: 'fsharp',
  fsx: 'fsharp',
  cs: 'csharp',
  zig: 'zig',
};

/** Get language from file extension */
export function getLanguageFromExtension(ext: string): string | null {
  const normalized = ext.toLowerCase().replace(/^\./, '');
  return EXTENSION_TO_LANGUAGE[normalized] || null;
}

// ==================== Database Types ====================

/** Execution history record */
export interface SandboxExecutionRecord {
  /** Execution ID */
  id: string;
  /** Session ID (optional) */
  session_id: string | null;
  /** Programming language */
  language: string;
  /** Source code */
  code: string;
  /** Standard input */
  stdin: string | null;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Exit code */
  exit_code: number | null;
  /** Execution status */
  status: ExecutionStatus;
  /** Runtime used */
  runtime: RuntimeType;
  /** Execution time in milliseconds */
  execution_time_ms: number;
  /** Memory used in bytes */
  memory_used_bytes: number | null;
  /** Error message */
  error: string | null;
  /** Created timestamp (ISO 8601) */
  created_at: string;
  /** Tags */
  tags: string[];
  /** Is favorite */
  is_favorite: boolean;
}

/** Code snippet / template */
export interface CodeSnippet {
  /** Snippet ID */
  id: string;
  /** Title */
  title: string;
  /** Description */
  description: string | null;
  /** Programming language */
  language: string;
  /** Source code */
  code: string;
  /** Tags */
  tags: string[];
  /** Category */
  category: string | null;
  /** Is template */
  is_template: boolean;
  /** Usage count */
  usage_count: number;
  /** Created timestamp (ISO 8601) */
  created_at: string;
  /** Updated timestamp (ISO 8601) */
  updated_at: string;
}

/** Execution session */
export interface ExecutionSession {
  /** Session ID */
  id: string;
  /** Session name */
  name: string;
  /** Description */
  description: string | null;
  /** Created timestamp (ISO 8601) */
  created_at: string;
  /** Updated timestamp (ISO 8601) */
  updated_at: string;
  /** Number of executions */
  execution_count: number;
  /** Is active */
  is_active: boolean;
}

/** Language statistics */
export interface LanguageStats {
  /** Language ID */
  language: string;
  /** Total executions */
  total_executions: number;
  /** Successful executions */
  successful_executions: number;
  /** Failed executions */
  failed_executions: number;
  /** Timeout executions */
  timeout_executions: number;
  /** Total execution time in ms */
  total_execution_time_ms: number;
  /** Average execution time in ms */
  avg_execution_time_ms: number;
  /** Total memory used in bytes */
  total_memory_used_bytes: number;
  /** Last used timestamp (ISO 8601) */
  last_used: string | null;
}

/** Overall sandbox statistics */
export interface SandboxStats {
  /** Total executions */
  total_executions: number;
  /** Successful executions */
  successful_executions: number;
  /** Failed executions */
  failed_executions: number;
  /** Timeout executions */
  timeout_executions: number;
  /** Total execution time in ms */
  total_execution_time_ms: number;
  /** Average execution time in ms */
  avg_execution_time_ms: number;
  /** Total snippets */
  total_snippets: number;
  /** Total sessions */
  total_sessions: number;
  /** Most used language */
  most_used_language: string | null;
  /** Per-language statistics */
  languages: LanguageStats[];
}

/** Execution filter for queries */
export interface ExecutionFilter {
  /** Filter by language */
  language?: string;
  /** Filter by status */
  status?: ExecutionStatus;
  /** Filter by runtime */
  runtime?: RuntimeType;
  /** Filter by session ID */
  session_id?: string;
  /** Filter by tags */
  tags?: string[];
  /** Filter by favorite status */
  is_favorite?: boolean;
  /** Filter by start date (ISO 8601) */
  from_date?: string;
  /** Filter by end date (ISO 8601) */
  to_date?: string;
  /** Search query */
  search_query?: string;
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/** Snippet filter for queries */
export interface SnippetFilter {
  /** Filter by language */
  language?: string;
  /** Filter by category */
  category?: string;
  /** Filter by tags */
  tags?: string[];
  /** Filter by template status */
  is_template?: boolean;
  /** Search query */
  search_query?: string;
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/** Create snippet request */
export interface CreateSnippetRequest {
  /** Title */
  title: string;
  /** Description */
  description?: string;
  /** Programming language */
  language: string;
  /** Source code */
  code: string;
  /** Tags */
  tags: string[];
  /** Category */
  category?: string;
  /** Is template */
  is_template: boolean;
}

// Note: These types are specific to sandbox execution and should not be confused with
// workflow execution types in workflow-editor.ts

/** Daily execution count */
export interface DailyExecutionCount {
  /** Date (YYYY-MM-DD) */
  date: string;
  /** Count */
  count: number;
}
