/**
 * Sandbox Types - TypeScript definitions for backend sandbox execution
 */

/** Runtime type for code execution */
export type RuntimeType = 'docker' | 'podman' | 'native';

/** Language category */
export type LanguageCategory = 'interpreted' | 'compiled' | 'jit' | 'shell';

/** Legacy execution status from existing backend/frontend payloads */
export type LegacyExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'timeout'
  | 'cancelled';

/** Canonical lifecycle state for sandbox execution */
export type SandboxLifecycleStatus =
  | 'queued'
  | 'running'
  | 'success'
  | 'error'
  | 'timeout'
  | 'cancelled';

/** Execution status (legacy + canonical compatibility) */
export type ExecutionStatus = LegacyExecutionStatus | SandboxLifecycleStatus;

/** Diagnostic category for structured execution and preflight errors */
export type SandboxDiagnosticsCategory =
  | 'validation'
  | 'security_policy'
  | 'runtime_unavailable'
  | 'resource_limit'
  | 'internal_failure';

/** Product entrypoint identifier for sandbox consumption */
export type SandboxEntrypointId =
  | 'chat-code-block'
  | 'ai-code-block'
  | 'workflow-code-step'
  | 'scheduler-script';

/** Consumer execution mode */
export type SandboxConsumptionMode = 'interactive' | 'background';

/** How the entrypoint behaves when sandbox execution is not available */
export type SandboxDegradedBehavior = 'disable' | 'blocked-result' | 'bypass';

/** Which request fields an entrypoint is allowed to override */
export interface SandboxEntrypointOverridePolicy {
  timeout_secs?: boolean;
  memory_limit_mb?: boolean;
  network_enabled?: boolean;
  runtime?: boolean;
  env?: boolean;
  args?: boolean;
  files?: boolean;
  stdin?: boolean;
  policy_profile?: boolean;
}

/** Shared entrypoint policy used by sandbox consumers */
export interface SandboxEntrypointPolicy {
  entrypoint: SandboxEntrypointId;
  mode: SandboxConsumptionMode;
  requires_preflight: boolean;
  allow_quick_run: boolean;
  degraded_behavior: SandboxDegradedBehavior;
  sandbox_optional?: boolean;
  allowed_overrides: SandboxEntrypointOverridePolicy;
}

/** Shared metadata attached to sandbox consumption outcomes */
export interface SandboxConsumptionMetadata {
  entrypoint: SandboxEntrypointId;
  mode: SandboxConsumptionMode;
  degraded_behavior: SandboxDegradedBehavior;
  requires_preflight: boolean;
  sandbox_enabled: boolean;
  blocked: boolean;
  bypassed: boolean;
  used_quick_run: boolean;
  policy_profile?: string | null;
}

/** Structured diagnostics payload attached to execution outcomes */
export interface SandboxExecutionDiagnostics {
  /** Diagnostics category */
  category: SandboxDiagnosticsCategory;
  /** Machine-readable reason code */
  code: string;
  /** Human-readable summary */
  message?: string;
  /** Suggested remediation */
  remediation_hint?: string;
}

/** Canonical policy profile */
export interface SandboxPolicyProfile {
  /** Profile identifier */
  id: string;
  /** Display name */
  name: string;
  /** Maximum timeout allowed by this profile */
  max_timeout_secs: number;
  /** Maximum memory allowed by this profile */
  max_memory_limit_mb: number;
  /** Whether network can be enabled under this profile */
  allow_network: boolean;
  /** Runtime allowlist for this profile */
  allowed_runtimes: RuntimeType[];
}

/** Policy snapshot attached to an execution record/result */
export interface SandboxPolicySnapshot {
  /** Applied profile identifier */
  profile: string;
  /** Effective timeout applied to the execution */
  timeout_secs: number;
  /** Effective memory limit applied to the execution */
  memory_limit_mb: number;
  /** Effective network setting applied to the execution */
  network_enabled: boolean;
  /** Runtime requested by the caller (if any) */
  requested_runtime: RuntimeType | null;
  /** Runtime selected for execution (if resolved) */
  selected_runtime: RuntimeType | null;
}

/** Preflight reason code */
export type SandboxPreflightReasonCode =
  | 'ok'
  | 'runtime_unavailable'
  | 'runtime_not_allowed'
  | 'language_disabled'
  | 'language_unavailable'
  | 'timeout_out_of_bounds'
  | 'memory_out_of_bounds'
  | 'network_not_allowed'
  | 'invalid_timeout'
  | 'invalid_memory'
  | 'unsupported_language'
  | 'unknown';

/** Preflight status */
export type SandboxPreflightStatus = 'ready' | 'blocked';

/** Preflight request */
export interface SandboxPreflightRequest {
  /** Programming language */
  language: string;
  /** Preferred runtime */
  runtime?: RuntimeType;
  /** Requested timeout in seconds */
  timeout_secs?: number;
  /** Requested memory limit in MB */
  memory_limit_mb?: number;
  /** Requested network access */
  network_enabled?: boolean;
  /** Requested policy profile */
  policy_profile?: string;
}

/** Preflight response */
export interface SandboxPreflightResult {
  /** Readiness state */
  status: SandboxPreflightStatus;
  /** Reason code */
  reason_code: SandboxPreflightReasonCode;
  /** Human-readable reason */
  message: string;
  /** Suggested remediation */
  remediation_hint?: string;
  /** Selected runtime if ready */
  selected_runtime: RuntimeType | null;
  /** Effective profile identifier */
  policy_profile: string;
}

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
  /** Policy profile selected in UI (optional for backward compatibility) */
  active_policy_profile?: string;
  /** Optional profile map for UI/runtime policy preview */
  policy_profiles?: Record<string, SandboxPolicyProfile>;
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
  /** Policy profile identifier */
  policy_profile?: string;
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
  /** Canonical lifecycle status (derived from status when absent) */
  lifecycle_status?: SandboxLifecycleStatus;
  /** Structured diagnostics (if available) */
  diagnostics?: SandboxExecutionDiagnostics | null;
  /** Applied policy snapshot (if available) */
  policy_snapshot?: SandboxPolicySnapshot | null;
  /** Shared product-entrypoint metadata (if available) */
  consumption_metadata?: SandboxConsumptionMetadata | null;
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
  active_policy_profile: 'balanced',
  policy_profiles: {
    strict: {
      id: 'strict',
      name: 'Strict',
      max_timeout_secs: 30,
      max_memory_limit_mb: 256,
      allow_network: false,
      allowed_runtimes: ['docker', 'podman'],
    },
    balanced: {
      id: 'balanced',
      name: 'Balanced',
      max_timeout_secs: 60,
      max_memory_limit_mb: 512,
      allow_network: false,
      allowed_runtimes: ['docker', 'podman', 'native'],
    },
    permissive: {
      id: 'permissive',
      name: 'Permissive',
      max_timeout_secs: 120,
      max_memory_limit_mb: 1024,
      allow_network: true,
      allowed_runtimes: ['docker', 'podman', 'native'],
    },
  },
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
  /** Canonical lifecycle status (derived from status when absent) */
  lifecycle_status?: SandboxLifecycleStatus;
  /** Structured diagnostics (if available) */
  diagnostics?: SandboxExecutionDiagnostics | null;
  /** Applied policy snapshot (if available) */
  policy_snapshot?: SandboxPolicySnapshot | null;
  /** Shared product-entrypoint metadata (if available) */
  consumption_metadata?: SandboxConsumptionMetadata | null;
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
